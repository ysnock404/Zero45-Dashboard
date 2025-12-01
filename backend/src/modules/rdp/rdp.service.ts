import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { configManager } from '../../shared/config/config';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

interface RDPServer {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    domain?: string;
    status: 'online' | 'offline' | 'connecting';
    lastConnected?: string;
    tags?: string[];
}

// Persistent storage file
const STORAGE_FILE = path.join(process.cwd(), 'data', 'rdp-servers.json');

// Ensure data directory exists
const ensureDataDir = () => {
    const dataDir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Load servers from file
const loadServersFromFile = (): RDPServer[] => {
    try {
        ensureDataDir();
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        logger.error('Failed to load RDP servers from file:', error);
    }
    return [];
};

// Save servers to file
const saveServersToFile = (servers: RDPServer[]) => {
    try {
        ensureDataDir();
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(servers, null, 2), 'utf-8');
    } catch (error) {
        logger.error('Failed to save RDP servers to file:', error);
    }
};

// In-memory servers (loaded from file on startup)
const rdpServers: RDPServer[] = loadServersFromFile();

interface RDPSession {
    serverId: string;
    connected: boolean;
    connectedAt: Date;
}

class RDPService {
    private sessions: Map<string, RDPSession> = new Map();

    // Update server status and persist
    private updateServerStatus(id: string, status: 'online' | 'offline' | 'connecting', lastConnected?: string) {
        const server = rdpServers.find((s) => s.id === id);
        if (server) {
            server.status = status;
            if (lastConnected) {
                server.lastConnected = lastConnected;
            }
            // Don't persist status changes as they're runtime state
            // Only persist on create/update/delete
        }
    }

    // Encryption/Decryption helpers
    private encrypt(text: string): string {
        const config = configManager.getSSHConfig();
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(config.encryptionKey.padEnd(32, '0').slice(0, 32));
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(text: string): string {
        const config = configManager.getSSHConfig();
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(config.encryptionKey.padEnd(32, '0').slice(0, 32));

        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    async getServers(): Promise<RDPServer[]> {
        // Return servers without sensitive data
        // Always return status as 'offline' since status is runtime state, not persisted
        return rdpServers.map((server) => ({
            ...server,
            password: undefined,
            status: 'offline' as const,
        }));
    }

    async getServer(id: string): Promise<RDPServer | null> {
        const server = rdpServers.find((s) => s.id === id);
        if (!server) return null;

        return {
            ...server,
            password: undefined,
            status: 'offline' as const,
        };
    }

    async createServer(data: Partial<RDPServer>): Promise<RDPServer> {
        const newServer: RDPServer = {
            id: String(Date.now()), // Use timestamp for unique ID
            name: data.name || 'New RDP Server',
            host: data.host || '',
            port: data.port || 3389,
            username: data.username || 'Administrator',
            password: data.password ? this.encrypt(data.password) : undefined,
            domain: data.domain || '',
            status: 'offline',
            tags: data.tags || [],
        };

        rdpServers.push(newServer);
        saveServersToFile(rdpServers);

        return {
            ...newServer,
            password: undefined,
        };
    }

    async updateServer(id: string, data: Partial<RDPServer>): Promise<RDPServer> {
        const index = rdpServers.findIndex((s) => s.id === id);
        if (index === -1) {
            throw new AppError('Server not found', 404);
        }

        const updated = {
            ...rdpServers[index],
            ...data,
            password: data.password ? this.encrypt(data.password) : rdpServers[index].password,
        };

        rdpServers[index] = updated;
        saveServersToFile(rdpServers);

        return {
            ...updated,
            password: undefined,
        };
    }

    async deleteServer(id: string): Promise<void> {
        const index = rdpServers.findIndex((s) => s.id === id);
        if (index === -1) {
            throw new AppError('Server not found', 404);
        }

        // Remove session if exists
        this.sessions.delete(id);

        rdpServers.splice(index, 1);
        saveServersToFile(rdpServers);
    }

    async testConnection(id: string): Promise<{ success: boolean; message: string }> {
        const server = rdpServers.find((s) => s.id === id);
        if (!server) {
            throw new AppError('Server not found', 404);
        }

        // Simple TCP ping to check if RDP port is open (much faster than full RDP handshake)
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = 3000; // 3 second timeout

            const timeoutHandle = setTimeout(() => {
                socket.destroy();
                resolve({
                    success: false,
                    message: 'Connection timeout',
                });
            }, timeout);

            socket.on('connect', () => {
                clearTimeout(timeoutHandle);
                socket.destroy();
                resolve({
                    success: true,
                    message: 'RDP port is open',
                });
            });

            socket.on('error', (err) => {
                clearTimeout(timeoutHandle);
                socket.destroy();
                resolve({
                    success: false,
                    message: err.message,
                });
            });

            socket.connect(server.port, server.host);
        });
    }

    // Session management
    createSession(serverId: string): void {
        this.sessions.set(serverId, {
            serverId,
            connected: true,
            connectedAt: new Date(),
        });
        this.updateServerStatus(serverId, 'online', new Date().toISOString());
    }

    getSession(serverId: string): RDPSession | undefined {
        return this.sessions.get(serverId);
    }

    removeSession(serverId: string): void {
        this.sessions.delete(serverId);
        this.updateServerStatus(serverId, 'offline');
    }

    getActiveSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    getServerMeta(id: string): Pick<RDPServer, 'id' | 'name' | 'host' | 'port' | 'username' | 'domain'> | null {
        const server = rdpServers.find((s) => s.id === id);
        if (!server) return null;
        return {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            username: server.username,
            domain: server.domain,
        };
    }

    // Get server credentials for connection (decrypted)
    async getServerCredentials(id: string): Promise<{ username: string; password: string; domain?: string } | null> {
        const server = rdpServers.find((s) => s.id === id);
        if (!server) return null;

        return {
            username: server.username,
            password: server.password ? this.decrypt(server.password) : '',
            domain: server.domain,
        };
    }

    generateGuacToken(id: string, options?: { width?: number; height?: number; dpi?: number }): string {
        const server = rdpServers.find((s) => s.id === id);
        if (!server) {
            throw new AppError('Server not found', 404);
        }

        const guacConfig = configManager.getGuacamoleConfig();
        const cipherKey = Buffer.from(guacConfig.encryptionKey);

        const width = options?.width || 1280;
        const height = options?.height || 720;
        const dpi = options?.dpi || 96;

        const tokenObject = {
            connection: {
                type: 'rdp',
                settings: {
                    hostname: server.host,
                    port: server.port || 3389,
                    username: server.username,
                    password: server.password ? this.decrypt(server.password) : '',
                    domain: server.domain || '',
                    // Let guacd negotiate (NLA/TLS/standard)
                    security: 'any',
                    'ignore-cert': true,
                    // Conservative visuals to reduce blank-screen issues while keeping caches on
                    'enable-wallpaper': false,
                    'enable-theming': false,
                    // Graphics pipeline on Windows requires 32bpp; stay explicit and disable GFX to avoid black screen
                    'disable-gfx': true,
                    'disable-audio': true,
                    'color-depth': 32,
                    width,
                    height,
                    dpi,
                    audio: ['audio/L16'],
                    image: ['image/png', 'image/jpeg'],
                },
            },
        };

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);

        let encrypted = cipher.update(JSON.stringify(tokenObject), 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const payload = {
            iv: iv.toString('base64'),
            value: encrypted,
        };

        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
}

export const rdpService = new RDPService();
