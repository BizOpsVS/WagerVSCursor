import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { bufferToUuid, uuidToBuffer } from '../utils/uuid';
import { BalanceService } from './balance.service';
import { verifyTransaction, sendSOL, sendUSDC, getTreasuryPublicKey } from '../utils/solana';
import { solToUSD, usdToSOL } from '../utils/priceOracle';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import type { DepositUSDCInput, DepositSOLInput, WithdrawalRequestInput } from '../validators/wallet.validator';

export class WalletService {
  /**
   * Process USDC deposit
   * Verifies transaction and credits user's purchased chips
   */
  static async depositUSDC(userId: Buffer, input: DepositUSDCInput) {
    const { transactionSignature, amount } = input;

    // Check if transaction already processed
    const existing = await prisma.ledger.findFirst({
      where: {
        userId,
        description: { contains: transactionSignature },
        transactionType: 'deposit',
      },
    });

    if (existing) {
      throw new AppError('Transaction already processed', 400);
    }

    // Verify transaction on blockchain
    const isValid = await verifyTransaction(transactionSignature);

    if (!isValid) {
      throw new AppError('Invalid or failed transaction', 400);
    }

    // TODO: Additional verification - check that transaction is:
    // 1. To our treasury wallet
    // 2. For the correct amount
    // 3. Recent (not a replay attack)
    // For MVP, we trust the signature verification

    // Credit user's purchased chips (1 USDC = 1 chip)
    const currentBalance = await BalanceService.getUserBalances(userId);

    await prisma.ledger.create({
      data: {
        userId,
        currency: 'chips',
        amount: new Decimal(amount),
        balanceBefore: new Decimal(currentBalance.totalChips),
        balanceAfter: new Decimal(currentBalance.totalChips + amount),
        transactionType: 'deposit',
        description: `USDC deposit - ${transactionSignature}`,
      },
    });

    const newBalance = await BalanceService.getUserBalances(userId);

    logger.info(`User ${bufferToUuid(userId)} deposited ${amount} USDC (${amount} chips)`);

    return {
      amount,
      chips: amount,
      transactionSignature,
      balances: newBalance,
    };
  }

  /**
   * Process SOL deposit
   * Verifies transaction, converts SOL to USD at current price, credits chips
   */
  static async depositSOL(userId: Buffer, input: DepositSOLInput) {
    const { transactionSignature, amountSOL } = input;

    // Check if transaction already processed
    const existing = await prisma.ledger.findFirst({
      where: {
        userId,
        description: { contains: transactionSignature },
        transactionType: 'deposit',
      },
    });

    if (existing) {
      throw new AppError('Transaction already processed', 400);
    }

    // Verify transaction on blockchain
    const isValid = await verifyTransaction(transactionSignature);

    if (!isValid) {
      throw new AppError('Invalid or failed transaction', 400);
    }

    // Get current SOL price
    const usdValue = await solToUSD(amountSOL);
    const chips = Math.floor(usdValue); // Round down to nearest chip

    // Credit user's purchased chips
    const currentBalance = await BalanceService.getUserBalances(userId);

    await prisma.ledger.create({
      data: {
        userId,
        currency: 'chips',
        amount: new Decimal(chips),
        balanceBefore: new Decimal(currentBalance.totalChips),
        balanceAfter: new Decimal(currentBalance.totalChips + chips),
        transactionType: 'deposit',
        description: `SOL deposit - ${amountSOL} SOL (~$${usdValue.toFixed(2)}) - ${transactionSignature}`,
      },
    });

    const newBalance = await BalanceService.getUserBalances(userId);

    logger.info(`User ${bufferToUuid(userId)} deposited ${amountSOL} SOL (${chips} chips)`);

    return {
      amountSOL,
      usdValue,
      chips,
      transactionSignature,
      balances: newBalance,
    };
  }

