import { Router } from 'express';
import { authController } from './auth.controller';

export const authRouter = Router();

// Public routes (login only - no register)
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refreshToken);

// Protected routes
authRouter.get('/me', authController.getMe);
authRouter.post('/logout', authController.logout);
authRouter.post('/change-password', authController.changePassword);
