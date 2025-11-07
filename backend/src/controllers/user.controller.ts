import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { BalanceService } from '../services/balance.service';
import { sendSuccess } from '../utils/responses';
import type { UpdateProfileInput, TransactionHistoryQuery } from '../validators/user.validator';

export class UserController {
  /**
   * GET /api/user/profile
   * Get current user's profile
   */
  static async getProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await UserService.getProfile(req.user!.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/user/profile
   * Update current user's profile
   */
  static async updateProfile(
    req: AuthRequest<{}, {}, UpdateProfileInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await UserService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user/balance
   * Get current user's chip balances
   */
  static async getBalance(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const balances = await BalanceService.getUserBalances(req.user!.id);
      sendSuccess(res, balances);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user/transactions
   * Get current user's transaction history
   */
  static async getTransactions(
    req: AuthRequest<{}, {}, {}, TransactionHistoryQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit, offset, transactionType } = req.query;
      const history = await UserService.getTransactionHistory(
        req.user!.id,
        Number(limit) || 50,
        Number(offset) || 0,
        transactionType
      );
      sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user/bets
   * Get current user's bet history
   */
  static async getBets(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const history = await UserService.getBetHistory(req.user!.id, limit, offset);
      sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/user/claim-free-chips
   * Claim daily free chips
   */
  static async claimFreeChips(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await UserService.claimFreeChips(req.user!.id);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

