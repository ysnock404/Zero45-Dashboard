import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { configManager } from '../../shared/config/config';
import { AppError } from '../../shared/middleware/errorHandler';

// Mock user database (will be replaced with Prisma)
const mockUsers = [
    {
        id: 1,
        email: 'admin@ysnockserver.local',
        password: '$2b$10$YourHashedPasswordHere', // Will be hashed properly
        name: 'Admin User',
        role: 'admin',
    },
];

class AuthService {
    async login(email: string, password: string) {
        const config = configManager.getAuthConfig();

        // Find user (mock)
        const user = mockUsers.find((u) => u.email === email);

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // For demo purposes, accept "admin" as password
        const isValidPassword = password === 'admin';
        // In production: await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            throw new AppError('Invalid credentials', 401);
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn }
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    async register(email: string, password: string, name: string) {
        const config = configManager.getAuthConfig();

        // Check if user exists
        const existingUser = mockUsers.find((u) => u.email === email);
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

        // Create user (mock)
        const newUser = {
            id: mockUsers.length + 1,
            email,
            password: hashedPassword,
            name,
            role: 'user' as const,
        };

        mockUsers.push(newUser);

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: newUser.id, email: newUser.email, role: newUser.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        const refreshToken = jwt.sign(
            { userId: newUser.id },
            config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn }
        );

        return {
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
            accessToken,
            refreshToken,
        };
    }

    async refreshToken(refreshToken: string) {
        const config = configManager.getAuthConfig();

        try {
            const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
                userId: number;
            };

            const user = mockUsers.find((u) => u.id === decoded.userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Generate new access token
            const accessToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                config.jwtSecret,
                { expiresIn: config.jwtExpiresIn }
            );

            return {
                accessToken,
            };
        } catch (error) {
            throw new AppError('Invalid refresh token', 401);
        }
    }
}

export const authService = new AuthService();
