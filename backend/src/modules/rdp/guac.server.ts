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

    // IMPORTANT: run guacamole-lite's ws server in `noServer` mode instead of
    // handing it the httpServer directly. When ws (v8) is attached via
    // `{ server, path }`, its upgrade handler calls handleUpgrade() on EVERY
    // upgrade and aborts with a 400 any request whose path isn't `/guac` —
    // including Socket.IO's own `/socket.io/` WebSocket upgrades. That silently
    // broke the WebSocket transport for the whole app (SSH, RDP status, and the
    // Claude terminal), forcing Socket.IO down to long-polling, which in turn
    // falls apart behind Cloudflare. Routing upgrades by path ourselves lets
    // guacd and Socket.IO share the HTTP server cleanly.
    // NB: `server: undefined` is deliberate. guacamole-lite only honours our
    // ws options verbatim when the object *has* a `server` key; otherwise it
    // injects a default `port: 8080`, which then collides with `noServer` and
    // makes ws throw. Keeping the key present (but undefined) lets `noServer`
    // through untouched.
    guacInstance = new GuacamoleLite(
        { server: undefined, noServer: true },
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

    httpServer.on('upgrade', (req, socket, head) => {
        const url = req.url || '';
        // Only claim /guac upgrades; leave everything else (notably
        // /socket.io/) for Socket.IO's own upgrade listener.
        if (url.startsWith('/guac')) {
            guacInstance.webSocketServer.handleUpgrade(req, socket, head, (ws: any) => {
                guacInstance.webSocketServer.emit('connection', ws, req);
            });
        }
    });

    logger.info(`✓ Guacamole bridge ready on ws path /guac -> guacd ${guacConfig.host}:${guacConfig.port}`);

    return guacInstance;
}
