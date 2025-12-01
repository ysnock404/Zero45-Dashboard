import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Zod schema for config validation
const ConfigSchema = z.object({
    server: z.object({
        port: z.number(),
        host: z.string(),
        corsOrigins: z.array(z.string()),
    }),
    database: z.object({
        postgresql: z.object({
            host: z.string(),
            port: z.number(),
            database: z.string(),
            username: z.string(),
            password: z.string(),
        }),
        redis: z.object({
            host: z.string(),
            port: z.number(),
            password: z.string().optional(),
        }),
    }),
    auth: z.object({
        jwtSecret: z.string(),
        jwtRefreshSecret: z.string(),
        jwtExpiresIn: z.string(),
        jwtRefreshExpiresIn: z.string(),
        bcryptRounds: z.number(),
        sessionDuration: z.number(),
    }),
    ssh: z.object({
        maxConcurrentConnections: z.number(),
        connectionTimeout: z.number(),
        keepaliveInterval: z.number(),
        encryptionKey: z.string(),
    }),
    monitoring: z.object({
        defaultCheckInterval: z.number(),
        defaultTimeout: z.number(),
        retentionDays: z.number(),
    }),
    alerts: z.object({
        evaluationInterval: z.number(),
        debounceTime: z.number(),
        channels: z.object({
            email: z.object({
                enabled: z.boolean(),
                smtp: z.object({
                    host: z.string(),
                    port: z.number(),
                    secure: z.boolean(),
                    auth: z.object({
                        user: z.string(),
                        pass: z.string(),
                    }),
                }),
                from: z.string(),
            }),
            slack: z.object({
                enabled: z.boolean(),
                webhookUrl: z.string(),
            }),
            discord: z.object({
                enabled: z.boolean(),
                webhookUrl: z.string(),
            }),
            telegram: z.object({
                enabled: z.boolean(),
                botToken: z.string(),
                chatId: z.string(),
            }),
        }),
    }),
    logs: z.object({
        level: z.string(),
        retentionDays: z.number(),
        maxFileSize: z.string(),
        maxFiles: z.string(),
    }),
    rateLimit: z.object({
        windowMs: z.number(),
        max: z.number(),
    }),
    features: z.object({
        registration: z.boolean(),
        twoFactor: z.boolean(),
        apiTesting: z.boolean(),
        automation: z.boolean(),
    }),
    proxmox: z.object({
        baseUrl: z.string(),
        tokenId: z.string(),
        tokenSecret: z.string(),
        verifySsl: z.boolean().default(true),
    }),
    guacamole: z.object({
        host: z.string(),
        port: z.number(),
        encryptionKey: z.string(),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
    private config: Config | null = null;
    private configPath: string;

    constructor() {
        this.configPath = path.join(process.cwd(), 'config.json');
    }

    load(): Config {
        if (this.config) {
            return this.config;
        }

        try {
            const configFile = fs.readFileSync(this.configPath, 'utf-8');
            const configData = JSON.parse(configFile);

            // Validate config with Zod
            this.config = ConfigSchema.parse(configData);

            console.log('✓ Configuration loaded successfully from config.json');
            return this.config;
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('❌ Configuration validation error:', error.errors);
                throw new Error('Invalid configuration file. Please check config.json');
            }

            console.error('❌ Error loading configuration:', error);
            throw new Error('Failed to load configuration file');
        }
    }

    get(): Config {
        if (!this.config) {
            return this.load();
        }
        return this.config;
    }

    reload(): Config {
        this.config = null;
        return this.load();
    }

    // Helper methods for specific config sections
    getServerConfig() {
        return this.get().server;
    }

    getDatabaseConfig() {
        return this.get().database;
    }

    getAuthConfig() {
        return this.get().auth;
    }

    getSSHConfig() {
        return this.get().ssh;
    }

    getMonitoringConfig() {
        return this.get().monitoring;
    }

    getAlertsConfig() {
        return this.get().alerts;
    }

    getLogsConfig() {
        return this.get().logs;
    }

    getRateLimitConfig() {
        return this.get().rateLimit;
    }

    getFeaturesConfig() {
        return this.get().features;
    }

    getProxmoxConfig() {
        return this.get().proxmox;
    }

    getGuacamoleConfig() {
        return this.get().guacamole;
    }
}

export const configManager = new ConfigManager();
