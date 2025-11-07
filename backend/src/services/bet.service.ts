import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { bufferToUuid, uuidToBuffer, generateUuid } from '../utils/uuid';
import { BalanceService } from './balance.service';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import type { PlaceBetInput } from '../validators/bet.validator';

export class BetService {
  /**
   * Place a bet on an event
   */
  static async placeBet(userId: Buffer, input: PlaceBetInput) {
    const { eventId, choiceLetter, amount } = input;

    const eventIdBuffer = uuidToBuffer(eventId);

    // Get event with choices
    const event = await prisma.event.findUnique({
      where: { id: eventIdBuffer },
      include: {
        choices: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Validate event status
    if (event.status !== 'active') {
      throw new AppError('Event is not accepting bets', 400);
    }

    // Check if event is locked
    if (event.lockTime && new Date() >= event.lockTime) {
      throw new AppError('Betting is locked for this event', 400);
    }

    // Validate choice exists
    const choice = event.choices.find(c => c.choiceLetter === choiceLetter);
    if (!choice) {
      throw new AppError('Invalid choice', 400);
    }

    // Check user balance
    const balances = await BalanceService.getUserBalances(userId);

    if (balances.totalChips < amount) {
      throw new AppError(
        `Insufficient balance. You have ${balances.totalChips} chips available`,
        400
      );
    }

    // Deduct chips from user (Free → Purchased → Won priority)
    const currentBalance = await BalanceService.getUserBalances(userId);
    
    // Create bet and update pools in transaction
    const betId = generateUuid();
    const betIdBuffer = uuidToBuffer(betId);

    const bet = await prisma.$transaction(async tx => {
      // Create bet
      const newBet = await tx.eventBet.create({
        data: {
          id: betIdBuffer,
          userId,
          eventId: eventIdBuffer,
          choiceLetter,
          amount: new Decimal(amount),
          status: 'active',
        },
      });

      // Update event choice pool
      await tx.eventChoice.update({
        where: {
          eventId_choiceLetter: {
            eventId: eventIdBuffer,
            choiceLetter,
          },
        },
        data: {
          totalPool: {
            increment: new Decimal(amount),
          },
        },
      });

      // Create ledger entry (deduction)
      await tx.ledger.create({
        data: {
          userId,
          currency: 'chips',
          amount: new Decimal(-amount),
          balanceBefore: new Decimal(currentBalance.totalChips),
          balanceAfter: new Decimal(currentBalance.totalChips - amount),
          transactionType: 'bet_placed',
          referenceType: 'event_bet',
          referenceId: betIdBuffer,
          description: `Bet placed on "${event.name}" - Choice ${choiceLetter}`,
        },
      });

      return newBet;
    });

    const newBalance = await BalanceService.getUserBalances(userId);

    logger.info(
      `User ${bufferToUuid(userId)} placed bet of ${amount} chips on event ${eventId} choice ${choiceLetter}`
    );

    return {
      bet: {
        id: betId,
        eventId,
        eventName: event.name,
        choiceLetter,
        choiceName: choice.choiceName,
        amount: amount.toString(),
        status: 'active',
        placedAt: bet.placedAt,
      },
      balances: newBalance,
    };
  }

  /**
   * Get user's bets
   */
  static async getUserBets(
    userId: Buffer,
    filters: {
      eventId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const { eventId, status, limit = 50, offset = 0 } = filters;

    const where: any = { userId };

    if (eventId) {
      where.eventId = uuidToBuffer(eventId);
    }

    if (status) {
      where.status = status;
    }

    const [bets, total] = await Promise.all([
      prisma.eventBet.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              status: true,
              winningSide: true,
            },
          },
        },
        orderBy: {
          placedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.eventBet.count({ where }),
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
        isWinner: bet.event.winningSide === bet.choiceLetter,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get bets for an event (Admin)
   */
  static async getEventBets(eventId: Buffer) {
    const bets = await prisma.eventBet.findMany({
      where: { eventId },
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
        placedAt: 'desc',
      },
    });

    return bets.map(bet => ({
      id: bufferToUuid(bet.id),
      userId: bufferToUuid(bet.userId),
      username: bet.user.username,
      email: bet.user.email,
      choiceLetter: bet.choiceLetter,
      amount: bet.amount.toString(),
      status: bet.status,
      placedAt: bet.placedAt,
      settledAt: bet.settledAt,
    }));
  }

  /**
   * Get event betting statistics
   */
  static async getEventStats(eventId: Buffer) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        choices: true,
        bets: {
          where: {
            status: 'active',
          },
        },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const totalPool = event.choices.reduce(
      (sum, choice) => sum + parseFloat(choice.totalPool.toString()),
      0
    );

    const choiceStats = event.choices.map(choice => {
      const pool = parseFloat(choice.totalPool.toString());
      const percentage = totalPool > 0 ? (pool / totalPool) * 100 : 0;
      const betsCount = event.bets.filter(b => b.choiceLetter === choice.choiceLetter).length;

      return {
        letter: choice.choiceLetter,
        name: choice.choiceName,
        pool: pool.toString(),
        percentage: percentage.toFixed(2),
        betsCount,
      };
    });

    return {
      eventId: bufferToUuid(eventId),
      totalPool: totalPool.toString(),
      totalBets: event.bets.length,
      choices: choiceStats,
    };
  }
}

