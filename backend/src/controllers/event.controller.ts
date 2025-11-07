import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { EventService } from '../services/event.service';
import { sendSuccess } from '../utils/responses';
import { uuidToBuffer } from '../utils/uuid';
import type { CreateEventInput, UpdateEventInput, GetEventsQuery } from '../validators/event.validator';

export class EventController {
  /**
   * POST /api/admin/events
   * Create a new event (Admin only)
   */
  static async createEvent(
    req: AuthRequest<{}, {}, CreateEventInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const event = await EventService.createEvent(req.user!.id, req.body);
      sendSuccess(res, event, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/:id
   * Get event by ID
   */
  static async getEventById(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const event = await EventService.getEventById(eventId);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events
   * Get events with filters (public)
   */
  static async getEvents(
    req: AuthRequest<{}, {}, {}, GetEventsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, categoryId, limit, offset } = req.query;
      const result = await EventService.getEvents({
        status,
        categoryId,
        limit: Number(limit),
        offset: Number(offset),
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/active
   * Get active events (public)
   */
  static async getActiveEvents(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const result = await EventService.getActiveEvents(categoryId, limit, offset);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/events/:id
   * Update event (Admin only)
   */
  static async updateEvent(
    req: AuthRequest<{ id: string }, {}, UpdateEventInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const event = await EventService.updateEvent(eventId, req.body);
      sendSuccess(res, event, 'Event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/events/:id
   * Cancel event (Admin only)
   */
  static async cancelEvent(
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const eventId = uuidToBuffer(req.params.id);
      const event = await EventService.cancelEvent(eventId);
      sendSuccess(res, event, 'Event cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/categories
   * Get all categories
   */
  static async getCategories(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const categories = await EventService.getCategories();
      sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }
}

