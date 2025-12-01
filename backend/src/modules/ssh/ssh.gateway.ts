import { Server as SocketIOServer, Socket } from 'socket.io';
import { sshService } from './ssh.service';
import { logger } from '../../shared/utils/logger';

export function setupSSHGateway(io: SocketIOServer) {
    io.on('connection', (socket: Socket) => {
        let currentServerId: string | null = null;
        let isConnecting = false;

        const bindInputHandlers = (stream: any) => {
            // Avoid stacking listeners when reconnecting
            socket.removeAllListeners('ssh:input');
            socket.removeAllListeners('ssh:resize');

            socket.on('ssh:input', (data: string) => {
                stream.write(data);
            });

            socket.on('ssh:resize', ({ rows, cols }: { rows: number; cols: number }) => {
                stream.setWindow(rows, cols, 0, 0);
            });
        };

        // SSH Connect
        socket.on('ssh:connect', async ({ serverId }: { serverId: string }) => {
            try {
                // Check if there's an existing session for this server
                const existingSession = sshService.getSession(serverId);

                if (existingSession) {
                    logger.info(`[SSH][WS] Reconnecting to existing session for server ${serverId} (socket ${socket.id})`);
                    currentServerId = serverId;

                    // Attach this socket to the existing stream
                    sshService.attachSocketToSession(serverId, socket);

                    // Send existing session connected event
                    socket.emit('ssh:connected', { serverId });

                    // Send history to new client
                    const history = sshService.getHistory(serverId);
                    if (history.length > 0) {
                        socket.emit('ssh:history', { history: history.join('') });
                        logger.debug(`[SSH][WS] Sent history (${history.join('').length} chars) to socket ${socket.id}`);
                    }

                    bindInputHandlers(existingSession.stream);

                    return;
                }

                // Prevent duplicate connection attempts
                if (isConnecting) {
                    logger.warn(`Already connecting to server ${serverId}, ignoring duplicate request`);
                    return;
                }

                if (currentServerId === serverId) {
                    logger.warn(`Already connected to server ${serverId}, ignoring duplicate request`);
                    return;
                }

                isConnecting = true;
                logger.info(`[SSH][WS] Connect request for server ${serverId} from ${socket.id}`);

                const conn = await sshService.connect(serverId);
                currentServerId = serverId;
                isConnecting = false;

                // Open shell
                conn.shell((err, stream) => {
                    if (err) {
                        logger.error('SSH shell error:', err);
                        socket.emit('ssh:error', { message: err.message });
                        // Reset state on shell error
                        currentServerId = null;
                        isConnecting = false;
                        // Disconnect the SSH connection
                        sshService.disconnect(serverId);
                        return;
                    }

                    // Create session with history and attach current socket
                    sshService.createSession(serverId, conn, stream, socket);

                    logger.info(`[SSH][WS] Shell opened for server ${serverId}, notifying socket ${socket.id}`);
                    socket.emit('ssh:connected', { serverId });

                    bindInputHandlers(stream);
                });
            } catch (error: any) {
                isConnecting = false;
                currentServerId = null;
                logger.error('SSH connection error:', error);
                socket.emit('ssh:error', { message: error.message });
                // Ensure connection is cleaned up on error
                if (serverId) {
                    sshService.disconnect(serverId);
                }
            }
        });

        // SSH Disconnect (explicit disconnect - close SSH connection)
        socket.on('ssh:disconnect', ({ serverId }: { serverId: string }) => {
            if (!serverId) return;

            logger.info(`[SSH][WS] Explicit disconnect for ${serverId} from socket ${socket.id}`);
            sshService.detachSocketFromSession(serverId, socket.id);
            sshService.disconnect(serverId);

            if (currentServerId === serverId) {
                currentServerId = null;
                isConnecting = false;
            }

            socket.emit('ssh:disconnected', { serverId });
            logger.info(`SSH explicitly disconnected from server ${serverId}`);
        });

        // Socket disconnect (client disconnected - keep SSH session alive)
        socket.on('disconnect', () => {
            if (currentServerId) {
                logger.info(`[SSH][WS] Socket ${socket.id} disconnected, keeping SSH session ${currentServerId} alive`);
                sshService.detachSocketFromSession(currentServerId, socket.id);
                // Don't disconnect SSH - keep session alive for reconnection
                currentServerId = null;
            }
        });
    });

    logger.info('✓ SSH Gateway configured');
}
