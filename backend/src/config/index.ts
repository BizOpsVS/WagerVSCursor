import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  solana: {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl: string;
    treasuryWalletAddress: string;
    treasuryWalletPrivateKey: string;
    pythPriceFeedSolUsd: string;
  };
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  database: {
    url: process.env.DATABASE_URL || 'mysql://preduser:H2lloW0rld@localhost:3306/predictionsdb',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  solana: {
    network: (process.env.SOLANA_NETWORK as 'mainnet-beta' | 'devnet' | 'testnet') || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    treasuryWalletAddress: process.env.TREASURY_WALLET_ADDRESS || 'FEcLmvr7CSNjA3yUvELkF41cMWaDiYBwfeCgkSWvxLzg',
    treasuryWalletPrivateKey: process.env.TREASURY_WALLET_PRIVATE_KEY || '',
    pythPriceFeedSolUsd: process.env.PYTH_PRICE_FEED_SOL_USD || 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
  },
  
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  logLevel: process.env.LOG_LEVEL || 'debug',
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'TREASURY_WALLET_PRIVATE_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }
}

