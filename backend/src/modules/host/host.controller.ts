import { Request, Response } from 'express';
import { hostService } from './host.service';
import { logger } from '../../shared/utils/logger';

class HostController {
    async getMetrics(req: Request, res: Response) {
        try {
            const data = await hostService.getMetrics();
            res.json({ status: 'success', data });
        } catch (error) {
            logger.error('Error fetching host metrics', error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch host metrics' });
        }
    }
}

export const hostController = new HostController();
