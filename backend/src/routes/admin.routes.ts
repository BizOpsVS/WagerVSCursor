import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { BetController } from '../controllers/bet.controller';
import { PayoutController } from '../controllers/payout.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createEventSchema, updateEventSchema, resolveEventSchema } from '../validators/event.validator';

const router = Router();

// All admin routes require admin authentication
router.use(authenticateAdmin);

// ============================================================
// EVENT MANAGEMENT
// ============================================================

/**
 * POST /api/admin/events
 * Create a new event
 */
router.post(
  '/events',
  validate(createEventSchema),
  EventController.createEvent
);

/**
 * PUT /api/admin/events/:id
 * Update an event
 */
router.put(
  '/events/:id',
  validate(updateEventSchema),
  EventController.updateEvent
);

/**
 * DELETE /api/admin/events/:id
 * Cancel an event (triggers refunds)
 */
router.delete('/events/:id', EventController.cancelEvent);

/**
 * GET /api/admin/events/:id/bets
 * Get all bets for an event
 */
router.get('/events/:id/bets', BetController.getEventBets);

// ============================================================
// PAYOUT MANAGEMENT
// ============================================================

/**
 * POST /api/admin/events/:id/resolve
 * Resolve an event (select winner)
 */
router.post(
  '/events/:id/resolve',
  validate(resolveEventSchema),
  PayoutController.resolveEvent
);

/**
 * POST /api/admin/events/:id/distribute
 * Distribute payouts to winners
 */
router.post('/events/:id/distribute', PayoutController.distributePayouts);

/**
 * POST /api/admin/events/:id/refund
 * Refund all bets for a cancelled event
 */
router.post('/events/:id/refund', PayoutController.refundEvent);

// ============================================================
// WITHDRAWAL MANAGEMENT
// ============================================================

/**
 * GET /api/admin/withdrawals
 * Get all pending withdrawal requests
 */
router.get('/withdrawals', PayoutController.getPendingWithdrawals);

/**
 * POST /api/admin/withdrawals/:id/process
 * Process a withdrawal request
 */
router.post('/withdrawals/:id/process', PayoutController.processWithdrawal);

export default router;

