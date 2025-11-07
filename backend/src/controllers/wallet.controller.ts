import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { WalletService } from '../services/wallet.service';
import { sendSuccess } from '../utils/responses';
import type { DepositUSDCInput, DepositSOLInput, WithdrawalRequestInput } from '../validators/wallet.validator';

export class WalletController {
  /**
   * POST /api/wallet/deposit/usdc
   * Process USDC deposit
   */
  static async depositUSDC(
    req: AuthRequest<{}, {}, DepositUSDCInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await WalletService.depositUSDC(req.user!.id, req.body);
      sendSuccess(res, result, 'USDC deposit successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wallet/deposit/sol
   * Process SOL deposit
   */
  static async depositSOL(
    req: AuthRequest<{}, {}, DepositSOLInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await WalletService.depositSOL(req.user!.id, req.body);
      sendSuccess(res, result, 'SOL deposit successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wallet/withdraw
   * Request withdrawal (cashout)
   */
  static async requestWithdrawal(
    req: AuthRequest<{}, {}, WithdrawalRequestInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await WalletService.requestWithdrawal(req.user!.id, req.body);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/wallet/withdrawals
   * Get user's pending withdrawals
   */
  static async getPendingWithdrawals(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const withdrawals = await WalletService.getPendingWithdrawals(req.user!.id);
      sendSuccess(res, withdrawals);
    } catch (error) {
      next(error);
    }
  }
}

