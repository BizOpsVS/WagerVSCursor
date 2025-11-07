import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';
import { config } from '../config';
import { logger } from './logger';

/**
 * Get current SOL/USD price from Pyth Oracle
 */
export const getSOLPrice = async (): Promise<number> => {
  try {
    const connection = new Connection(config.solana.rpcUrl, 'confirmed');
    
    // Get Pyth program key for the network
    const pythPublicKey = getPythProgramKeyForCluster(
      config.solana.network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet'
    );

    const pythClient = new PythHttpClient(connection, pythPublicKey);

    // Get price data
    const data = await pythClient.getData();

    // Find SOL/USD price feed
    const solUsdFeed = data.productPrice.get(config.solana.pythPriceFeedSolUsd);

    if (!solUsdFeed || !solUsdFeed.price) {
      throw new Error('SOL/USD price feed not available');
    }

    const price = solUsdFeed.price;
    const confidence = solUsdFeed.confidence;

    logger.debug(`SOL/USD Price: $${price} ± $${confidence}`);

    return price;
  } catch (error) {
    logger.error('Error fetching SOL price from Pyth:', error);
    
    // Fallback: return a default price for devnet testing
    // In production, you should fail if price cannot be fetched
    if (config.solana.network === 'devnet') {
      logger.warn('Using fallback SOL price for devnet');
      return 100; // Default $100 for testing
    }

    throw error;
  }
};

/**
 * Convert SOL amount to USD
 */
export const solToUSD = async (solAmount: number): Promise<number> => {
  const price = await getSOLPrice();
  return solAmount * price;
};

/**
 * Convert USD amount to SOL
 */
export const usdToSOL = async (usdAmount: number): Promise<number> => {
  const price = await getSOLPrice();
  return usdAmount / price;
};

/**
 * Get price with cache (cache for 30 seconds)
 */
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export const getSOLPriceCached = async (): Promise<number> => {
  const now = Date.now();

  if (cachedPrice && now - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.price;
  }

  const price = await getSOLPrice();
  cachedPrice = { price, timestamp: now };

  return price;
};

