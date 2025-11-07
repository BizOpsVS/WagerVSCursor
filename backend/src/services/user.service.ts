import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { bufferToUuid } from '../utils/uuid';
import { BalanceService } from './balance.service';
import type { UpdateProfileInput } from '../validators/user.validator';

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: Buffer) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        authMethods: {
          select: {
            authType: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const balances = await BalanceService.getUserBalances(userId);

    return {
      id: bufferToUuid(user.id),
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      level: user.level,
      xp: user.xp.toString(),
      balances,
      wallets: user.wallets.map(w => ({
        chain: w.chain,
        address: w.walletAddress,
      })),
      authMethods: user.authMethods.map(a => a.authType),
      eventsSubmitted: user.eventsSubmitted,
      eventsApproved: user.eventsApproved,
      totalCommissionUsd: user.totalCommissionUsd.toString(),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: Buffer, input: UpdateProfileInput) {
    const { username, email, avatarUrl } = input;

    // Check if username is taken
    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new AppError('Username already taken', 400);
      }
    }

    // Check if email is taken
    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new AppError('Email already taken', 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    return this.getProfile(userId);
  }

  /**
   * Get user's transaction history
   */
  static async getTransactionHistory(
    userId: Buffer,
    limit: number = 50,
    offset: number = 0,
    transactionType?: string
  ) {
    const where: any = {
      userId,
      currency: 'chips',
    };

    if (transactionType) {
      where.transactionType = transactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.ledger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ledger.count({ where }),
    ]);

    return {
      transactions: transactions.map(tx => ({
        id: bufferToUuid(tx.id),
        amount: tx.amount.toString(),
        balanceBefore: tx.balanceBefore.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        type: tx.transactionType,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get user's bet history
   */
  static async getBetHistory(
    userId: Buffer,
    limit: number = 50,
    offset: number = 0
  ) {
    const [bets, total] = await Promise.all([
      prisma.eventBet.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { placedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.eventBet.count({ where: { userId } }),
    ]);

    return {
      bets: bets.map(bet => ({
        id: bufferToUuid(bet.id),
        eventId: bufferToUuid(bet.eventId),
        eventName: bet.event.name,
        eventStatus: bet.event.status,
        choiceLetter: bet.choiceLetter,
        amount: bet.amount.toString(),
        status: bet.status,
        placedAt: bet.placedAt,
        settledAt: bet.settledAt,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Claim daily free chips
   */
  static async claimFreeChips(userId: Buffer) {
    const result = await BalanceService.claimFreeChips(userId);
    return {
      amount: result.amount,
      balances: result.newBalance,
      message: `Successfully claimed ${result.amount} free chips`,
    };
  }
}

