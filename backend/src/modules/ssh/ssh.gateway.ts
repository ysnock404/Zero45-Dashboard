import { Server as SocketIOServer, Socket } from 'socket.io';
import { sshService } from './ssh.service';
import { logger } from '../../shared/utils/logger';

export function setupSSHGateway(io: SocketIOServer) {
    io.on('connection', (socket: Socket) => {
        let currentServerId: string | null = null;
        let isConnecting = false;

        // SSH Connect
        socket.on('ssh:connect', async ({ serverId }: { serverId: string }) => {
            try {
                // Check if there's an existing session for this server
                const existingSession = sshService.getSession(serverId);

                if (existingSession) {
                    logger.info(`Reconnecting to existing SSH session for server ${serverId}`);
                    currentServerId = serverId;

                    // Send existing session connected event
                    socket.emit('ssh:connected', { serverId });

                    // Send history to new client
                    const history = sshService.getHistory(serverId);
                    if (history.length > 0) {
                        socket.emit('ssh:history', { history: history.join('') });
                    }

                    // Attach stream handlers to new socket
                    const stream = existingSession.stream;

                    // Stream data from SSH to client
                    stream.on('data', (data: Buffer) => {
                        const output = data.toString('utf8');
                        socket.emit('ssh:data', output);
                    });

                    // Handle input from client
                    socket.on('ssh:input', (data: string) => {
                        stream.write(data);
                    });

                    // Handle resize
                    socket.on('ssh:resize', ({ rows, cols }: { rows: number; cols: number }) => {
                        stream.setWindow(rows, cols, 0, 0);
                    });

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
                logger.info(`SSH connect request for server ${serverId} from ${socket.id}`);

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

                    // Create session with history
                    sshService.createSession(serverId, conn, stream);

                    socket.emit('ssh:connected', { serverId });

                    // Stream data from SSH to client and save to history
                    stream.on('data', (data: Buffer) => {
                        const output = data.toString('utf8');
                        socket.emit('ssh:data', output);
                        // Add to history
                        sshService.addToHistory(serverId, output);
                    });

                    stream.on('close', () => {
                        socket.emit('ssh:disconnected', { serverId });
                        sshService.removeSession(serverId);
                        logger.info(`SSH stream closed for server ${serverId}`);
                    });

                    stream.stderr.on('data', (data: Buffer) => {
                        const output = data.toString('utf8');
                        socket.emit('ssh:data', output);
                        // Add stderr to history as well
                        sshService.addToHistory(serverId, output);
                    });

                    // Handle input from client
                    socket.on('ssh:input', (data: string) => {
                        stream.write(data);
                    });

                    // Handle resize
                    socket.on('ssh:resize', ({ rows, cols }: { rows: number; cols: number }) => {
                        stream.setWindow(rows, cols, 0, 0);
                    });
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
            if (currentServerId) {
                sshService.disconnect(currentServerId);
                sshService.removeSession(currentServerId);
                currentServerId = null;
                socket.emit('ssh:disconnected', { serverId });
                logger.info(`SSH explicitly disconnected from server ${serverId}`);
            }
        });

        // Socket disconnect (client disconnected - keep SSH session alive)
        socket.on('disconnect', () => {
            if (currentServerId) {
                logger.info(`Client ${socket.id} disconnected, but keeping SSH session alive for server ${currentServerId}`);
                // Don't disconnect SSH - keep session alive for reconnection
                currentServerId = null;
            }
        });
    });

    logger.info('✓ SSH Gateway configured');
}
