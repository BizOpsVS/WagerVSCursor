import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/responses';
import type { RegisterInput, LoginInput, SolanaLoginInput } from '../validators/auth.validator';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user with username/password
   */
  static async register(
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Login with username/password
   */
  static async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/solana-login
   * Login or register with Solana wallet
   */
  static async solanaLogin(
    req: Request<{}, {}, SolanaLoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.solanaLogin(req.body);
      sendSuccess(res, result, 'Solana authentication successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Logout (client-side token removal, no server action needed)
   */
  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }
}

