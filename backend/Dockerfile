# ---- Zero45 Dashboard · Backend (Node 22 + Prisma/SQLite) ----
FROM node:22-alpine

WORKDIR /app

# Prisma engines need openssl on Alpine
RUN apk add --no-cache openssl

# Install deps (inc. devDeps: needed for tsc build + tsx seeds)
COPY backend/package*.json ./
RUN npm ci

# App source
COPY backend/ ./

# Generate Prisma client (musl engine). Runtime uses tsx (no tsc gate; matches dev).
ENV DATABASE_URL="file:/app/data/dev.db"
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=9031
EXPOSE 9031

RUN chmod +x docker-entrypoint.sh
CMD ["sh", "docker-entrypoint.sh"]
