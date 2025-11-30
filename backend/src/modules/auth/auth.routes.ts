import { Router } from 'express';
import { authController } from './auth.controller';

export const authRouter = Router();

// Public routes
authRouter.post('/login', authController.login);
authRouter.post('/register', authController.register);
authRouter.post('/refresh', authController.refreshToken);

// Protected routes (will add auth middleware later)
authRouter.get('/me', authController.getMe);
authRouter.post('/logout', authController.logout);
