import { Request, Response } from 'express';
import { sshService } from './ssh.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

class SSHController {
    async getServers(req: Request, res: Response) {
        try {
            const servers = await sshService.getServers();

            res.json({
                status: 'success',
                data: servers,
            });
        } catch (error) {
            logger.error('Error getting servers:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get servers',
            });
        }
    }

    async getServer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const server = await sshService.getServer(id);

            if (!server) {
                throw new AppError('Server not found', 404);
            }

            res.json({
                status: 'success',
                data: server,
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
                message: 'Failed to get server',
            });
        }
    }

    async createServer(req: Request, res: Response) {
        try {
            const serverData = req.body;
            const server = await sshService.createServer(serverData);

            logger.info(`SSH server created: ${server.name}`);

            res.status(201).json({
                status: 'success',
                data: server,
            });
        } catch (error) {
            logger.error('Error creating server:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to create server',
            });
        }
    }

    async updateServer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const serverData = req.body;
            const server = await sshService.updateServer(id, serverData);

            logger.info(`SSH server updated: ${id}`);

            res.json({
                status: 'success',
                data: server,
            });
        } catch (error) {
            logger.error('Error updating server:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update server',
            });
        }
    }

    async deleteServer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await sshService.deleteServer(id);

            logger.info(`SSH server deleted: ${id}`);

            res.json({
                status: 'success',
                message: 'Server deleted successfully',
            });
        } catch (error) {
            logger.error('Error deleting server:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete server',
            });
        }
    }

    async testConnection(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await sshService.testConnection(id);

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            logger.error('Error testing connection:', error);
            res.status(500).json({
                status: 'error',
                message: 'Connection test failed',
            });
        }
    }

    async getActiveSessions(req: Request, res: Response) {
        try {
            const sessions = sshService.getActiveSessions();

            res.json({
                status: 'success',
                data: sessions,
            });
        } catch (error) {
            logger.error('Error getting active sessions:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get active sessions',
            });
        }
    }
}

export const sshController = new SSHController();
