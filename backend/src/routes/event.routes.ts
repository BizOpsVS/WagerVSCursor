import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/events/categories
 * Get all event categories
 */
router.get('/categories', EventController.getCategories);

/**
 * GET /api/events/active
 * Get active events (public)
 */
router.get('/active', EventController.getActiveEvents);

/**
 * GET /api/events
 * Get events with filters (public)
 */
router.get('/', EventController.getEvents);

/**
 * GET /api/events/:id
 * Get event by ID (public, but may show more details if authenticated)
 */
router.get('/:id', optionalAuthenticate, EventController.getEventById);

export default router;

