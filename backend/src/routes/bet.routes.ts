import { Router } from 'express';
import { BetController } from '../controllers/bet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { placeBetSchema } from '../validators/bet.validator';

const router = Router();

// All bet routes require authentication
router.use(authenticate);

/**
 * POST /api/bets
 * Place a bet on an event
 */
router.post(
  '/',
  validate(placeBetSchema),
  BetController.placeBet
);

/**
 * GET /api/bets/my-bets
 * Get current user's bets
 */
router.get('/my-bets', BetController.getMyBets);

/**
 * GET /api/events/:id/stats
 * Get event betting statistics
 */
router.get('/events/:id/stats', BetController.getEventStats);

export default router;

