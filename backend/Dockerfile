# ---- Zero45 Dashboard · Backend (Node 22 + Prisma/SQLite) ----
FROM node:22-alpine

WORKDIR /app

# Prisma engines need openssl on Alpine; python3/make/g++ needed to build
# node-pty's native addon (no prebuilt binary for linux-arm64); claude CLI
# is installed globally so the assistant terminal module can spawn it.
RUN apk add --no-cache openssl python3 make g++ \
    && npm install -g @anthropic-ai/claude-code

# Install deps (inc. devDeps: needed for tsc build + tsx seeds)
COPY backend/package*.json ./
RUN npm ci

# App source
COPY backend/ ./

# Generate Prisma client (musl engine). Runtime uses tsx (no tsc gate; matches dev).
ENV DATABASE_URL="file:/app/data/dev.db"
RUN npx prisma generate

# Skip claude's first-run onboarding wizard (theme/trust/login-method prompts) —
# auth itself comes from CLAUDE_CODE_OAUTH_TOKEN at runtime, not this file.
RUN mkdir -p /root && cp docker-claude-config.json /root/.claude.json

ENV NODE_ENV=production
ENV PORT=9031
EXPOSE 9031

RUN chmod +x docker-entrypoint.sh
CMD ["sh", "docker-entrypoint.sh"]
