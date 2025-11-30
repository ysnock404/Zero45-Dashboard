import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { configManager } from './shared/config/config';
import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { sshRouter } from './modules/ssh/ssh.routes';
import { setupSSHGateway } from './modules/ssh/ssh.gateway';

class Server {
    private app: Application;
    private httpServer;
    private io: SocketIOServer;
    private port: number;

    constructor() {
        // Load configuration
        const config = configManager.load();
        this.port = config.server.port;

        // Initialize Express
        this.app = express();
        this.httpServer = createServer(this.app);

        // Initialize Socket.IO
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: config.server.corsOrigins,
                credentials: true,
            },
        });

        this.setupMiddlewares();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    private setupMiddlewares(): void {
        const config = configManager.get();

        // Security
        this.app.use(helmet());
        this.app.use(
            cors({
                origin: config.server.corsOrigins,
                credentials: true,
            })
        );

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Logging
        this.app.use(
            morgan('combined', {
                stream: {
                    write: (message: string) => logger.info(message.trim()),
                },
            })
        );

        logger.info('✓ Middlewares configured');
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: '1.0.0',
            });
        });

        // API routes
        this.app.use('/api/auth', authRouter);
        this.app.use('/api/ssh', sshRouter);

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
            });
        });

        logger.info('✓ Routes configured');
    }

    private setupWebSocket(): void {
        // Authentication middleware for Socket.IO
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;

            // TODO: Verify JWT token
            // For now, allow all connections
            next();
        });

        this.io.on('connection', (socket) => {
            logger.info(`✓ WebSocket client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                logger.info(`✗ WebSocket client disconnected: ${socket.id}`);
            });
        });

        // Setup SSH Gateway
        setupSSHGateway(this.io);

        logger.info('✓ WebSocket configured');
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);
        logger.info('✓ Error handling configured');
    }

    public start(): void {
        this.httpServer.listen(this.port, () => {
            logger.info('╔═══════════════════════════════════════════════════════════╗');
            logger.info('║                                                           ║');
            logger.info('║              🚀 ysnockserver Backend                      ║');
            logger.info('║                                                           ║');
            logger.info('╚═══════════════════════════════════════════════════════════╝');
            logger.info('');
            logger.info(`✓ Server running on http://localhost:${this.port}`);
            logger.info(`✓ WebSocket ready on ws://localhost:${this.port}`);
            logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('');
            logger.info('📝 Configuration loaded from: config.json');
            logger.info('');
            logger.info('Press Ctrl+C to stop the server');
            logger.info('');
        });

        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    private shutdown(): void {
        logger.info('');
        logger.info('🛑 Shutting down gracefully...');

        this.httpServer.close(() => {
            logger.info('✓ HTTP server closed');
            logger.info('✓ Goodbye!');
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('❌ Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    }
}

// Start server
const server = new Server();
server.start();
