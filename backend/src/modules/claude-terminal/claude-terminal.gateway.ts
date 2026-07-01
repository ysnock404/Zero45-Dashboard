import { Server as SocketIOServer, Socket } from 'socket.io';
import { claudeTerminalService } from './claude-terminal.service';
import { logger } from '../../shared/utils/logger';

export function setupClaudeTerminalGateway(io: SocketIOServer) {
    io.on('connection', (socket: Socket) => {
        let attached = false;

        socket.on('claude:connect', () => {
            try {
                const wasRunning = claudeTerminalService.isRunning();
                claudeTerminalService.attachSocket(socket);
                attached = true;

                logger.info(`[ClaudeTerminal][WS] Socket ${socket.id} attached (existing session: ${wasRunning})`);
                socket.emit('claude:connected');

                const history = claudeTerminalService.getHistory();
                if (history.length > 0) {
                    socket.emit('claude:history', { history });
                }
            } catch (error: any) {
                logger.error('[ClaudeTerminal][WS] Connect error:', error);
                socket.emit('claude:error', { message: error.message });
            }
        });

        socket.on('claude:input', (data: string) => {
            claudeTerminalService.write(data);
        });

        socket.on('claude:resize', ({ cols, rows }: { cols: number; rows: number }) => {
            claudeTerminalService.resize(cols, rows);
        });

        socket.on('disconnect', () => {
            if (attached) {
                logger.info(`[ClaudeTerminal][WS] Socket ${socket.id} disconnected, keeping process alive`);
                claudeTerminalService.detachSocket(socket);
            }
        });
    });

    logger.info('✓ Claude Terminal Gateway configured');
}
