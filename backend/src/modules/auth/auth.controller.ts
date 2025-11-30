import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

class AuthController {
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw new AppError('Email and password are required', 400);
            }

            const result = await authService.login(email, password);

            logger.info(`User logged in: ${email}`);

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
            });
        }
    }

    async register(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                throw new AppError('Email, password, and name are required', 400);
            }

            const result = await authService.register(email, password, name);

            logger.info(`New user registered: ${email}`);

            res.status(201).json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
            });
        }
    }

    async refreshToken(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new AppError('Refresh token is required', 400);
            }

            const result = await authService.refreshToken(refreshToken);

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
            });
        }
    }

    async getMe(req: Request, res: Response) {
        try {
            // TODO: Get user from JWT token
            res.json({
                status: 'success',
                data: {
                    id: 1,
                    email: 'admin@ysnockserver.local',
                    name: 'Admin User',
                    role: 'admin',
                },
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
            });
        }
    }

    async logout(req: Request, res: Response) {
        try {
            // TODO: Invalidate token
            logger.info('User logged out');

            res.json({
                status: 'success',
                message: 'Logged out successfully',
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
            });
        }
    }
}

export const authController = new AuthController();
