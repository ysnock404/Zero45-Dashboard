import type { Server as HttpServer } from 'http';
import { configManager } from '../../shared/config/config';
import { logger } from '../../shared/utils/logger';

// guacamole-lite is CommonJS; require to avoid type issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GuacamoleLite = require('guacamole-lite');

let guacInstance: any | null = null;

export function setupGuacamoleServer(httpServer: HttpServer) {
    if (guacInstance) {
        return guacInstance;
    }

    const guacConfig = configManager.getGuacamoleConfig();

    guacInstance = new GuacamoleLite(
        {
            server: httpServer,
            path: '/guac',
        },
        {
            host: guacConfig.host,
            port: guacConfig.port,
        },
        {
            crypt: {
                cypher: 'AES-256-CBC',
                key: guacConfig.encryptionKey,
            },
            log: {
                level: 'NORMAL',
                stdLog: (msg: string) => logger.info(msg),
                errorLog: (msg: string) => logger.error(msg),
            },
        }
    );

    logger.info(`✓ Guacamole bridge ready on ws path /guac -> guacd ${guacConfig.host}:${guacConfig.port}`);

    return guacInstance;
}
