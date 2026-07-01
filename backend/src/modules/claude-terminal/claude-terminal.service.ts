import * as pty from 'node-pty';
import { Socket } from 'socket.io';
import path from 'path';
import { logger } from '../../shared/utils/logger';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const MAX_HISTORY_CHARS = 200_000;

interface ClaudeSession {
    proc: pty.IPty;
    history: string[];
    historyLength: number;
    sockets: Set<Socket>;
}

class ClaudeTerminalService {
    private session: ClaudeSession | null = null;

    private spawnProcess(): pty.IPty {
        logger.info('[ClaudeTerminal] Spawning claude CLI process');

        const proc = pty.spawn('claude', ['--continue', '--model', 'claude-sonnet-5', '--effort', 'medium'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: REPO_ROOT,
            env: process.env as Record<string, string>,
        });

        proc.onData((data) => {
            if (!this.session) return;
            this.session.history.push(data);
            this.session.historyLength += data.length;
            while (this.session.historyLength > MAX_HISTORY_CHARS && this.session.history.length > 1) {
                const removed = this.session.history.shift();
                this.session.historyLength -= removed?.length || 0;
            }
            for (const socket of this.session.sockets) {
                socket.emit('claude:data', data);
            }
        });

        proc.onExit(({ exitCode }) => {
            logger.info(`[ClaudeTerminal] Process exited with code ${exitCode}`);
            if (this.session) {
                for (const socket of this.session.sockets) {
                    socket.emit('claude:exited', { exitCode });
                }
            }
            this.session = null;
        });

        return proc;
    }

    getOrCreateSession(): ClaudeSession {
        if (!this.session) {
            const proc = this.spawnProcess();
            this.session = {
                proc,
                history: [],
                historyLength: 0,
                sockets: new Set(),
            };
        }
        return this.session;
    }

    attachSocket(socket: Socket): ClaudeSession {
        const session = this.getOrCreateSession();
        session.sockets.add(socket);
        return session;
    }

    detachSocket(socket: Socket) {
        this.session?.sockets.delete(socket);
    }

    getHistory(): string {
        return this.session?.history.join('') || '';
    }

    write(data: string) {
        this.session?.proc.write(data);
    }

    resize(cols: number, rows: number) {
        this.session?.proc.resize(cols, rows);
    }

    isRunning(): boolean {
        return this.session !== null;
    }
}

export const claudeTerminalService = new ClaudeTerminalService();
