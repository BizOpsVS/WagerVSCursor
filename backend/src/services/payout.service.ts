import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { bufferToUuid, uuidToBuffer, generateUuid } from '../utils/uuid';
import { BalanceService } from './balance.service';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { COMPANY_PRIZE_POOL_RAKE } from '../types';

/**
 * Payout calculation and distribution service
 */
export class PayoutService {
  /**
   * Calculate payouts for an event
   * Returns payout amounts for each winning bettor
   */
  static async calculatePayouts(eventId: Buffer, winningSide: string) {
    // Get event with all bets and choices
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        choices: true,
        bets: {
          where: {
            status: 'active',
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Validate winning side exists
    const winningChoice = event.choices.find(c => c.choiceLetter === winningSide);
    if (!winningChoice) {
      throw new AppError('Invalid winning side', 400);
    }

    // Calculate total pools
    const totalPool = event.choices.reduce(
      (sum, choice) => sum + parseFloat(choice.totalPool.toString()),
      0
    );

    const winningPool = parseFloat(winningChoice.totalPool.toString());
    const losingPools = totalPool - winningPool;

    logger.info(`Event ${bufferToUuid(eventId)} - Total: ${totalPool}, Winning: ${winningPool}, Losing: ${losingPools}`);

    // If no one bet on winning side, refund everyone
    if (winningPool === 0) {
      logger.warn(`No winning bets for event ${bufferToUuid(eventId)}, will refund all bets`);
      return {
        payouts: [],
        refunds: event.bets.map(bet => ({
          userId: bet.userId,
          amount: parseFloat(bet.amount.toString()),
          betId: bet.id,
        })),
        totalPaid: 0,
        prizePoolRake: 0,
      };
    }

    // Calculate rakes
    const eventRake = parseFloat(event.creatorCommission.toString());
    const eventRakeAmount = totalPool * eventRake;
    
    // Prize pool rake (2.5% from remaining pool after event rake)
    const poolAfterEventRake = totalPool - eventRakeAmount;
    const prizePoolRakeAmount = poolAfterEventRake * COMPANY_PRIZE_POOL_RAKE;

    // Remaining pool to distribute to winners
    const distributionPool = poolAfterEventRake - prizePoolRakeAmount;

    logger.info(
      `Rakes - Event: ${eventRakeAmount.toFixed(2)} (${(eventRake * 100).toFixed(2)}%), ` +
      `Prize Pool: ${prizePoolRakeAmount.toFixed(2)} (${(COMPANY_PRIZE_POOL_RAKE * 100).toFixed(2)}%), ` +
      `Distribution: ${distributionPool.toFixed(2)}`
    );

    // Calculate payouts for each winner
    const winningBets = event.bets.filter(bet => bet.choiceLetter === winningSide);
    const payouts: Array<{
      userId: Buffer;
      username: string | null;
      betId: Buffer;
      betAmount: number;
      payout: number;
      profit: number;
    }> = [];

    for (const bet of winningBets) {
      const betAmount = parseFloat(bet.amount.toString());
      const betPercentage = betAmount / winningPool;
      
      // User gets: original bet + proportional share of distribution pool
      const shareOfPool = distributionPool * betPercentage;
      const totalPayout = shareOfPool;
      const profit = totalPayout - betAmount;

      payouts.push({
        userId: bet.userId,
        username: bet.user.username,
        betId: bet.id,
        betAmount,
        payout: totalPayout,
        profit,
      });

      logger.debug(
        `User ${bet.user.username || bufferToUuid(bet.userId)}: ` +
        `Bet ${betAmount}, Payout ${totalPayout.toFixed(2)}, Profit ${profit.toFixed(2)}`
      );
    }

    const totalPaid = payouts.reduce((sum, p) => sum + p.payout, 0);

    return {
      payouts,
      refunds: [],
      totalPaid,
      eventRakeAmount,
      prizePoolRake: prizePoolRakeAmount,
    };
  }

  /**
   * Resolve event and calculate payouts (Admin)
   */
  static async resolveEvent(eventId: Buffer, winningSide: string, adminId: Buffer) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (event.status === 'completed' || event.status === 'paid_out') {
      throw new AppError('Event already resolved', 400);
    }

    if (event.status !== 'locked' && event.status !== 'active') {
      throw new AppError('Event must be locked or active to resolve', 400);
    }

    // Calculate payouts
    const calculation = await this.calculatePayouts(eventId, winningSide);

    // Update event status and create payout records
    await prisma.$transaction(async tx => {
      // Update event
      await tx.event.update({
        where: { id: eventId },
        data: {
          status: 'completed',
          winningSide,
        },
      });

      // Update all bets to won/lost
      await tx.eventBet.updateMany({
        where: {
          eventId,
          choiceLetter: winningSide,
          status: 'active',
        },
        data: {
          status: 'won',
          settledAt: new Date(),
        },
      });

      await tx.eventBet.updateMany({
        where: {
          eventId,
          choiceLetter: { not: winningSide },
          status: 'active',
        },
        data: {
          status: 'lost',
          settledAt: new Date(),
        },
      });

      // Create payout records
      for (const payout of calculation.payouts) {
        await tx.eventPayout.create({
          data: {
            eventId,
            userId: payout.userId,
            payoutAmount: new Decimal(payout.payout),
            status: 'pending',
            adminId,
          },
        });
      }

      // Handle refunds if any
      for (const refund of calculation.refunds) {
        await tx.eventBet.update({
          where: { id: refund.betId },
          data: {
            status: 'refunded',
            settledAt: new Date(),
          },
        });
      }
    });

    logger.info(
      `Event ${bufferToUuid(eventId)} resolved. Winner: ${winningSide}, ` +
      `Payouts: ${calculation.payouts.length}, Total: ${calculation.totalPaid.toFixed(2)}`
    );

    return {
      eventId: bufferToUuid(eventId),
      winningSide,
      payoutsCount: calculation.payouts.length,
      totalPayout: calculation.totalPaid,
      eventRake: calculation.eventRakeAmount,
      prizePoolRake: calculation.prizePoolRake,
      status: 'completed',
      message: 'Event resolved successfully. Payouts are pending distribution.',
    };
  }

  /**
   * Distribute payouts to winners (Admin)
   */
  static async distributePayouts(eventId: Buffer, adminId: Buffer) {
    // Get pending payouts for event
    const payouts = await prisma.eventPayout.findMany({
      where: {
        eventId,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (payouts.length === 0) {
      throw new AppError('No pending payouts for this event', 400);
    }

    // Process each payout
    const results = await prisma.$transaction(async tx => {
      const processed = [];

      for (const payout of payouts) {
        const amount = parseFloat(payout.payoutAmount.toString());
        const currentBalance = await BalanceService.getUserBalances(payout.userId);

        // Credit won chips
        await tx.ledger.create({
          data: {
            userId: payout.userId,
            currency: 'chips',
            amount: new Decimal(amount),
            balanceBefore: new Decimal(currentBalance.totalChips),
            balanceAfter: new Decimal(currentBalance.totalChips + amount),
            transactionType: 'bet_won',
            referenceType: 'event_payout',
            referenceId: payout.id,
            description: `Payout for event ${bufferToUuid(eventId)}`,
          },
        });

        // Mark payout as completed
        await tx.eventPayout.update({
          where: { id: payout.id },
          data: {
            status: 'completed',
            processedAt: new Date(),
            adminId,
          },
        });

        processed.push({
          userId: bufferToUuid(payout.userId),
          username: payout.user.username,
          amount,
        });

        logger.info(`Paid out ${amount} chips to user ${payout.user.username || bufferToUuid(payout.userId)}`);
      }

      // Update event status to paid_out
      await tx.event.update({
        where: { id: eventId },
        data: {
          status: 'paid_out',
        },
      });

      return processed;
    });

    return {
      eventId: bufferToUuid(eventId),
      payoutsProcessed: results.length,
      totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
      payouts: results,
      message: 'Payouts distributed successfully',
    };
  }

  /**
   * Refund all bets for a cancelled event
   */
  static async refundEvent(eventId: Buffer) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
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

    if (event.status !== 'cancelled') {
      throw new AppError('Event must be cancelled to process refunds', 400);
    }

    if (event.bets.length === 0) {
      return {
        eventId: bufferToUuid(eventId),
        refundsProcessed: 0,
        totalAmount: 0,
        message: 'No active bets to refund',
      };
    }

    // Process refunds
    const results = await prisma.$transaction(async tx => {
      const refunded = [];

      for (const bet of event.bets) {
        const amount = parseFloat(bet.amount.toString());
        const currentBalance = await BalanceService.getUserBalances(bet.userId);

        // Refund chips (as won chips so they can be cashed out)
        await tx.ledger.create({
          data: {
            userId: bet.userId,
            currency: 'chips',
            amount: new Decimal(amount),
            balanceBefore: new Decimal(currentBalance.totalChips),
            balanceAfter: new Decimal(currentBalance.totalChips + amount),
            transactionType: 'bet_won', // Refund as won chips
            referenceType: 'event_refund',
            referenceId: bet.id,
            description: `Refund for cancelled event ${bufferToUuid(eventId)}`,
          },
        });

        // Mark bet as refunded
        await tx.eventBet.update({
          where: { id: bet.id },
          data: {
            status: 'refunded',
            settledAt: new Date(),
          },
        });

        refunded.push({
          userId: bufferToUuid(bet.userId),
          amount,
        });

        logger.info(`Refunded ${amount} chips to user ${bufferToUuid(bet.userId)}`);
      }

      return refunded;
    });

    return {
      eventId: bufferToUuid(eventId),
      refundsProcessed: results.length,
      totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
      message: 'All bets refunded successfully',
    };
  }
}

