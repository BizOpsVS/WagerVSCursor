import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../config';
import { logger } from './logger';

// USDC Mint Address on Devnet
export const USDC_MINT_DEVNET = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

// USDC Mint Address on Mainnet
export const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Get Solana connection
 */
export const getSolanaConnection = (): Connection => {
  return new Connection(config.solana.rpcUrl, 'confirmed');
};

/**
 * Get treasury wallet keypair
 * WARNING: In production, use a hardware wallet or secure key management
 */
export const getTreasuryKeypair = (): Keypair | null => {
  try {
    if (!config.solana.treasuryWalletPrivateKey) {
      logger.warn('Treasury wallet private key not configured');
      return null;
    }

    const privateKeyArray = JSON.parse(config.solana.treasuryWalletPrivateKey);
    return Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
  } catch (error) {
    logger.error('Failed to load treasury keypair:', error);
    return null;
  }
};

/**
 * Get treasury wallet public key
 */
export const getTreasuryPublicKey = (): PublicKey => {
  return new PublicKey(config.solana.treasuryWalletAddress);
};

/**
 * Get USDC mint address based on network
 */
export const getUSDCMint = (): PublicKey => {
  return config.solana.network === 'mainnet-beta' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
};

/**
 * Verify a transaction exists and was successful
 */
export const verifyTransaction = async (signature: string): Promise<boolean> => {
  try {
    const connection = getSolanaConnection();
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!tx) {
      return false;
    }

    // Check if transaction was successful (no errors)
    return tx.meta?.err === null;
  } catch (error) {
    logger.error('Error verifying transaction:', error);
    return false;
  }
};

/**
 * Get SOL balance of a wallet
 */
export const getSOLBalance = async (address: string): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error('Error getting SOL balance:', error);
    throw error;
  }
};

/**
 * Get USDC balance of a wallet
 */
export const getUSDCBalance = async (address: string): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(address);
    const usdcMint = getUSDCMint();

    // Get associated token account
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      mint: usdcMint,
    });

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance || 0;
  } catch (error) {
    logger.error('Error getting USDC balance:', error);
    throw error;
  }
};

/**
 * Send SOL from treasury to user
 */
export const sendSOL = async (
  toAddress: string,
  amountSOL: number
): Promise<string> => {
  try {
    const connection = getSolanaConnection();
    const fromKeypair = getTreasuryKeypair();

    if (!fromKeypair) {
      throw new Error('Treasury keypair not configured');
    }

    const toPublicKey = new PublicKey(toAddress);
    const lamports = amountSOL * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);

    logger.info(`Sent ${amountSOL} SOL to ${toAddress}. Signature: ${signature}`);

    return signature;
  } catch (error) {
    logger.error('Error sending SOL:', error);
    throw error;
  }
};

/**
 * Send USDC from treasury to user
 */
export const sendUSDC = async (
  toAddress: string,
  amountUSDC: number
): Promise<string> => {
  try {
    const connection = getSolanaConnection();
    const fromKeypair = getTreasuryKeypair();

    if (!fromKeypair) {
      throw new Error('Treasury keypair not configured');
    }

    const toPublicKey = new PublicKey(toAddress);
    const usdcMint = getUSDCMint();

    // Get or create associated token accounts
    // Note: This is a simplified version. In production, handle token account creation properly
    const fromTokenAccount = await Token.getAssociatedTokenAddress(
      TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      fromKeypair.publicKey
    );

    const toTokenAccount = await Token.getAssociatedTokenAddress(
      TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      usdcMint,
      toPublicKey
    );

    const token = new Token(connection, usdcMint, TOKEN_PROGRAM_ID, fromKeypair);

    // USDC has 6 decimals
    const amountWithDecimals = amountUSDC * 1_000_000;

    const signature = await token.transfer(
      fromTokenAccount,
      toTokenAccount,
      fromKeypair,
      [],
      amountWithDecimals
    );

    logger.info(`Sent ${amountUSDC} USDC to ${toAddress}. Signature: ${signature}`);

    return signature;
  } catch (error) {
    logger.error('Error sending USDC:', error);
    throw error;
  }
};

/**
 * Validate Solana address
 */
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

