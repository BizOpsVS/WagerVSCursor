import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { generateUuid, uuidToBuffer, bufferToUuid } from '../utils/uuid';
import type { RegisterInput, LoginInput, SolanaLoginInput } from '../validators/auth.validator';
import type { JwtPayload } from '../types';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user with username/password
   */
  static async register(input: RegisterInput) {
    const { username, email, password } = input;

    // Check if username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new AppError('Username or email already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user and auth record in transaction
    const userId = generateUuid();
    const userIdBuffer = uuidToBuffer(userId);

    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          id: userIdBuffer,
          username,
          email: email || null,
        },
      });

      // Create password auth record
      await tx.userAuth.create({
        data: {
          userId: userIdBuffer,
          authType: 'password',
          authIdentifier: username,
          passwordHash,
          isVerified: true,
        },
      });

      return newUser;
    });

    // Generate JWT
    const token = this.generateToken(userId);

    return {
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp.toString(),
      },
      token,
    };
  }

  /**
   * Login with username/password
   */
  static async login(input: LoginInput) {
    const { username, password } = input;

    // Find user with password auth
    const userAuth = await prisma.userAuth.findFirst({
      where: {
        authIdentifier: username,
        authType: 'password',
      },
      include: {
        user: true,
      },
    });

    if (!userAuth || !userAuth.passwordHash) {
      throw new AppError('Invalid username or password', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userAuth.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid username or password', 401);
    }

    // Check if user is active
    if (!userAuth.user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: userAuth.userId },
      data: { lastLogin: new Date() },
    });

    const userId = bufferToUuid(userAuth.userId);
    const token = this.generateToken(userId);

    return {
      user: {
        id: userId,
        username: userAuth.user.username,
        email: userAuth.user.email,
        level: userAuth.user.level,
        xp: userAuth.user.xp.toString(),
      },
      token,
    };
  }

  /**
   * Login or register with Solana wallet
   */
  static async solanaLogin(input: SolanaLoginInput) {
    const { walletAddress, signature, message } = input;

    // Verify signature
    const isValid = this.verifySolanaSignature(walletAddress, signature, message);

    if (!isValid) {
      throw new AppError('Invalid wallet signature', 401);
    }

    // Check if wallet is already linked to a user
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        walletAddress,
        chain: 'solana',
      },
      include: {
        user: true,
      },
    });

    if (existingWallet) {
      // User exists, log them in
      const userId = bufferToUuid(existingWallet.userId);
      const token = this.generateToken(userId);

      // Update last login
      await prisma.user.update({
        where: { id: existingWallet.userId },
        data: { lastLogin: new Date() },
      });

      return {
        user: {
          id: userId,
          username: existingWallet.user.username,
          email: existingWallet.user.email,
          level: existingWallet.user.level,
          xp: existingWallet.user.xp.toString(),
        },
        token,
      };
    }

    // Create new user with wallet
    const userId = generateUuid();
    const userIdBuffer = uuidToBuffer(userId);

    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          id: userIdBuffer,
          username: null, // User can set username later
          email: null,
        },
      });

      // Create wallet record
      await tx.userWallet.create({
        data: {
          userId: userIdBuffer,
          chain: 'solana',
          walletAddress,
        },
      });

      // Create auth record
      await tx.userAuth.create({
        data: {
          userId: userIdBuffer,
          authType: 'solana',
          authIdentifier: walletAddress,
          isVerified: true,
        },
      });

      return newUser;
    });

    const token = this.generateToken(userId);

    return {
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp.toString(),
      },
      token,
    };
  }

  /**
   * Verify Solana wallet signature
   */
  private static verifySolanaSignature(
    walletAddress: string,
    signature: string,
    message: string
  ): boolean {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatureBytes = bs58.decode(signature);
      const messageBytes = new TextEncoder().encode(message);

      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(userId: string): string {
    const payload: JwtPayload = {
      userId,
      role: 'user',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

