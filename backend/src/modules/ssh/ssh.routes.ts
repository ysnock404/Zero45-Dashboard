import { Router } from 'express';
import { sshController } from './ssh.controller';

export const sshRouter = Router();

// Server management
sshRouter.get('/servers', sshController.getServers);
sshRouter.post('/servers', sshController.createServer);
sshRouter.get('/servers/:id', sshController.getServer);
sshRouter.put('/servers/:id', sshController.updateServer);
sshRouter.delete('/servers/:id', sshController.deleteServer);
sshRouter.post('/servers/:id/test', sshController.testConnection);

// Session management
sshRouter.get('/sessions/active', sshController.getActiveSessions);
