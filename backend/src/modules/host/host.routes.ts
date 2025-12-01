import { Router } from 'express';
import { hostController } from './host.controller';

export const hostRouter = Router();

hostRouter.get('/metrics', hostController.getMetrics.bind(hostController));
