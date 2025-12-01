import { Request, Response } from 'express';
import { rdpService } from './rdp.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

class RDPController {
    async getServers(req: Request, res: Response) {
        try {
            const servers = await rdpService.getServers();

            res.json({
                status: 'success',
                data: servers,
            });
        } catch (error) {
            logger.error('Error getting RDP servers:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get RDP servers',
            });
        }
    }

    async getServer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const server = await rdpService.getServer(id);

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
            const server = await rdpService.createServer(serverData);

            logger.info(`RDP server created: ${server.name}`);

            res.status(201).json({
                status: 'success',
                data: server,
            });
        } catch (error) {
            logger.error('Error creating RDP server:', error);
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
            const server = await rdpService.updateServer(id, serverData);

            logger.info(`RDP server updated: ${id}`);

            res.json({
                status: 'success',
                data: server,
            });
        } catch (error) {
            logger.error('Error updating RDP server:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update server',
            });
        }
    }

    async deleteServer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await rdpService.deleteServer(id);

            logger.info(`RDP server deleted: ${id}`);

            res.json({
                status: 'success',
                message: 'Server deleted successfully',
            });
        } catch (error) {
            logger.error('Error deleting RDP server:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete server',
            });
        }
    }

    async testConnection(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await rdpService.testConnection(id);

            res.json({
                status: 'success',
                data: result,
            });
        } catch (error) {
            logger.error('Error testing RDP connection:', error);
            res.status(500).json({
                status: 'error',
                message: 'Connection test failed',
            });
        }
    }

    async downloadRDPFile(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const server = await rdpService.getServer(id);

            if (!server) {
                throw new AppError('Server not found', 404);
            }

            const safeName = (server.name || 'rdp-server').toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
            const filename = `${safeName || 'rdp-server'}.rdp`;

            const fileContent = [
                `full address:s:${server.host}:${server.port}`,
                `username:s:${server.username}`,
                'prompt for credentials:i:1',
                'authentication level:i:2',
                'screen mode id:i:2',
                'enablecredsspsupport:i:1',
                'redirectclipboard:i:1',
            ].join('\n');

            res.setHeader('Content-Type', 'application/rdp');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(fileContent);
        } catch (error) {
            logger.error('Error generating RDP file:', error);

            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }

            res.status(500).json({
                status: 'error',
                message: 'Failed to generate RDP file',
            });
        }
    }

    async getActiveSessions(req: Request, res: Response) {
        try {
            const sessions = rdpService.getActiveSessions();

            res.json({
                status: 'success',
                data: sessions,
            });
        } catch (error) {
            logger.error('Error getting active RDP sessions:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get active sessions',
            });
        }
    }

    async getGuacToken(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { width, height, dpi } = req.query;

            const token = rdpService.generateGuacToken(id, {
                width: width ? Number(width) : undefined,
                height: height ? Number(height) : undefined,
                dpi: dpi ? Number(dpi) : undefined,
            });

            res.json({
                status: 'success',
                data: {
                    token,
                },
            });
        } catch (error) {
            logger.error('Error generating Guacamole token:', error);
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }

            res.status(500).json({
                status: 'error',
                message: 'Failed to generate token',
            });
        }
    }
}

export const rdpController = new RDPController();
