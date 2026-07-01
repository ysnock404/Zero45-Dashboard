import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

class WebSocketService {
    private socket: Socket | null = null;
    private url: string;
    private refreshing = false;

    constructor() {
        // Load from config or environment
        this.url =
            import.meta.env.VITE_WS_URL ||
            `${window.location.protocol}//${window.location.hostname}:9031`;
    }

    connect(_token?: string): Socket {
        // Reuse the single socket instance across the app's lifetime. Recreating
        // it (the old behaviour) orphaned every listener other components had
        // registered — e.g. the Claude terminal — whenever the token changed.
        if (this.socket) {
            if (!this.socket.connected) this.socket.connect();
            return this.socket;
        }

        this.socket = io(this.url, {
            // Read the JWT lazily on every (re)connection attempt so a token
            // that refreshed mid-session is picked up automatically, instead of
            // being frozen at the value passed on the first connect.
            auth: (cb) => cb({ token: useAuthStore.getState().accessToken || undefined }),
            // Prefer WebSocket (Cloudflare proxies it cleanly and it's the
            // right transport for a live terminal), but keep long-polling as a
            // fallback for networks where WebSocket is blocked. nginx now runs
            // the polling path with proxy_buffering off so the fallback is
            // usable behind Cloudflare too.
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });

        this.socket.on('connect', () => {
            console.log('✓ WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('✗ WebSocket disconnected');
        });

        this.socket.on('connect_error', async (error) => {
            // The access token is short-lived (15m). When it expires the
            // handshake fails with "Authentication failed" — refresh it once and
            // reconnect; the lazy auth callback above will send the new token.
            const message = String(error?.message || '').toLowerCase();
            if (message.includes('auth') && !this.refreshing) {
                this.refreshing = true;
                const ok = await useAuthStore.getState().refreshAccessToken();
                this.refreshing = false;
                if (ok) {
                    this.socket?.connect();
                }
            }
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    // SSH namespace
    connectSSH(serverId: string, onData: (data: string) => void, onError: (error: string) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        // Remove any existing listeners first to prevent duplicates
        this.socket.off('ssh:data');
        this.socket.off('ssh:error');

        // Add new listeners
        this.socket.on('ssh:data', onData);

        // Handle error - backend sends {message: string}
        this.socket.on('ssh:error', (data: { message: string } | string) => {
            const errorMessage = typeof data === 'string' ? data : data.message;
            onError(errorMessage);
        });

        this.socket.on('ssh:connected', () => {
            console.log(`✓ SSH connected to server ${serverId}`);
        });

        this.socket.on('ssh:disconnected', () => {
            console.log(`✗ SSH disconnected from server ${serverId}`);
        });

        // Emit connection request AFTER setting up listeners
        this.socket.emit('ssh:connect', { serverId });
    }

    sendSSHCommand(data: string) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.emit('ssh:input', data);
    }

    disconnectSSH(serverId: string) {
        if (!this.socket) return;

        this.socket.emit('ssh:disconnect', { serverId });

        // Remove all SSH listeners
        this.socket.off('ssh:data');
        this.socket.off('ssh:error');
        this.socket.off('ssh:connected');
        this.socket.off('ssh:disconnected');
    }

    // RDP namespace
    connectRDP(serverId: string, onData: (data: any) => void, onError: (error: string) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        // Remove any existing listeners first to prevent duplicates
        this.socket.off('rdp:display');
        this.socket.off('rdp:error');
        this.socket.off('rdp:connected');
        this.socket.off('rdp:disconnected');

        // Add new listeners
        this.socket.on('rdp:display', onData);

        // Handle error - backend sends {message: string}
        this.socket.on('rdp:error', (data: { message: string } | string) => {
            const errorMessage = typeof data === 'string' ? data : data.message;
            onError(errorMessage);
        });

        this.socket.on('rdp:connected', () => {
            console.log(`✓ RDP connected to server ${serverId}`);
        });

        this.socket.on('rdp:disconnected', () => {
            console.log(`✗ RDP disconnected from server ${serverId}`);
        });

        // Emit connection request AFTER setting up listeners
        this.socket.emit('rdp:connect', { serverId });
    }

    sendRDPInput(data: { type: string; payload: any }) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.emit('rdp:input', data);
    }

    sendRDPResize(width: number, height: number) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.emit('rdp:resize', { width, height });
    }

    disconnectRDP(serverId: string) {
        if (!this.socket) return;

        this.socket.emit('rdp:disconnect', { serverId });

        // Remove all RDP listeners
        this.socket.off('rdp:display');
        this.socket.off('rdp:error');
        this.socket.off('rdp:connected');
        this.socket.off('rdp:disconnected');
    }

    // Claude Terminal namespace
    connectClaudeTerminal(onData: (data: string) => void, onError: (error: string) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.off('claude:data');
        this.socket.off('claude:error');

        this.socket.on('claude:data', onData);
        this.socket.on('claude:error', (data: { message: string } | string) => {
            const errorMessage = typeof data === 'string' ? data : data.message;
            onError(errorMessage);
        });

        this.socket.emit('claude:connect');
    }

    sendClaudeInput(data: string) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.emit('claude:input', data);
    }

    resizeClaudeTerminal(cols: number, rows: number) {
        if (!this.socket) return;
        this.socket.emit('claude:resize', { cols, rows });
    }

    // Metrics namespace
    subscribeMetrics(callback: (data: any) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.on('metrics:update', callback);
    }

    unsubscribeMetrics() {
        if (!this.socket) return;
        this.socket.off('metrics:update');
    }

    // Logs namespace
    subscribeLogs(callback: (log: any) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.on('logs:new', callback);
    }

    unsubscribeLogs() {
        if (!this.socket) return;
        this.socket.off('logs:new');
    }

    // Notifications namespace
    subscribeNotifications(callback: (notification: any) => void) {
        if (!this.socket) {
            throw new Error('WebSocket not connected');
        }

        this.socket.on('notification:new', callback);
    }

    unsubscribeNotifications() {
        if (!this.socket) return;
        this.socket.off('notification:new');
    }
}

export const wsService = new WebSocketService();
