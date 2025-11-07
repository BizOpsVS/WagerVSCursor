import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BetService } from '../services/bet.service';
import { sendSuccess } from '../utils/responses';
import { uuidToBuffer } from '../utils/uuid';
import type { PlaceBetInput, GetUserBetsQuery } from '../validators/bet.validator';

export class BetController {
  /**
   * POST /api/bets
   * Place a bet on an event
   */
  static async placeBet(
    req: AuthRequest<{}, {}, PlaceBetInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await BetService.placeBet(req.user!.id, req.body);
      sendSuccess(res, result, 'Bet placed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bets/my-bets
   * Get current user's bets
   */
  static async getMyBets(
    req: AuthRequest<{}, {}, {}, GetUserBetsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { eventId, status, limit, offset } = req.query;
      const result = await BetService.getUserBets(req.user!.id, {
        eventId,
        status,
        limit: Number(limit),
        offset: Number(offset),
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/:id/stats
   * Get event betting statistics
   */
  static async getEventStats(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const stats = await BetService.getEventStats(eventId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/events/:id/bets
   * Get all bets for an event (Admin)
   */
  static async getEventBets(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const bets = await BetService.getEventBets(eventId);
      sendSuccess(res, bets);
    } catch (error) {
      next(error);
    }
  }
}

