import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import type { UserBalances, ChipBalanceType } from '../types';
import { CHIP_DEDUCTION_PRIORITY, FREE_CHIPS_DAILY_AMOUNT, FREE_CHIPS_COOLDOWN_HOURS } from '../types';

export class BalanceService {
  /**
   * Calculate user's chip balances from ledger
   * Returns: purchased, won, free, locked chips
   */
  static async getUserBalances(userId: Buffer): Promise<UserBalances> {
    // Get all chip transactions for user
    const transactions = await prisma.ledger.findMany({
      where: {
        userId,
        currency: 'chips',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let purchasedChips = 0;
    let wonChips = 0;
    let freeChips = 0;
    let lockedChips = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount.toString());

      switch (tx.transactionType) {
        case 'deposit':
        case 'chips_buy':
          // Deposits go to purchased chips
          purchasedChips += amount;
          break;

        case 'bet_won':
        case 'prize_won':
          // Winnings go to won chips
          wonChips += amount;
          break;

        case 'referral_reward':
          // Referrals go to free chips (future feature)
          freeChips += amount;
          break;

        case 'bet_placed':
          // When placing bet, we need to check balance before/after
          // to determine which balance type was deducted
          // Negative amount = deduction
          if (amount < 0) {
            lockedChips += Math.abs(amount);
          }
          break;

        case 'event_create':
        case 'event_create_ai':
        case 'private_event':
          // Event creation fees deducted from balances
          // Already handled by balance_before/balance_after tracking
          break;

        case 'cashout':
          // Cashouts deduct from won chips only
          if (amount < 0) {
            wonChips += amount; // amount is already negative
          }
          break;

        default:
          break;
      }
    }

    // Get current active bets to calculate locked chips accurately
    const activeBets = await prisma.eventBet.aggregate({
      where: {
        userId,
        status: 'active',
      },
      _sum: {
        amount: true,
      },
    });

    lockedChips = parseFloat((activeBets._sum.amount || new Decimal(0)).toString());

    // Ensure no negative balances
    purchasedChips = Math.max(0, purchasedChips);
    wonChips = Math.max(0, wonChips);
    freeChips = Math.max(0, freeChips);
    lockedChips = Math.max(0, lockedChips);

    const totalChips = purchasedChips + wonChips + freeChips;

    return {
      purchasedChips,
      wonChips,
      freeChips,
      lockedChips,
      totalChips,
    };
  }

  /**
   * Deduct chips from user balances following priority: Free → Purchased → Won
   * Returns: Updated balances and breakdown of what was deducted
   */
  static async deductChips(
    userId: Buffer,
    amount: number
  ): Promise<{
    deductions: { type: ChipBalanceType; amount: number }[];
    remainingBalances: UserBalances;
  }> {
    const balances = await this.getUserBalances(userId);

    // Check if user has enough chips
    if (balances.totalChips < amount) {
      throw new AppError('Insufficient chip balance', 400);
    }

    let remaining = amount;
    const deductions: { type: ChipBalanceType; amount: number }[] = [];

    // Deduct from free chips first
    if (remaining > 0 && balances.freeChips > 0) {
      const deductFromFree = Math.min(remaining, balances.freeChips);
      deductions.push({ type: 'free' as ChipBalanceType, amount: deductFromFree });
      remaining -= deductFromFree;
    }

    // Then from purchased chips
    if (remaining > 0 && balances.purchasedChips > 0) {
      const deductFromPurchased = Math.min(remaining, balances.purchasedChips);
      deductions.push({ type: 'purchased' as ChipBalanceType, amount: deductFromPurchased });
      remaining -= deductFromPurchased;
    }

    // Finally from won chips
    if (remaining > 0 && balances.wonChips > 0) {
      const deductFromWon = Math.min(remaining, balances.wonChips);
      deductions.push({ type: 'won' as ChipBalanceType, amount: deductFromWon });
      remaining -= deductFromWon;
    }

    // Should never happen if we checked total balance correctly
    if (remaining > 0) {
      throw new AppError('Insufficient chip balance after deduction', 500);
    }

    // Calculate remaining balances after deduction
    const remainingBalances = await this.getUserBalances(userId);

    return {
      deductions,
      remainingBalances,
    };
  }

  /**
   * Check if user can claim free chips (24 hour cooldown)
   */
  static async canClaimFreeChips(userId: Buffer): Promise<{
    canClaim: boolean;
    lastClaimTime?: Date;
    nextClaimTime?: Date;
  }> {
    // Find last free chips claim
    // For MVP, we'll check for any referral_reward transaction
    // In future, we should add a specific transaction type for daily free claims
    const lastClaim = await prisma.ledger.findFirst({
      where: {
        userId,
        currency: 'chips',
        transactionType: 'referral_reward', // Using this temporarily for free claims
        description: { contains: 'Daily free chips' },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!lastClaim) {
      return { canClaim: true };
    }

    const cooldownMs = FREE_CHIPS_COOLDOWN_HOURS * 60 * 60 * 1000;
    const timeSinceLastClaim = Date.now() - lastClaim.createdAt.getTime();
    const canClaim = timeSinceLastClaim >= cooldownMs;

    const nextClaimTime = new Date(lastClaim.createdAt.getTime() + cooldownMs);

    return {
      canClaim,
      lastClaimTime: lastClaim.createdAt,
      nextClaimTime,
    };
  }

  /**
   * Claim daily free chips
   */
  static async claimFreeChips(userId: Buffer): Promise<{
    amount: number;
    newBalance: UserBalances;
  }> {
    const { canClaim, nextClaimTime } = await this.canClaimFreeChips(userId);

    if (!canClaim) {
      throw new AppError(
        `Free chips can be claimed again at ${nextClaimTime?.toISOString()}`,
        400
      );
    }

    const currentBalance = await this.getUserBalances(userId);

    // Create ledger entry for free chips
    await prisma.ledger.create({
      data: {
        userId,
        currency: 'chips',
        amount: new Decimal(FREE_CHIPS_DAILY_AMOUNT),
        balanceBefore: new Decimal(currentBalance.totalChips),
        balanceAfter: new Decimal(currentBalance.totalChips + FREE_CHIPS_DAILY_AMOUNT),
        transactionType: 'referral_reward', // Using temporarily for free claims
        description: 'Daily free chips claim',
      },
    });

    const newBalance = await this.getUserBalances(userId);

    return {
      amount: FREE_CHIPS_DAILY_AMOUNT,
      newBalance,
    };
  }

  /**
   * Add chips to user balance (from deposits, winnings, etc.)
   */
  static async addChips(
    userId: Buffer,
    amount: number,
    type: 'deposit' | 'bet_won' | 'prize_won' | 'referral_reward',
    referenceType?: string,
    referenceId?: Buffer,
    description?: string
  ): Promise<UserBalances> {
    const currentBalance = await this.getUserBalances(userId);

    await prisma.ledger.create({
      data: {
        userId,
        currency: 'chips',
        amount: new Decimal(amount),
        balanceBefore: new Decimal(currentBalance.totalChips),
        balanceAfter: new Decimal(currentBalance.totalChips + amount),
        transactionType: type,
        referenceType,
        referenceId,
        description,
      },
    });

    return await this.getUserBalances(userId);
  }
}

