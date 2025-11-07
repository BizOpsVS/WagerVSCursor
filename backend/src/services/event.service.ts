import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { bufferToUuid, uuidToBuffer, generateUuid } from '../utils/uuid';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateEventInput, UpdateEventInput } from '../validators/event.validator';

export class EventService {
  /**
   * Create a new event (Admin)
   */
  static async createEvent(adminId: Buffer, input: CreateEventInput) {
    const { name, description, categoryId, imageUrl, choices, lockTime, payoutTime, eventRake } = input;

    const categoryIdBuffer = uuidToBuffer(categoryId);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryIdBuffer },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Create event and choices in transaction
    const eventId = generateUuid();
    const eventIdBuffer = uuidToBuffer(eventId);

    const event = await prisma.$transaction(async tx => {
      // Create event
      const newEvent = await tx.event.create({
        data: {
          id: eventIdBuffer,
          createdByAdminId: adminId,
          name,
          description: description || null,
          categoryId: categoryIdBuffer,
          imageUrl: imageUrl || null,
          lockTime,
          payoutTime: payoutTime || null,
          eventSource: 'admin',
          creatorCommission: new Decimal(eventRake),
          status: 'active',
        },
      });

      // Create event choices
      await Promise.all(
        choices.map(choice =>
          tx.eventChoice.create({
            data: {
              eventId: eventIdBuffer,
              choiceLetter: choice.letter,
              choiceName: choice.name,
              totalPool: new Decimal(0),
            },
          })
        )
      );

      return newEvent;
    });

    // Fetch full event with choices
    return await this.getEventById(eventIdBuffer);
  }

  /**
   * Get event by ID
   */
  static async getEventById(eventId: Buffer) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        category: true,
        choices: true,
        creatorUser: {
          select: {
            id: true,
            username: true,
          },
        },
        createdByAdmin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return this.formatEvent(event);
  }

  /**
   * Get events with filters
   */
  static async getEvents(filters: {
    status?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, categoryId, limit = 20, offset = 0 } = filters;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = uuidToBuffer(categoryId);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          choices: true,
          creatorUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map(e => this.formatEvent(e)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get active events (public)
   */
  static async getActiveEvents(categoryId?: string, limit = 20, offset = 0) {
    const where: any = {
      status: 'active',
    };

    if (categoryId) {
      where.categoryId = uuidToBuffer(categoryId);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          choices: true,
        },
        orderBy: {
          lockTime: 'asc', // Sort by soonest lock time
        },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map(e => this.formatEvent(e)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update event (Admin)
   */
  static async updateEvent(eventId: Buffer, input: UpdateEventInput) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Prevent updating if event is completed or paid out
    if (['completed', 'paid_out'].includes(event.status)) {
      throw new AppError('Cannot update completed or paid out event', 400);
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.lockTime && { lockTime: input.lockTime }),
        ...(input.payoutTime !== undefined && { payoutTime: input.payoutTime }),
        ...(input.status && { status: input.status }),
      },
    });

    return await this.getEventById(eventId);
  }

  /**
   * Cancel event (Admin)
   * This will trigger refunds
   */
  static async cancelEvent(eventId: Buffer) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (['completed', 'paid_out', 'cancelled'].includes(event.status)) {
      throw new AppError('Cannot cancel this event', 400);
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'cancelled',
      },
    });

    return await this.getEventById(eventId);
  }

  /**
   * Format event for response
   */
  private static formatEvent(event: any) {
    return {
      id: bufferToUuid(event.id),
      name: event.name,
      description: event.description,
      category: {
        id: bufferToUuid(event.category.id),
        name: event.category.name,
        slug: event.category.slug,
      },
      imageUrl: event.imageUrl,
      choices: event.choices.map((c: any) => ({
        letter: c.choiceLetter,
        name: c.choiceName,
        totalPool: c.totalPool.toString(),
      })),
      status: event.status,
      winningSide: event.winningSide,
      lockTime: event.lockTime,
      payoutTime: event.payoutTime,
      eventSource: event.eventSource,
      creatorCommission: event.creatorCommission.toString(),
      ...(event.creatorUser && {
        creator: {
          id: bufferToUuid(event.creatorUser.id),
          username: event.creatorUser.username,
        },
      }),
      ...(event.createdByAdmin && {
        createdBy: {
          id: bufferToUuid(event.createdByAdmin.id),
          username: event.createdByAdmin.username,
        },
      }),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  /**
   * Get categories
   */
  static async getCategories() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return categories.map(c => ({
      id: bufferToUuid(c.id),
      name: c.name,
      slug: c.slug,
      iconUrl: c.iconUrl,
    }));
  }
}

