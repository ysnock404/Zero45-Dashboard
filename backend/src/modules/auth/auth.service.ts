import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/services/prisma.service';
import { redisService } from '../../shared/services/redis.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

interface JWTPayload {
    userId: string;
    username: string;
    role: string;
}

class AuthService {
    private readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-change-me';
    private readonly JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me';
    private readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
    private readonly JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    /**
     * Login user
     */
    async login(username: string, password: string) {
        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user.id, user.username, user.role);
        const refreshToken = this.generateRefreshToken(user.id);

        // Save refresh token to database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        // Create session
        await prisma.session.create({
            data: {
                userId: user.id,
                token: accessToken,
                expiresAt: this.getExpirationDate(this.JWT_EXPIRES_IN),
            },
        });

        logger.info(`User logged in: ${user.username}`);

        return {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload;

            // Check if refresh token exists in database
            const storedToken = await prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true },
            });

            if (!storedToken) {
                throw new AppError('Invalid refresh token', 401);
            }

            // Check if expired
            if (storedToken.expiresAt < new Date()) {
                // Delete expired token
                await prisma.refreshToken.delete({
                    where: { id: storedToken.id },
                });
                throw new AppError('Refresh token expired', 401);
            }

            // Generate new access token
            const accessToken = this.generateAccessToken(
                storedToken.user.id,
                storedToken.user.username,
                storedToken.user.role
            );

            // Create new session
            await prisma.session.create({
                data: {
                    userId: storedToken.user.id,
                    token: accessToken,
                    expiresAt: this.getExpirationDate(this.JWT_EXPIRES_IN),
                },
            });

            return {
                accessToken,
            };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid refresh token', 401);
            }
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout(token: string) {
        try {
            // Verify token
            const decoded = this.verifyAccessToken(token);

            // Add token to blacklist in Redis (if available)
            if (redisService.isReady()) {
                const expirationSeconds = this.getSecondsUntilExpiration(this.JWT_EXPIRES_IN);
                await redisService.sadd('token:blacklist', token);
                await redisService.expire('token:blacklist', expirationSeconds);
            }

            // Delete session from database
            await prisma.session.deleteMany({
                where: {
                    token,
                    userId: decoded.userId,
                },
            });

            // Delete all refresh tokens for this user (optional - logout from all devices)
            // await prisma.refreshToken.deleteMany({ where: { userId: decoded.userId } });

            logger.info(`User logged out: ${decoded.username}`);
        } catch (error) {
            // Even if token is invalid, try to clean up
            logger.warn('Logout with invalid/expired token');
        }
    }

    /**
     * Get user from JWT token
     */
    async getUserFromToken(token: string) {
        // Check if token is blacklisted
        if (redisService.isReady()) {
            const isBlacklisted = await redisService.sismember('token:blacklist', token);
            if (isBlacklisted) {
                throw new AppError('Token has been revoked', 401);
            }
        }

        // Verify token
        const decoded = this.verifyAccessToken(token);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    /**
     * Generate access token (JWT)
     */
    private generateAccessToken(userId: string, username: string, role: string): string {
        const payload: JWTPayload = {
            userId,
            username,
            role,
        };

        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        });
    }

    /**
     * Generate refresh token (JWT)
     */
    private generateRefreshToken(userId: string): string {
        const payload = { userId };

        return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        });
    }

    /**
     * Verify access token
     */
    verifyAccessToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError('Token expired', 401);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid token', 401);
            }
            throw new AppError('Token verification failed', 401);
        }
    }

    /**
     * Hash password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    /**
     * Change password for the authenticated user
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new AppError('Current password is incorrect', 401);
        }

        if (newPassword.length < 8) {
            throw new AppError('New password must be at least 8 characters long', 400);
        }

        const hashedPassword = await this.hashPassword(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Invalidate all other sessions/refresh tokens for this user
        await prisma.session.deleteMany({ where: { userId } });
        await prisma.refreshToken.deleteMany({ where: { userId } });

        logger.info(`Password changed for user: ${user.username}`);
    }

    /**
     * Get expiration date from duration string (15m, 7d, etc)
     */
    private getExpirationDate(duration: string): Date {
        const seconds = this.getSecondsUntilExpiration(duration);
        const date = new Date();
        date.setSeconds(date.getSeconds() + seconds);
        return date;
    }

    /**
     * Get seconds from duration string
     */
    private getSecondsUntilExpiration(duration: string): number {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 900; // Default 15 minutes
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 60 * 60 * 24;
            default:
                return 900;
        }
    }
}

export const authService = new AuthService();
