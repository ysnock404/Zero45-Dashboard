// Generates config.json at container start from environment variables,
// based on config.example.json (keeps Zod schema valid).
const fs = require('fs');
const path = require('path');

const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.example.json'), 'utf8'));

base.server.port = Number(process.env.PORT || 9031);
base.server.host = '0.0.0.0';

const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
base.server.corsOrigins = Array.from(new Set([...(base.server.corsOrigins || []), ...envOrigins]));

if (process.env.JWT_SECRET) base.auth.jwtSecret = process.env.JWT_SECRET;
if (process.env.JWT_REFRESH_SECRET) base.auth.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
if (process.env.ENCRYPTION_KEY) base.ssh.encryptionKey = process.env.ENCRYPTION_KEY.slice(0, 32);

fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(base, null, 2));
console.log('[gen-config] config.json written (origins: ' + base.server.corsOrigins.join(', ') + ')');