  /**
   * Request withdrawal (cashout)
   * User can only withdraw won chips
   */
  static async requestWithdrawal(userId: Buffer, input: WithdrawalRequestInput) {
    const { amount, currency, walletAddress } = input;

    // Check if user has enough won chips
    const balances = await BalanceService.getUserBalances(userId);

    if (balances.wonChips < amount) {
      throw new AppError(
        `Insufficient won chips. You have ${balances.wonChips} won chips, but only won chips can be cashed out.`,
        400
      );
    }

    // Calculate amount in requested currency
    let cryptoAmount = amount;
    if (currency === 'sol') {
      cryptoAmount = await usdToSOL(amount);
    }

    // Create withdrawal request
    const request = await prisma.cashOutRequest.create({
      data: {
        userId,
        amount: new Decimal(amount),
        currency: currency === 'sol' ? 'sol' : 'usdc',
        method: `${currency.toUpperCase()} to ${walletAddress}`,
        status: 'pending',
      },
    });

    // Deduct from won chips immediately (hold the funds)
    const currentBalance = await BalanceService.getUserBalances(userId);

    await prisma.ledger.create({
      data: {
        userId,
        currency: 'chips',
        amount: new Decimal(-amount),
        balanceBefore: new Decimal(currentBalance.totalChips),
        balanceAfter: new Decimal(currentBalance.totalChips - amount),
        transactionType: 'cashout',
        referenceType: 'cashout_request',
        referenceId: request.id,
        description: `Withdrawal request - ${amount} chips to ${currency.toUpperCase()}`,
      },
    });

    const newBalance = await BalanceService.getUserBalances(userId);

    logger.info(`User ${bufferToUuid(userId)} requested withdrawal of ${amount} chips as ${currency}`);

    return {
      requestId: bufferToUuid(request.id),
      amount,
      currency,
      cryptoAmount,
      walletAddress,
      status: 'pending',
      balances: newBalance,
      message: 'Withdrawal request submitted. An admin will process it shortly.',
    };
  }

  /**
   * Process withdrawal (Admin action)
   * Sends crypto to user's wallet
   */
  static async processWithdrawal(requestId: Buffer, adminId: Buffer) {
    const request = await prisma.cashOutRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new AppError('Withdrawal request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Withdrawal request already processed', 400);
    }

    const amount = parseFloat(request.amount.toString());
    const walletAddress = request.method.split(' to ')[1]; // Extract address from method string

    let signature: string;

    try {
      if (request.currency === 'sol') {
        // Convert USD to SOL
        const solAmount = await usdToSOL(amount);
        signature = await sendSOL(walletAddress, solAmount);
      } else {
        // Send USDC (1:1 with USD)
        signature = await sendUSDC(walletAddress, amount);
      }

      // Mark request as completed
      await prisma.cashOutRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });

      logger.info(
        `Withdrawal processed: ${amount} chips to ${request.currency.toUpperCase()} for user ${bufferToUuid(request.userId)}. Signature: ${signature}`
      );

      return {
        requestId: bufferToUuid(requestId),
        status: 'completed',
        transactionSignature: signature,
        amount,
        currency: request.currency,
      };
    } catch (error) {
      logger.error('Error processing withdrawal:', error);

      // Mark request as rejected and refund user
      await prisma.cashOutRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
        },
      });

      // Refund the chips
      const currentBalance = await BalanceService.getUserBalances(request.userId);

      await prisma.ledger.create({
        data: {
          userId: request.userId,
          currency: 'chips',
          amount: new Decimal(amount),
          balanceBefore: new Decimal(currentBalance.totalChips),
          balanceAfter: new Decimal(currentBalance.totalChips + amount),
          transactionType: 'bet_won', // Refund as won chips
          referenceType: 'cashout_request_refund',
          referenceId: requestId,
          description: `Withdrawal refund - failed transaction`,
        },
      });

      throw new AppError('Failed to process withdrawal. Chips have been refunded.', 500);
    }
  }

  /**
   * Get user's pending withdrawals
   */
  static async getPendingWithdrawals(userId: Buffer) {
    const requests = await prisma.cashOutRequest.findMany({
      where: {
        userId,
        status: 'pending',
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return requests.map(req => ({
      id: bufferToUuid(req.id),
      amount: req.amount.toString(),
      currency: req.currency,
      method: req.method,
      requestedAt: req.requestedAt,
    }));
  }

  /**
   * Get all pending withdrawals (Admin)
   */
  static async getAllPendingWithdrawals() {
    const requests = await prisma.cashOutRequest.findMany({
      where: {
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });

    return requests.map(req => ({
      id: bufferToUuid(req.id),
      userId: bufferToUuid(req.userId),
      username: req.user.username,
      email: req.user.email,
      amount: req.amount.toString(),
      currency: req.currency,
      method: req.method,
      requestedAt: req.requestedAt,
    }));
  }
}

