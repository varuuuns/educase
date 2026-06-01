import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

export function createAuthRouter(): Router {
  const router = Router();

  const authService = new AuthService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const controller = new AuthController(authService);

  router.post('/register', asyncHandler(controller.register));
  router.post('/login', asyncHandler(controller.login));

  return router;
}
