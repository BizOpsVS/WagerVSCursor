import { z } from 'zod';

/**
 * User-related validation schemas
 */

// Update user profile
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  avatarUrl: z
    .string()
    .url('Invalid avatar URL')
    .max(500, 'Avatar URL must be less than 500 characters')
    .optional(),
});

// Claim free chips
export const claimFreeChipsSchema = z.object({
  // No body required, just authenticated request
});

// Get transaction history
export const transactionHistorySchema = z.object({
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
  transactionType: z
    .enum(['deposit', 'chips_buy', 'event_create', 'bet_placed', 'bet_won', 'prize_won', 'cashout', 'referral_reward'])
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type TransactionHistoryQuery = z.infer<typeof transactionHistorySchema>;

