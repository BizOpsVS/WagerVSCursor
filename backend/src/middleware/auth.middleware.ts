import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from './errorHandler';
import { uuidToBuffer } from '../utils/uuid';
import { prisma } from '../utils/prisma';

/**
 * Extend Express Request to include authenticated user
 */
export interface AuthRequest extends Request {
  user?: {
    id: Buffer;        // UUID as Buffer for Prisma queries
    userId: string;    // UUID as string for responses
    role: 'user' | 'admin';
  };
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = AuthService.verifyToken(token);

    // Get user from database to verify they still exist and are active
    const userIdBuffer = uuidToBuffer(payload.userId);
    const user = await prisma.user.findUnique({
      where: { id: userIdBuffer },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Attach user to request
    (req as AuthRequest).user = {
      id: userIdBuffer,
      userId: payload.userId,
      role: 'user',
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate admin JWT token
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // For admin authentication, we expect a different token format
    // For now, we'll use the same JWT but check admin_users table
    const payload = AuthService.verifyToken(token);

    // Check if user is an admin
    const adminIdBuffer = uuidToBuffer(payload.userId);
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminIdBuffer },
      select: {
        id: true,
        isActive: true,
        role: true,
      },
    });

    if (!admin) {
      throw new AppError('Admin access required', 403);
    }

    if (!admin.isActive) {
      throw new AppError('Admin account is deactivated', 403);
    }

    // Attach admin to request
    (req as AuthRequest).user = {
      id: adminIdBuffer,
      userId: payload.userId,
      role: 'admin',
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);

      const userIdBuffer = uuidToBuffer(payload.userId);
      const user = await prisma.user.findUnique({
        where: { id: userIdBuffer },
        select: { id: true, isActive: true },
      });

      if (user && user.isActive) {
        (req as AuthRequest).user = {
          id: userIdBuffer,
          userId: payload.userId,
          role: 'user',
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

