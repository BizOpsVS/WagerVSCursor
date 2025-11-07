import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PayoutService } from '../services/payout.service';
import { WalletService } from '../services/wallet.service';
import { sendSuccess } from '../utils/responses';
import { uuidToBuffer } from '../utils/uuid';
import type { ResolveEventInput } from '../validators/event.validator';

export class PayoutController {
  /**
   * POST /api/admin/events/:id/resolve
   * Resolve an event and calculate payouts
   */
  static async resolveEvent(
    req: AuthRequest<{ id: string }, {}, ResolveEventInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const { winningSide } = req.body;
      const result = await PayoutService.resolveEvent(eventId, winningSide, req.user!.id);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/events/:id/distribute
   * Distribute payouts to winners
   */
  static async distributePayouts(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const result = await PayoutService.distributePayouts(eventId, req.user!.id);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/events/:id/refund
   * Refund all bets for a cancelled event
   */
  static async refundEvent(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const result = await PayoutService.refundEvent(eventId);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/withdrawals
   * Get all pending withdrawal requests
   */
  static async getPendingWithdrawals(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const withdrawals = await WalletService.getAllPendingWithdrawals();
      sendSuccess(res, withdrawals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/withdrawals/:id/process
   * Process a withdrawal request
   */
  static async processWithdrawal(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requestId = uuidToBuffer(req.params.id);
      const result = await WalletService.processWithdrawal(requestId, req.user!.id);
      sendSuccess(res, result, 'Withdrawal processed successfully');
    } catch (error) {
      next(error);
    }
  }
}

