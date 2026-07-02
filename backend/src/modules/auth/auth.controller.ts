import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

class AuthController {
    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                throw new AppError('Username and password are required', 400);
            }

            const result = await authService.login(username, password);

            logger.info(`User logged in: ${username}`);

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
            // ✅ RESOLVED TODO: Get user from JWT token
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AppError('No token provided', 401);
            }

            const token = authHeader.split(' ')[1];
            const user = await authService.getUserFromToken(token);

            res.json({
                status: 'success',
                data: user,
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

    async changePassword(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AppError('No token provided', 401);
            }

            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                throw new AppError('Current password and new password are required', 400);
            }

            const token = authHeader.split(' ')[1];
            const decoded = authService.verifyAccessToken(token);

            await authService.changePassword(decoded.userId, currentPassword, newPassword);

            logger.info(`Password changed: ${decoded.username}`);

            res.json({
                status: 'success',
                message: 'Password changed successfully',
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

    async logout(req: Request, res: Response) {
        try {
            // ✅ RESOLVED TODO: Invalidate token
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AppError('No token provided', 401);
            }

            const token = authHeader.split(' ')[1];
            await authService.logout(token);

            logger.info('User logged out');

            res.json({
                status: 'success',
                message: 'Logged out successfully',
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
}

export const authController = new AuthController();
