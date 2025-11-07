import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateProfileSchema } from '../validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', UserController.getProfile);

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
router.put(
  '/profile',
  validate(updateProfileSchema),
  UserController.updateProfile
);

/**
 * GET /api/user/balance
 * Get current user's chip balances
 */
router.get('/balance', UserController.getBalance);

/**
 * GET /api/user/transactions
 * Get transaction history
 */
router.get('/transactions', UserController.getTransactions);

/**
 * GET /api/user/bets
 * Get bet history
 */
router.get('/bets', UserController.getBets);

/**
 * POST /api/user/claim-free-chips
 * Claim daily $1 free chips
 */
router.post('/claim-free-chips', UserController.claimFreeChips);

export default router;

