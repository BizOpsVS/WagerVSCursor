import { z } from 'zod';
import { MAX_EVENT_OPTIONS, MIN_EVENT_OPTIONS, VALID_CHOICE_LETTERS, MIN_EVENT_RAKE, MAX_EVENT_RAKE } from '../types';

/**
 * Event validation schemas
 */

// Event choice
const eventChoiceSchema = z.object({
  letter: z.enum(VALID_CHOICE_LETTERS as unknown as [string, ...string[]]),
  name: z.string().min(1, 'Choice name is required').max(100, 'Choice name too long'),
});

// Create event (admin)
export const createEventSchema = z.object({
  name: z
    .string()
    .min(3, 'Event name must be at least 3 characters')
    .max(255, 'Event name too long'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long')
    .optional(),
  categoryId: z
    .string()
    .uuid('Invalid category ID'),
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),
  choices: z
    .array(eventChoiceSchema)
    .min(MIN_EVENT_OPTIONS, `At least ${MIN_EVENT_OPTIONS} choices required`)
    .max(MAX_EVENT_OPTIONS, `Maximum ${MAX_EVENT_OPTIONS} choices allowed`)
    .refine(
      choices => {
        const letters = choices.map(c => c.letter);
        return new Set(letters).size === letters.length;
      },
      { message: 'Duplicate choice letters not allowed' }
    ),
  lockTime: z
    .string()
    .datetime('Invalid lock time format')
    .transform(str => new Date(str))
    .refine(date => date > new Date(), { message: 'Lock time must be in the future' }),
  payoutTime: z
    .string()
    .datetime('Invalid payout time format')
    .transform(str => new Date(str))
    .optional(),
  eventRake: z
    .number()
    .min(MIN_EVENT_RAKE, `Minimum rake is ${MIN_EVENT_RAKE * 100}%`)
    .max(MAX_EVENT_RAKE, `Maximum rake is ${MAX_EVENT_RAKE * 100}%`)
    .default(0.01),
}).refine(
  data => {
    if (data.payoutTime) {
      return data.payoutTime > data.lockTime;
    }
    return true;
  },
  {
    message: 'Payout time must be after lock time',
    path: ['payoutTime'],
  }
);

// Update event
export const updateEventSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().min(10).max(5000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  lockTime: z
    .string()
    .datetime()
    .transform(str => new Date(str))
    .optional(),
  payoutTime: z
    .string()
    .datetime()
    .transform(str => new Date(str))
    .optional(),
  status: z.enum(['draft', 'pending', 'active', 'locked', 'completed', 'paid_out', 'cancelled']).optional(),
});

// Resolve event (admin)
export const resolveEventSchema = z.object({
  winningSide: z.enum(VALID_CHOICE_LETTERS as unknown as [string, ...string[]]),
});

// Get events filters
export const getEventsQuerySchema = z.object({
  status: z.enum(['draft', 'pending', 'active', 'locked', 'completed', 'paid_out', 'cancelled']).optional(),
  categoryId: z.string().uuid().optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('20'),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0))
    .optional()
    .default('0'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ResolveEventInput = z.infer<typeof resolveEventSchema>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
export type EventChoice = z.infer<typeof eventChoiceSchema>;

