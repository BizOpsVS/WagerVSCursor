import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  depositUSDCSchema,
  depositSOLSchema,
  withdrawalRequestSchema,
} from '../validators/wallet.validator';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

/**
 * POST /api/wallet/deposit/usdc
 * Process USDC deposit
 */
router.post(
  '/deposit/usdc',
  validate(depositUSDCSchema),
  WalletController.depositUSDC
);

/**
 * POST /api/wallet/deposit/sol
 * Process SOL deposit
 */
router.post(
  '/deposit/sol',
  validate(depositSOLSchema),
  WalletController.depositSOL
);

/**
 * POST /api/wallet/withdraw
 * Request withdrawal (cashout won chips)
 */
router.post(
  '/withdraw',
  validate(withdrawalRequestSchema),
  WalletController.requestWithdrawal
);

/**
 * GET /api/wallet/withdrawals
 * Get user's pending withdrawals
 */
router.get('/withdrawals', WalletController.getPendingWithdrawals);

export default router;

