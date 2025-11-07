/**
 * Shared TypeScript types and interfaces
 */

// Balance types for user chips
export interface UserBalances {
  purchasedChips: number;  // Cannot cashout
  wonChips: number;        // Can cashout
  freeChips: number;       // Cannot cashout
  lockedChips: number;     // Currently in active bets
  totalChips: number;      // Sum of all balances
}

// Chip transaction balance types
export enum ChipBalanceType {
  PURCHASED = 'purchased',
  WON = 'won',
  FREE = 'free',
}

// Betting priority order
export const CHIP_DEDUCTION_PRIORITY = [
  ChipBalanceType.FREE,
  ChipBalanceType.PURCHASED,
  ChipBalanceType.WON,
] as const;

// Event constants
export const MAX_EVENT_OPTIONS = 8;
export const MIN_EVENT_OPTIONS = 2;
export const VALID_CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

// Betting constants
export const MIN_BET_AMOUNT = 1; // 1 chip = $1 USD
export const MAX_BET_AMOUNT = 2000; // 2000 chips = $2000 USD
export const EVENT_CREATION_FEE = 20; // 20 chips = $20 USD

// Rake constants
export const COMPANY_PRIZE_POOL_RAKE = 0.025; // 2.5%
export const DEFAULT_EVENT_RAKE = 0.01; // 1%
export const MIN_EVENT_RAKE = 0.01; // 1%
export const MAX_EVENT_RAKE = 0.05; // 5%
export const USER_CREATED_EVENT_SPLIT = 0.5; // 50% to creator, 50% to company

// Prize pool tier distribution
export const PRIZE_TIERS = [
  { rank: 1, sharePercent: 35 },
  { rank: 2, sharePercent: 15 },
  { rank: 3, sharePercent: 10 },
  { rank: 4, sharePercent: 5 },
  { rank: 5, sharePercent: 4 },
  { rankRange: [6, 10], sharePercent: 12, tierName: 'Platinum' },
  { rankRange: [11, 25], sharePercent: 10, tierName: 'Gold' },
  { rankRange: [26, 50], sharePercent: 7, tierName: 'Silver' },
  { rankRange: [51, 100], sharePercent: 2, tierName: 'Bronze' },
] as const;

// Daily free chips
export const FREE_CHIPS_DAILY_AMOUNT = 1; // 1 chip = $1 USD
export const FREE_CHIPS_COOLDOWN_HOURS = 24;

// JWT payload
export interface JwtPayload {
  userId: string; // UUID as string
  role?: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

// Request with authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: Buffer; // UUID as Buffer
    userId: string; // UUID as string
    role: 'user' | 'admin';
  };
}

