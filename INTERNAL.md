# INTERNAL NOTES — Zero45 Dashboard (0.1.0)

Use this as the single source of truth for what exists, what is missing, and where to touch code. No marketing fluff.

## Current State
- Proxmox: cluster resources/metrics/actions (nodes, VMs, LXC) via token or pvesh fallback when local; host watts via RAPL (FACTOR/OFFSET) and sensors fallback.
- Host metrics: background sampler every 5s with in-memory history; `/api/host/metrics` returns `{latest, history}`.
- UI: Proxmox page with stacked area charts, disk MB/s, VMs split online/offline, metrics only for running resources, auto-refresh 5s.
- SSH Gateway: xterm.js, persistent sessions, encrypted secrets.
- RDP/Guacamole: CRUD + browser streaming.
- Auth: JWT login/register, basic shell.
- Service scripts: `start.sh`, `stop.sh`, `restart.sh` delegate to `zero45-dashboard.service`.

## Hot Spots / Where Things Live
- Proxmox backend: `backend/src/modules/proxmox/*` (pvesh fallback in `proxmox.service.ts`).
- Host metrics & watts: `backend/src/modules/host/host.service.ts` (sampler, RAPL, sensors).
- Frontend Proxmox UI: `frontend/src/pages/Proxmox.tsx`.
- Config: `backend/config.json` (example in `backend/config.example.json`).
- Scripts: `start.sh`, `stop.sh`, `restart.sh`.

## Immediate Gaps / Fix Soon
- Auth hardening: refresh token rotation, rate limiting on login, optional 2FA.
- Persistence: DB schemas/migrations for users, sessions, saved resources (SSH/RDP/Proxmox).
- Proxmox UI: add filters/sorting; handle empty/error states cleanly; reduce heavy polling if backend load is an issue.
- Logging/observability: structured logs, consistent error messages to frontend, ensure CORS list matches deployment.
- Watts display: ensure RAPL readable in prod (permissions); allow factor/offset via env.
- Push pipeline: add CI (lint/test/build) before releases; Docker/Compose.

## Backend TODO (condensed)
- Add Prisma/TypeORM models for User, RefreshToken, Session, SSHServer, RDPServer, ProxmoxConfig, AuditLog.
- JWT refresh flow + 2FA (TOTP) hooks; password reset.
- Alerts MVP: threshold on host/Proxmox metrics, channels email/Discord/Telegram.
- Metrics storage: optional Timescale/Influx for longer history; API endpoints to query ranges.
- Monitoring checks: ICMP/HTTP/TCP with schedules; status page basics.
- API testing module: request collections, env vars, saved responses.
- Automation: scheduled jobs (cron) and simple playbooks (SSH/API).

## Frontend TODO (condensed)
- Proxmox UX: filter/search, sort by status/node; better error toasts; skeleton loading.
- Charts: time range selector tied to backend; legends/units per metric; allow toggling streams.
- SSH/RDP UI: connection feedback, recent history list, copy masked secrets, better mobile layout.
- Auth UI: 2FA setup/entry, session list, password reset.
- Forms: zod schemas + RHF, consistent toast patterns.

## DevOps TODO
- Docker/Compose for backend+frontend+guacd; configurable envs.
- CI: lint, typecheck, tests, build artifacts.
- Systemd/service healthchecks; log rotation config aligned with app logs.
- Secrets handling: env files templates, avoid hardcoded tokens; feature flags.

## Notes & Assumptions
- Proxmox tokenless only works local (pvesh); otherwise set `PROXMOX_TOKEN_ID/SECRET`.
- Watts formula uses constants in `host.service.ts` (POWER_FACTOR/OFFSET). Change there or add env overrides.
- Frontend polls `/api/proxmox/resources` and `/api/host/metrics` every 5s; adjust if needed.
- Large archives: `backup.zip` includes .git/node_modules; regenerate if stale.
