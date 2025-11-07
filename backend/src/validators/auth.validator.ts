import { z } from 'zod';

/**
 * Authentication validation schemas
 */

// Register with username/password
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Login with username/password
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Solana wallet login
export const solanaLoginSchema = z.object({
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address format'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

// Link wallet to existing account
export const linkWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SolanaLoginInput = z.infer<typeof solanaLoginSchema>;
export type LinkWalletInput = z.infer<typeof linkWalletSchema>;

