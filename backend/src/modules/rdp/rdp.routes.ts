import { Router } from 'express';
import { rdpController } from './rdp.controller';

export const rdpRouter = Router();

// Server management
rdpRouter.get('/servers', rdpController.getServers);
rdpRouter.post('/servers', rdpController.createServer);
rdpRouter.get('/servers/:id', rdpController.getServer);
rdpRouter.put('/servers/:id', rdpController.updateServer);
rdpRouter.delete('/servers/:id', rdpController.deleteServer);
rdpRouter.post('/servers/:id/test', rdpController.testConnection);
rdpRouter.get('/servers/:id/token', rdpController.getGuacToken);
rdpRouter.get('/servers/:id/rdp-file', rdpController.downloadRDPFile);

// Session management
rdpRouter.get('/sessions/active', rdpController.getActiveSessions);
