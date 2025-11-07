import { z } from 'zod';
import { MIN_BET_AMOUNT, MAX_BET_AMOUNT, VALID_CHOICE_LETTERS } from '../types';

/**
 * Bet validation schemas
 */

// Place a bet
export const placeBetSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  choiceLetter: z.enum(VALID_CHOICE_LETTERS as unknown as [string, ...string[]]),
  amount: z
    .number()
    .min(MIN_BET_AMOUNT, `Minimum bet is ${MIN_BET_AMOUNT} chips`)
    .max(MAX_BET_AMOUNT, `Maximum bet is ${MAX_BET_AMOUNT} chips per bet`),
});

// Get user's bets query
export const getUserBetsQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  status: z.enum(['active', 'won', 'lost', 'refunded']).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('50'),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0))
    .optional()
    .default('0'),
});

export type PlaceBetInput = z.infer<typeof placeBetSchema>;
export type GetUserBetsQuery = z.infer<typeof getUserBetsQuerySchema>;

