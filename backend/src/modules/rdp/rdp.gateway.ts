import { Server as SocketIOServer, Socket } from 'socket.io';
import { rdpService } from './rdp.service';
import { logger } from '../../shared/utils/logger';

export function setupRDPGateway(io: SocketIOServer) {
    io.on('connection', (socket: Socket) => {
        let currentServerId: string | null = null;

        // RDP Connect
        socket.on('rdp:connect', async ({ serverId }: { serverId: string }) => {
            try {
                const meta = rdpService.getServerMeta(serverId);
                logger.info(`RDP connect request for server ${serverId} from ${socket.id} (${meta?.host}:${meta?.port} as ${meta?.username || 'unknown'})`);

                // Get server credentials
                const credentials = await rdpService.getServerCredentials(serverId);
                if (!credentials) {
                    socket.emit('rdp:error', { message: 'Server not found' });
                    return;
                }

                // Create session
                rdpService.createSession(serverId);
                currentServerId = serverId;

                // Emit connected event
                socket.emit('rdp:connected', { serverId });

                logger.info(`RDP connected to server ${serverId} (${meta?.host}:${meta?.port})`);

                // In a real implementation, here you would:
                // 1. Connect to the RDP server using node-rdpjs or guacamole
                // 2. Stream the RDP display data to the client
                // 3. Handle mouse/keyboard input from the client

                // For now, we'll emit a placeholder message
                logger.info(`RDP streaming placeholder sent to ${socket.id} for server ${serverId}`);
                socket.emit('rdp:display', {
                    type: 'placeholder',
                    message: `RDP connection established to ${meta?.host}:${meta?.port || 3389}. Display streaming will be available soon.`,
                });

            } catch (error: any) {
                logger.error('RDP connection error:', error);
                socket.emit('rdp:error', { message: error.message });
            }
        });

        // RDP Input (mouse/keyboard)
        socket.on('rdp:input', (data: { type: string; payload: any }) => {
            if (!currentServerId) return;

            // In a real implementation, forward input to the RDP session
            logger.debug(`RDP input received: ${data.type}`, data.payload);
        });

        // RDP Resize
        socket.on('rdp:resize', ({ width, height }: { width: number; height: number }) => {
            if (!currentServerId) return;

            logger.debug(`RDP resize: ${width}x${height}`);
            // In a real implementation, resize the RDP session
        });

        // RDP Disconnect (explicit disconnect)
        socket.on('rdp:disconnect', ({ serverId }: { serverId: string }) => {
            if (currentServerId) {
                rdpService.removeSession(currentServerId);
                currentServerId = null;
                socket.emit('rdp:disconnected', { serverId });
                logger.info(`RDP explicitly disconnected from server ${serverId} (socket ${socket.id})`);
            }
        });

        // Socket disconnect (client disconnected)
        socket.on('disconnect', () => {
            if (currentServerId) {
                logger.info(`Client ${socket.id} disconnected, cleaning up RDP session for server ${currentServerId}`);
                rdpService.removeSession(currentServerId);
                currentServerId = null;
            }
        });
    });

    logger.info('✓ RDP Gateway configured');
}
