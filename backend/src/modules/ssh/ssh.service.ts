import { Client } from 'ssh2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { configManager } from '../../shared/config/config';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

interface SSHServer {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    status: 'online' | 'offline' | 'connecting';
    lastConnected?: string;
    tags?: string[];
}

// Persistent storage file
const STORAGE_FILE = path.join(process.cwd(), 'data', 'ssh-servers.json');

// Ensure data directory exists
const ensureDataDir = () => {
    const dataDir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Load servers from file
const loadServersFromFile = (): SSHServer[] => {
    try {
        ensureDataDir();
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        logger.error('Failed to load servers from file:', error);
    }
    return [];
};

// Save servers to file
const saveServersToFile = (servers: SSHServer[]) => {
    try {
        ensureDataDir();
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(servers, null, 2), 'utf-8');
    } catch (error) {
        logger.error('Failed to save servers to file:', error);
    }
};

// In-memory servers (loaded from file on startup)
const mockServers: SSHServer[] = loadServersFromFile();

interface SSHSession {
    connection: Client;
    stream: any;
    history: string[];
    maxHistoryLines: number;
}

class SSHService {
    private connections: Map<string, Client> = new Map();
    private sessions: Map<string, SSHSession> = new Map();

    // Update server status and persist
    private updateServerStatus(id: string, status: 'online' | 'offline' | 'connecting', lastConnected?: string) {
        const server = mockServers.find((s) => s.id === id);
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

    async getServers(): Promise<SSHServer[]> {
        // Return servers without sensitive data
        // Always return status as 'offline' since status is runtime state, not persisted
        return mockServers.map((server) => ({
            ...server,
            password: undefined,
            privateKey: undefined,
            status: 'offline' as const,
        }));
    }

    async getServer(id: string): Promise<SSHServer | null> {
        const server = mockServers.find((s) => s.id === id);
        if (!server) return null;

        return {
            ...server,
            password: undefined,
            privateKey: undefined,
            status: 'offline' as const,
        };
    }

    async createServer(data: Partial<SSHServer>): Promise<SSHServer> {
        const newServer: SSHServer = {
            id: String(Date.now()), // Use timestamp for unique ID
            name: data.name || 'New Server',
            host: data.host || '',
            port: data.port || 22,
            username: data.username || 'root',
            password: data.password ? this.encrypt(data.password) : undefined,
            privateKey: data.privateKey ? this.encrypt(data.privateKey) : undefined,
            status: 'offline',
            tags: data.tags || [],
        };

        mockServers.push(newServer);
        saveServersToFile(mockServers);

        return {
            ...newServer,
            password: undefined,
            privateKey: undefined,
        };
    }

    async updateServer(id: string, data: Partial<SSHServer>): Promise<SSHServer> {
        const index = mockServers.findIndex((s) => s.id === id);
        if (index === -1) {
            throw new AppError('Server not found', 404);
        }

        const updated = {
            ...mockServers[index],
            ...data,
            password: data.password ? this.encrypt(data.password) : mockServers[index].password,
            privateKey: data.privateKey ? this.encrypt(data.privateKey) : mockServers[index].privateKey,
        };

        mockServers[index] = updated;
        saveServersToFile(mockServers);

        return {
            ...updated,
            password: undefined,
            privateKey: undefined,
        };
    }

    async deleteServer(id: string): Promise<void> {
        const index = mockServers.findIndex((s) => s.id === id);
        if (index === -1) {
            throw new AppError('Server not found', 404);
        }

        // Close connection if exists
        const connection = this.connections.get(id);
        if (connection) {
            connection.end();
            this.connections.delete(id);
        }

        mockServers.splice(index, 1);
        saveServersToFile(mockServers);
    }

    async testConnection(id: string): Promise<{ success: boolean; message: string }> {
        const server = mockServers.find((s) => s.id === id);
        if (!server) {
            throw new AppError('Server not found', 404);
        }

        // Simple TCP ping to check if port is open (much faster than SSH handshake)
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
                    message: 'Port is open',
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

    async connect(id: string): Promise<Client> {
        const server = mockServers.find((s) => s.id === id);
        if (!server) {
            throw new AppError('Server not found', 404);
        }

        // Check if already connected
        const existing = this.connections.get(id);
        if (existing) {
            return existing;
        }

        const conn = new Client();
        const config = configManager.getSSHConfig();

        return new Promise((resolve, reject) => {
            conn
                .on('ready', () => {
                    logger.info(`SSH connected to ${server.name}`);
                    this.connections.set(id, conn);
                    this.updateServerStatus(id, 'online', new Date().toISOString());
                    resolve(conn);
                })
                .on('error', (err) => {
                    logger.error(`SSH connection error for ${server.name}:`, err);
                    this.updateServerStatus(id, 'offline');
                    reject(err);
                })
                .on('close', () => {
                    logger.info(`SSH disconnected from ${server.name}`);
                    this.connections.delete(id);
                    this.updateServerStatus(id, 'offline');
                })
                .connect({
                    host: server.host,
                    port: server.port,
                    username: server.username,
                    password: server.password ? this.decrypt(server.password) : undefined,
                    privateKey: server.privateKey ? this.decrypt(server.privateKey) : undefined,
                    readyTimeout: config.connectionTimeout,
                    keepaliveInterval: config.keepaliveInterval,
                });
        });
    }

    disconnect(id: string): void {
        const conn = this.connections.get(id);
        if (conn) {
            conn.end();
            this.connections.delete(id);
        }
    }

    getConnection(id: string): Client | undefined {
        return this.connections.get(id);
    }

    // Session management methods
    createSession(id: string, connection: Client, stream: any): void {
        this.sessions.set(id, {
            connection,
            stream,
            history: [],
            maxHistoryLines: 1000, // Keep last 1000 lines
        });
    }

    getSession(id: string): SSHSession | undefined {
        return this.sessions.get(id);
    }

    addToHistory(id: string, data: string): void {
        const session = this.sessions.get(id);
        if (session) {
            session.history.push(data);
            // Keep only last maxHistoryLines
            if (session.history.length > session.maxHistoryLines) {
                session.history = session.history.slice(-session.maxHistoryLines);
            }
        }
    }

    getHistory(id: string): string[] {
        const session = this.sessions.get(id);
        return session ? session.history : [];
    }

    removeSession(id: string): void {
        this.sessions.delete(id);
    }

    getActiveSessions(): string[] {
        return Array.from(this.sessions.keys());
    }
}

export const sshService = new SSHService();
