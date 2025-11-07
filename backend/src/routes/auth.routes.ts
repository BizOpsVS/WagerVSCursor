import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  solanaLoginSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user with username/password
 */
router.post(
  '/register',
  validate(registerSchema),
  AuthController.register
);

/**
 * POST /api/auth/login
 * Login with username/password
 */
router.post(
  '/login',
  validate(loginSchema),
  AuthController.login
);

/**
 * POST /api/auth/solana-login
 * Login or register with Solana wallet
 */
router.post(
  '/solana-login',
  validate(solanaLoginSchema),
  AuthController.solanaLogin
);

/**
 * POST /api/auth/logout
 * Logout (client handles token removal)
 */
router.post(
  '/logout',
  AuthController.logout
);

export default router;

