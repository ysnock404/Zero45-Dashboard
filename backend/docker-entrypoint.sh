#!/bin/sh
set -e

echo "[entrypoint] preparing Zero45 backend..."
mkdir -p /app/data

# Generate runtime config.json from environment
node gen-config.js

# Sync DB schema (creates SQLite file in the persistent volume on first run)
npx prisma db push --skip-generate

# Seed admin user + demo agency data only if missing (idempotent)
npx tsx prisma/seed-prod.ts || echo "[entrypoint] seed skipped/failed (non-fatal)"

echo "[entrypoint] starting server on :${PORT:-9031}"
exec npx tsx src/server.ts
