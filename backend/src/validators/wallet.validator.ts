import { z } from 'zod';

/**
 * Wallet and transaction validation schemas
 */

// Deposit USDC
export const depositUSDCSchema = z.object({
  transactionSignature: z
    .string()
    .min(1, 'Transaction signature is required')
    .max(100, 'Invalid transaction signature'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'),
});

// Deposit SOL
export const depositSOLSchema = z.object({
  transactionSignature: z
    .string()
    .min(1, 'Transaction signature is required')
    .max(100, 'Invalid transaction signature'),
  amountSOL: z
    .number()
    .positive('Amount must be positive')
    .max(10000, 'Amount too large'),
});

// Request withdrawal
export const withdrawalRequestSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum withdrawal is 1 chip'),
  currency: z.enum(['usdc', 'sol'], {
    errorMap: () => ({ message: 'Currency must be either usdc or sol' }),
  }),
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address format'),
});

export type DepositUSDCInput = z.infer<typeof depositUSDCSchema>;
export type DepositSOLInput = z.infer<typeof depositSOLSchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

