# 📋 TODO Backend - ysnockserver Dashboard

## 🎯 Stack Tecnológica Backend

- **Runtime:** Node.js 20+ com TypeScript
- **Framework:** Express.js ou Fastify
- **Database:** PostgreSQL (principal) + Redis (cache/sessions)
- **Time-Series DB:** InfluxDB ou TimescaleDB (métricas)
- **ORM:** Prisma
- **WebSocket:** Socket.io
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **SSH:** ssh2 library
- **Database Clients:** pg, mysql2, mongodb, ioredis

---

## 📦 TODO BACKEND COMPLETO

### 1. SETUP INICIAL

#### 1.1 Projeto Base
- [ ] Criar pasta `/backend`
- [ ] Inicializar npm/pnpm (`npm init -y`)
- [ ] Configurar TypeScript
  - [ ] `tsconfig.json` com strict mode
  - [ ] Path aliases (@modules, @shared, @config)
- [ ] Configurar ESLint + Prettier
- [ ] Setup nodemon para dev
- [ ] Configurar scripts no package.json:
  - [ ] `dev` (nodemon)
  - [ ] `build` (tsc)
  - [ ] `start` (node dist)
  - [ ] `lint`
  - [ ] `test`

#### 1.2 Estrutura de Pastas
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── ssh/
│   │   ├── database/
│   │   ├── api/
│   │   ├── monitoring/
│   │   ├── metrics/
│   │   ├── logs/
│   │   ├── alerts/
│   │   └── automation/
│   ├── shared/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   └── server.ts
├── tests/
├── .env.example
└── package.json
```
- [ ] Criar estrutura completa de pastas

#### 1.3 Dependências Core
- [ ] express ou fastify
- [ ] typescript, @types/node, @types/express
- [ ] dotenv
- [ ] cors
- [ ] helmet (security headers)
- [ ] compression
- [ ] morgan (logging HTTP)
- [ ] winston ou pino (logging)
- [ ] zod (validation)
- [ ] prisma
- [ ] socket.io
- [ ] jsonwebtoken, @types/jsonwebtoken
- [ ] bcrypt, @types/bcrypt
- [ ] axios
- [ ] date-fns

#### 1.4 Environment Variables
- [ ] Criar `.env.example` com:
  - [ ] NODE_ENV
  - [ ] PORT
  - [ ] DATABASE_URL (PostgreSQL)
  - [ ] REDIS_URL
  - [ ] JWT_SECRET
  - [ ] JWT_REFRESH_SECRET
  - [ ] JWT_EXPIRES_IN
  - [ ] CORS_ORIGIN
  - [ ] INFLUXDB_URL (opcional)
  - [ ] SMTP_* (email config)
- [ ] Config loader em `src/shared/config/env.ts`
- [ ] Validação com Zod

---

### 2. SERVER & MIDDLEWARE SETUP

#### 2.1 Express/Fastify App
- [ ] Criar `src/server.ts`
- [ ] Setup express app
- [ ] Configurar middlewares globais:
  - [ ] cors
  - [ ] helmet
  - [ ] compression
  - [ ] express.json()
  - [ ] express.urlencoded()
  - [ ] morgan (HTTP logging)
- [ ] Error handling middleware global
- [ ] 404 handler
- [ ] Health check endpoint (`/health`)

#### 2.2 Middleware Customizados
- [ ] **authMiddleware** (JWT verification)
- [ ] **roleMiddleware** (RBAC - role-based access)
- [ ] **rateLimitMiddleware** (express-rate-limit)
- [ ] **validateMiddleware** (Zod schema validation)
- [ ] **errorHandlerMiddleware** (catch-all errors)
- [ ] **requestLoggerMiddleware** (log requests)
- [ ] **corsMiddleware** (dynamic CORS)

#### 2.3 Logging System
- [ ] Configurar Winston ou Pino
- [ ] Log levels (error, warn, info, debug)
- [ ] File transports (logs/error.log, logs/combined.log)
- [ ] Console transport (dev only)
- [ ] Structured logging (JSON format)
- [ ] Request ID tracking
- [ ] Log rotation (winston-daily-rotate-file)

---

### 3. DATABASE SETUP

#### 3.1 PostgreSQL + Prisma
- [ ] Instalar Prisma (`prisma`, `@prisma/client`)
- [ ] `npx prisma init`
- [ ] Configurar `schema.prisma`
- [ ] Definir datasource (PostgreSQL)
- [ ] Definir generator (Prisma Client)

#### 3.2 Prisma Schema - Models
- [ ] **User Model**
  - id, email, password (hashed), name, role, avatar
  - emailVerified, twoFactorEnabled, twoFactorSecret
  - createdAt, updatedAt
- [ ] **RefreshToken Model**
  - id, token, userId, expiresAt, createdAt
- [ ] **Session Model**
  - id, userId, token, ipAddress, userAgent, expiresAt
- [ ] **SSHServer Model**
  - id, userId, name, host, port, username, authMethod
  - encryptedPassword, encryptedPrivateKey, tags
  - status, lastConnectedAt, createdAt, updatedAt
- [ ] **DatabaseConnection Model**
  - id, userId, name, type (enum), host, port, database
  - username, encryptedPassword, sslEnabled
  - status, createdAt, updatedAt
- [ ] **MonitoringService Model**
  - id, userId, name, type (HTTP, TCP, Ping, SSL)
  - url, port, checkInterval, timeout
  - expectedStatus, status, lastCheckAt, createdAt
- [ ] **MonitoringCheck Model**
  - id, serviceId, status, responseTime, statusCode
  - errorMessage, checkedAt
- [ ] **Incident Model**
  - id, serviceId, title, description, severity, status
  - createdAt, resolvedAt, updatedAt
- [ ] **Alert Model**
  - id, userId, name, description, metricSource
  - condition, threshold, severity, enabled
  - createdAt, updatedAt
- [ ] **AlertHistory Model**
  - id, alertId, triggered, value, notifiedAt
- [ ] **NotificationChannel Model**
  - id, userId, type (Email, Slack, etc), name
  - config (JSON), enabled, createdAt
- [ ] **Workflow Model**
  - id, userId, name, description, definition (JSON)
  - enabled, lastRunAt, createdAt, updatedAt
- [ ] **WorkflowExecution Model**
  - id, workflowId, status, startedAt, completedAt
  - logs (JSON), error
- [ ] **APICollection Model**
  - id, userId, name, description, requests (JSON)
  - createdAt, updatedAt
- [ ] **APIRequest Model**
  - id, collectionId, name, method, url, headers
  - body, params, createdAt
- [ ] **AuditLog Model**
  - id, userId, action, resource, metadata (JSON)
  - ipAddress, userAgent, createdAt

#### 3.3 Migrations
- [ ] Criar migration inicial (`npx prisma migrate dev`)
- [ ] Script de migration para production
- [ ] Rollback strategy

#### 3.4 Seeds
- [ ] Seed de user admin default
- [ ] Seed de dados de exemplo (opcional)
- [ ] Script `npm run seed`

#### 3.5 Redis Setup
- [ ] Instalar ioredis
- [ ] Criar Redis client em `src/shared/config/redis.ts`
- [ ] Connection handling
- [ ] Error handling
- [ ] Health check

#### 3.6 InfluxDB/TimescaleDB (Métricas)
- [ ] Escolher entre InfluxDB ou TimescaleDB
- [ ] Setup connection
- [ ] Schema para métricas:
  - CPU, Memory, Disk usage
  - Response times
  - Request counts
  - Error rates
- [ ] Retention policies

---

### 4. AUTENTICAÇÃO & AUTORIZAÇÃO

#### 4.1 Auth Module Structure
```
modules/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.routes.ts
├── auth.validation.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── refresh.dto.ts
└── strategies/
    ├── jwt.strategy.ts
    └── local.strategy.ts
```

#### 4.2 Auth Endpoints
- [ ] `POST /auth/register`
  - Validação de input (Zod)
  - Hash password (bcrypt)
  - Criar user no DB
  - Return JWT + refresh token
- [ ] `POST /auth/login`
  - Validar credentials
  - Verificar password
  - Generate JWT + refresh token
  - Salvar session no Redis
  - Return tokens
- [ ] `POST /auth/logout`
  - Invalidar token no Redis
  - Remover session
- [ ] `POST /auth/refresh`
  - Validar refresh token
  - Generate novo access token
  - Return novo token
- [ ] `POST /auth/forgot-password`
  - Generate reset token
  - Send email
- [ ] `POST /auth/reset-password`
  - Validar reset token
  - Update password
- [ ] `GET /auth/me`
  - Return user info (protected)
- [ ] `POST /auth/2fa/setup`
  - Generate TOTP secret
  - Return QR code
- [ ] `POST /auth/2fa/verify`
  - Verify TOTP code
  - Enable 2FA
- [ ] `POST /auth/2fa/validate`
  - Validate 2FA during login

#### 4.3 JWT Implementation
- [ ] JWT service:
  - `generateAccessToken(userId, role)`
  - `generateRefreshToken(userId)`
  - `verifyToken(token)`
  - `decodeToken(token)`
- [ ] Token expiration (15min access, 7d refresh)
- [ ] Token blacklist (Redis)

#### 4.4 Password Hashing
- [ ] bcrypt rounds config (10-12)
- [ ] `hashPassword(password)`
- [ ] `comparePassword(password, hash)`

#### 4.5 RBAC (Role-Based Access Control)
- [ ] Roles enum: ADMIN, USER, VIEWER
- [ ] Role middleware: `requireRole(['ADMIN'])`
- [ ] Permissions check

#### 4.6 Session Management
- [ ] Store sessions no Redis
- [ ] Active sessions list per user
- [ ] Revoke session endpoint
- [ ] Session expiration

---

### 5. SSH MODULE

#### 5.1 SSH Module Structure
```
modules/ssh/
├── ssh.controller.ts
├── ssh.service.ts
├── ssh.routes.ts
├── ssh.validation.ts
├── ssh.gateway.ts (WebSocket)
└── dto/
    ├── create-server.dto.ts
    └── execute-command.dto.ts
```

#### 5.2 SSH Endpoints
- [ ] `GET /ssh/servers` - List user's servers
- [ ] `POST /ssh/servers` - Add new server
- [ ] `GET /ssh/servers/:id` - Get server details
- [ ] `PUT /ssh/servers/:id` - Update server
- [ ] `DELETE /ssh/servers/:id` - Delete server
- [ ] `POST /ssh/servers/:id/test` - Test connection
- [ ] `GET /ssh/servers/:id/status` - Check status
- [ ] `POST /ssh/execute` - Execute command (via WebSocket melhor)
- [ ] `GET /ssh/history` - Command history
- [ ] `POST /ssh/upload` - Upload file (SFTP)
- [ ] `POST /ssh/download` - Download file (SFTP)
- [ ] `GET /ssh/files` - List directory (SFTP)

#### 5.3 SSH Service (ssh2 library)
- [ ] SSH connection pool management
- [ ] `connect(serverId)` - Establish SSH connection
- [ ] `disconnect(connectionId)` - Close connection
- [ ] `executeCommand(connectionId, command)` - Run command
- [ ] `getConnectionStatus(serverId)` - Check if connected
- [ ] SFTP operations:
  - [ ] `listDirectory(path)`
  - [ ] `uploadFile(localPath, remotePath)`
  - [ ] `downloadFile(remotePath, localPath)`
  - [ ] `deleteFile(path)`
  - [ ] `createDirectory(path)`

#### 5.4 SSH WebSocket Gateway
- [ ] Socket.io namespace `/ssh`
- [ ] Events:
  - `connect-server` (client → server)
  - `disconnect-server`
  - `execute-command`
  - `terminal-data` (server → client, stream output)
  - `terminal-error`
  - `connection-status`
- [ ] Stream SSH output real-time
- [ ] Handle multiple concurrent sessions per user

#### 5.5 Security
- [ ] Encrypt SSH passwords/keys no DB (crypto)
- [ ] Decrypt on-the-fly quando conectar
- [ ] Validate SSH key format
- [ ] Audit log de comandos executados
- [ ] Rate limiting em execução de comandos

---

### 6. DATABASE MODULE

#### 6.1 Database Module Structure
```
modules/database/
├── database.controller.ts
├── database.service.ts
├── database.routes.ts
├── database.validation.ts
├── database.gateway.ts
├── connectors/
│   ├── postgres.connector.ts
│   ├── mysql.connector.ts
│   ├── mongodb.connector.ts
│   └── redis.connector.ts
└── dto/
```

#### 6.2 Database Endpoints
- [ ] `GET /database/connections` - List connections
- [ ] `POST /database/connections` - Add connection
- [ ] `GET /database/connections/:id` - Get details
- [ ] `PUT /database/connections/:id` - Update
- [ ] `DELETE /database/connections/:id` - Delete
- [ ] `POST /database/connections/:id/test` - Test connection
- [ ] `POST /database/query` - Execute query
- [ ] `GET /database/:id/schemas` - List schemas
- [ ] `GET /database/:id/tables` - List tables
- [ ] `GET /database/:id/table/:name/schema` - Get table schema
- [ ] `GET /database/:id/table/:name/data` - Get table data (paginated)
- [ ] `POST /database/:id/backup` - Create backup
- [ ] `GET /database/:id/backups` - List backups
- [ ] `POST /database/:id/restore` - Restore backup

#### 6.3 Database Connectors
- [ ] **PostgreSQL Connector** (pg library)
  - Connection pool
  - Query execution
  - Schema introspection
  - Backup (pg_dump wrapper)
- [ ] **MySQL Connector** (mysql2)
  - Connection pool
  - Query execution
  - Schema introspection
- [ ] **MongoDB Connector** (mongodb)
  - Connection
  - Query execution
  - Collections listing
- [ ] **Redis Connector** (ioredis)
  - Connection
  - Commands execution
  - Key listing

#### 6.4 Query Execution
- [ ] Parse SQL queries
- [ ] Validate queries (prevent DROP, DELETE without WHERE em prod)
- [ ] Execute with timeout
- [ ] Return results + metadata (rows affected, execution time)
- [ ] Query history logging
- [ ] Slow query detection

#### 6.5 Security
- [ ] Encrypt database passwords
- [ ] SQL injection prevention (prepared statements)
- [ ] Query validation/sanitization
- [ ] Permission checks (user pode executar queries?)
- [ ] Audit log de queries executadas

---

### 7. API TESTING MODULE

#### 7.1 API Module Structure
```
modules/api/
├── api.controller.ts
├── api.service.ts
├── api.routes.ts
├── api.validation.ts
└── dto/
```

#### 7.2 API Endpoints
- [ ] `GET /api/collections` - List collections
- [ ] `POST /api/collections` - Create collection
- [ ] `GET /api/collections/:id` - Get collection
- [ ] `PUT /api/collections/:id` - Update collection
- [ ] `DELETE /api/collections/:id` - Delete collection
- [ ] `POST /api/collections/:id/requests` - Add request to collection
- [ ] `POST /api/execute` - Execute HTTP request
- [ ] `GET /api/history` - Request history
- [ ] `GET /api/environments` - List environments
- [ ] `POST /api/environments` - Create environment
- [ ] `PUT /api/environments/:id` - Update environment
- [ ] `POST /api/webhooks` - Create webhook receiver
- [ ] `GET /api/webhooks/:id/history` - Webhook history

#### 7.3 HTTP Request Execution
- [ ] Use Axios para fazer requests
- [ ] Support all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc)
- [ ] Headers customizados
- [ ] Query params
- [ ] Body (JSON, form-data, raw, binary)
- [ ] File upload
- [ ] Authentication (Bearer, Basic, API Key)
- [ ] Timeout configuration
- [ ] Follow redirects
- [ ] Return: status, headers, body, time, size

#### 7.4 Environment Variables
- [ ] Variable substitution {{VAR}}
- [ ] Environment switching
- [ ] Global variables
- [ ] Collection variables

#### 7.5 Mock Server
- [ ] Create mock endpoints
- [ ] Response configuration
- [ ] Status code, delay simulation
- [ ] Enable/disable mocks

#### 7.6 Webhook Receiver
- [ ] Generate unique webhook URLs
- [ ] Receive POST requests
- [ ] Store webhook history
- [ ] Replay webhook

---

### 8. MONITORING MODULE

#### 8.1 Monitoring Module Structure
```
modules/monitoring/
├── monitoring.controller.ts
├── monitoring.service.ts
├── monitoring.routes.ts
├── monitoring.validation.ts
├── monitoring.scheduler.ts
├── checkers/
│   ├── http.checker.ts
│   ├── tcp.checker.ts
│   ├── ping.checker.ts
│   └── ssl.checker.ts
└── dto/
```

#### 8.2 Monitoring Endpoints
- [ ] `GET /monitoring/services` - List services
- [ ] `POST /monitoring/services` - Add service
- [ ] `GET /monitoring/services/:id` - Get service details
- [ ] `PUT /monitoring/services/:id` - Update service
- [ ] `DELETE /monitoring/services/:id` - Delete service
- [ ] `GET /monitoring/services/:id/checks` - Check history
- [ ] `GET /monitoring/services/:id/uptime` - Uptime stats
- [ ] `POST /monitoring/services/:id/check-now` - Force check
- [ ] `GET /monitoring/incidents` - List incidents
- [ ] `POST /monitoring/incidents` - Create incident
- [ ] `PUT /monitoring/incidents/:id` - Update incident
- [ ] `GET /monitoring/status-page` - Public status page data

#### 8.3 Health Checkers
- [ ] **HTTP Checker**
  - Send HTTP request
  - Check status code
  - Check response time
  - Check response body (optional regex)
- [ ] **TCP Checker**
  - Connect to TCP port
  - Check connection success
  - Measure response time
- [ ] **Ping Checker**
  - ICMP ping
  - Measure latency
  - Check packet loss
- [ ] **SSL Checker**
  - Check certificate expiration
  - Validate certificate chain
  - Alert antes de expirar

#### 8.4 Scheduler
- [ ] Cron-like scheduler (node-cron)
- [ ] Schedule checks baseado em interval
- [ ] Concurrent checks
- [ ] Queue system (Bull/BullMQ) para checks
- [ ] Retry failed checks

#### 8.5 Uptime Calculation
- [ ] Calculate uptime percentage
- [ ] Time windows: 24h, 7d, 30d, 90d
- [ ] Store check results (PostgreSQL ou time-series DB)
- [ ] Aggregation queries

#### 8.6 Incident Management
- [ ] Auto-create incident quando service down
- [ ] Incident status (investigating, identified, monitoring, resolved)
- [ ] Incident updates timeline
- [ ] Notify channels quando incident criado/resolvido

---

### 9. METRICS MODULE

#### 9.1 Metrics Module Structure
```
modules/metrics/
├── metrics.controller.ts
├── metrics.service.ts
├── metrics.routes.ts
├── collectors/
│   ├── system.collector.ts
│   ├── server.collector.ts
│   └── application.collector.ts
└── dto/
```

#### 9.2 Metrics Endpoints
- [ ] `GET /metrics/system` - System metrics (CPU, RAM, Disk)
- [ ] `GET /metrics/servers/:id` - Server specific metrics
- [ ] `GET /metrics/application` - Application metrics (requests, errors)
- [ ] `GET /metrics/query` - Query metrics com time range
- [ ] `POST /metrics/custom` - Send custom metric

#### 9.3 System Metrics Collection
- [ ] CPU usage (os module ou systeminformation)
- [ ] Memory usage
- [ ] Disk usage
- [ ] Network I/O
- [ ] Process metrics (PM2 integration opcional)

#### 9.4 Server Metrics Collection
- [ ] Conectar via SSH
- [ ] Run `top`, `free`, `df` commands
- [ ] Parse output
- [ ] Store em time-series DB

#### 9.5 Application Metrics
- [ ] Request count (middleware)
- [ ] Response time (middleware)
- [ ] Error rate
- [ ] Active connections
- [ ] WebSocket connections

#### 9.6 Storage
- [ ] InfluxDB ou TimescaleDB
- [ ] Write metrics
- [ ] Retention policies (guardar 30d, agregar older data)
- [ ] Aggregation queries (avg, min, max, percentiles)

#### 9.7 Real-time Streaming
- [ ] WebSocket namespace `/metrics`
- [ ] Stream metrics em tempo real
- [ ] Subscribe to specific metrics

---

### 10. LOGS MODULE

#### 10.1 Logs Module Structure
```
modules/logs/
├── logs.controller.ts
├── logs.service.ts
├── logs.routes.ts
├── logs.gateway.ts
└── parsers/
    ├── json.parser.ts
    └── syslog.parser.ts
```

#### 10.2 Logs Endpoints
- [ ] `GET /logs` - List logs (paginated, filtered)
- [ ] `GET /logs/:id` - Get log details
- [ ] `POST /logs/search` - Advanced search
- [ ] `GET /logs/sources` - List log sources
- [ ] `POST /logs/sources` - Add log source
- [ ] `GET /logs/patterns` - Detected patterns
- [ ] `GET /logs/errors` - Error tracking
- [ ] `POST /logs/export` - Export logs

#### 10.3 Log Ingestion
- [ ] HTTP endpoint para receive logs (`POST /logs/ingest`)
- [ ] Syslog receiver (opcional)
- [ ] File tail (ler logs de ficheiros locais)
- [ ] WebSocket streaming (apps mandam logs via WS)

#### 10.4 Log Storage
- [ ] PostgreSQL para logs (com indexes)
- [ ] Elasticsearch (opcional, melhor para search)
- [ ] Partition por data
- [ ] Retention policy (delete logs > 30d)

#### 10.5 Log Processing
- [ ] Parse JSON logs
- [ ] Parse plain text logs
- [ ] Extract metadata (timestamp, level, source, message)
- [ ] Pattern detection (regex)
- [ ] Error grouping (stack trace similarity)

#### 10.6 Log Search
- [ ] Full-text search
- [ ] Filter por level, source, date range
- [ ] Regex search
- [ ] Aggregations (count por level, por source)

#### 10.7 Real-time Logs
- [ ] WebSocket namespace `/logs`
- [ ] Stream logs em tempo real
- [ ] Filter streaming

---

### 11. ALERTS MODULE

#### 11.1 Alerts Module Structure
```
modules/alerts/
├── alerts.controller.ts
├── alerts.service.ts
├── alerts.routes.ts
├── alerts.scheduler.ts
├── evaluators/
│   └── condition.evaluator.ts
└── dto/
```

#### 11.2 Alerts Endpoints
- [ ] `GET /alerts` - List alert rules
- [ ] `POST /alerts` - Create alert rule
- [ ] `GET /alerts/:id` - Get alert details
- [ ] `PUT /alerts/:id` - Update alert
- [ ] `DELETE /alerts/:id` - Delete alert
- [ ] `POST /alerts/:id/test` - Test alert
- [ ] `GET /alerts/history` - Alert history
- [ ] `GET /alerts/active` - Currently triggered alerts
- [ ] `POST /alerts/:id/acknowledge` - Acknowledge alert
- [ ] `POST /alerts/:id/resolve` - Resolve alert

#### 11.3 Notification Channels Endpoints
- [ ] `GET /alerts/channels` - List channels
- [ ] `POST /alerts/channels` - Add channel
- [ ] `PUT /alerts/channels/:id` - Update channel
- [ ] `DELETE /alerts/channels/:id` - Delete channel
- [ ] `POST /alerts/channels/:id/test` - Test notification

#### 11.4 Alert Evaluation
- [ ] Scheduler para avaliar alerts (cada X segundos)
- [ ] Fetch metric value da source
- [ ] Evaluate condition (>, <, =, !=, etc)
- [ ] Trigger alert se condition met
- [ ] Debouncing (não trigger se já triggered recentemente)

#### 11.5 Condition Evaluator
- [ ] Parse condition (metric, operator, threshold)
- [ ] Fetch current value
- [ ] Compare
- [ ] Return triggered: boolean

#### 11.6 Notification Sending
- [ ] **Email** (Nodemailer)
  - SMTP config
  - Send email
  - Templates (Handlebars ou similar)
- [ ] **Slack** (Webhooks)
  - Send message to webhook URL
  - Format message
- [ ] **Discord** (Webhooks)
  - Similar to Slack
- [ ] **Telegram** (Bot API)
  - Send message via bot
- [ ] **Webhook** (generic HTTP POST)
  - Send JSON payload
- [ ] **SMS** (Twilio integration)

#### 11.7 Escalation Policies
- [ ] Define escalation steps
- [ ] Time delays entre steps
- [ ] Notify different channels/people
- [ ] Repeat until acknowledged

#### 11.8 Maintenance Windows
- [ ] Define maintenance windows
- [ ] Suppress alerts durante window
- [ ] Schedule windows

---

### 12. AUTOMATION/WORKFLOWS MODULE

#### 12.1 Automation Module Structure
```
modules/automation/
├── automation.controller.ts
├── automation.service.ts
├── automation.routes.ts
├── automation.scheduler.ts
├── executor.ts
├── nodes/
│   ├── trigger.nodes.ts
│   ├── action.nodes.ts
│   └── condition.nodes.ts
└── dto/
```

#### 12.2 Automation Endpoints
- [ ] `GET /automation/workflows` - List workflows
- [ ] `POST /automation/workflows` - Create workflow
- [ ] `GET /automation/workflows/:id` - Get workflow
- [ ] `PUT /automation/workflows/:id` - Update workflow
- [ ] `DELETE /automation/workflows/:id` - Delete workflow
- [ ] `POST /automation/workflows/:id/execute` - Execute manually
- [ ] `GET /automation/workflows/:id/executions` - Execution history
- [ ] `GET /automation/templates` - Workflow templates

#### 12.3 Workflow Definition
- [ ] JSON structure:
  ```json
  {
    "nodes": [
      { "id": "1", "type": "trigger", "config": {...} },
      { "id": "2", "type": "action", "config": {...} }
    ],
    "edges": [
      { "source": "1", "target": "2" }
    ]
  }
  ```

#### 12.4 Trigger Nodes
- [ ] **Schedule Trigger**
  - Cron expression
  - node-cron integration
- [ ] **Webhook Trigger**
  - Generate webhook URL
  - Receive HTTP POST
- [ ] **Event Trigger**
  - Listen to internal events (alert triggered, service down, etc)
- [ ] **Manual Trigger**
  - Execute via API call

#### 12.5 Action Nodes
- [ ] **SSH Command Action**
  - Execute command em server
  - Return output
- [ ] **API Request Action**
  - Make HTTP request
  - Return response
- [ ] **Database Query Action**
  - Execute query
  - Return results
- [ ] **Send Notification Action**
  - Send via channel
- [ ] **Delay Action**
  - Wait X seconds

#### 12.6 Condition Nodes
- [ ] **If/Else Node**
  - Evaluate condition
  - Branch execution

#### 12.7 Workflow Executor
- [ ] Execute workflow definition
- [ ] Traverse nodes (topological sort)
- [ ] Execute each node
- [ ] Pass data between nodes
- [ ] Handle errors
- [ ] Log execution
- [ ] Store results

#### 12.8 Scheduler
- [ ] Schedule workflows com cron triggers
- [ ] Queue system (Bull/BullMQ)
- [ ] Concurrent execution limit

---

### 13. WEBSOCKET GATEWAY

#### 13.1 Socket.io Setup
- [ ] Configurar Socket.io server
- [ ] CORS configuration
- [ ] Authentication middleware (JWT via query param ou handshake)
- [ ] Namespaces:
  - `/ssh`
  - `/metrics`
  - `/logs`
  - `/notifications`

#### 13.2 SSH Namespace
- [ ] `connect-server` event
- [ ] `execute-command` event
- [ ] `terminal-data` emit (stream output)
- [ ] `terminal-error` emit
- [ ] `disconnect-server` event

#### 13.3 Metrics Namespace
- [ ] `subscribe-metrics` event
- [ ] `unsubscribe-metrics` event
- [ ] `metric-update` emit (real-time data)

#### 13.4 Logs Namespace
- [ ] `subscribe-logs` event
- [ ] `log-entry` emit (new log)

#### 13.5 Notifications Namespace
- [ ] `notification` emit (new notification)
- [ ] `alert-triggered` emit

#### 13.6 Connection Management
- [ ] Track active connections
- [ ] User-to-socket mapping
- [ ] Cleanup on disconnect
- [ ] Reconnection handling

---

### 14. SECURITY

#### 14.1 Input Validation
- [ ] Zod schemas para todos os endpoints
- [ ] Sanitize inputs
- [ ] Max length checks

#### 14.2 Authentication Security
- [ ] JWT secret forte (32+ chars random)
- [ ] Refresh token rotation
- [ ] Token blacklist (Redis)
- [ ] Session timeout

#### 14.3 Authorization
- [ ] Resource ownership checks (user só pode ver seus próprios servers, etc)
- [ ] Role-based access
- [ ] API key rate limiting

#### 14.4 Rate Limiting
- [ ] express-rate-limit global
- [ ] Per-endpoint rate limits
- [ ] Per-user rate limits
- [ ] Store limits no Redis

#### 14.5 Data Encryption
- [ ] Encrypt sensitive data at rest:
  - SSH passwords/keys
  - Database passwords
  - API keys
- [ ] Use crypto (AES-256-GCM)
- [ ] Encryption key em ENV (ENCRYPTION_KEY)

#### 14.6 HTTPS
- [ ] Force HTTPS em production
- [ ] Helmet middleware (security headers)
- [ ] HSTS header

#### 14.7 CORS
- [ ] Whitelist origins
- [ ] Credentials: true
- [ ] Allowed methods/headers

#### 14.8 SQL Injection Prevention
- [ ] Use prepared statements/parameterized queries
- [ ] Validate queries
- [ ] Restrict DROP/DELETE em production

#### 14.9 XSS Prevention
- [ ] Sanitize output
- [ ] Content-Security-Policy header

#### 14.10 CSRF Protection
- [ ] CSRF tokens para state-changing operations
- [ ] SameSite cookies

#### 14.11 Audit Logging
- [ ] Log all sensitive actions:
  - Login/logout
  - SSH commands
  - Database queries
  - Config changes
- [ ] Store no AuditLog model
- [ ] Include: userId, action, resource, IP, timestamp

---

### 15. FILE UPLOAD/STORAGE

#### 15.1 File Upload
- [ ] Multer middleware
- [ ] Upload limits (size, type)
- [ ] Validation
- [ ] Storage:
  - Local filesystem (dev)
  - S3/MinIO (production)

#### 15.2 Avatar Upload
- [ ] `/upload/avatar` endpoint
- [ ] Image resize (sharp)
- [ ] Format conversion (WebP)
- [ ] Update user.avatar no DB

#### 15.3 SSH Key Upload
- [ ] Upload private key file
- [ ] Encrypt and store

#### 15.4 CSV/File Import
- [ ] Import API collections (Postman format)
- [ ] Import logs
- [ ] CSV parser

---

### 16. EMAIL SERVICE

#### 16.1 Email Setup
- [ ] Nodemailer configuration
- [ ] SMTP config (Gmail, SendGrid, etc)
- [ ] Email templates (Handlebars)

#### 16.2 Email Templates
- [ ] Welcome email
- [ ] Password reset
- [ ] Alert notifications
- [ ] Incident updates
- [ ] Weekly reports

#### 16.3 Email Queue
- [ ] Bull queue para emails
- [ ] Retry failed emails
- [ ] Email logs

---

### 17. CRON JOBS & SCHEDULED TASKS

#### 17.1 Scheduler Setup
- [ ] node-cron ou node-schedule
- [ ] Centralized scheduler em `src/shared/scheduler.ts`

#### 17.2 Scheduled Jobs
- [ ] **Monitoring checks** (cada X minutos)
- [ ] **Alert evaluation** (cada X segundos)
- [ ] **Metrics collection** (cada 1 minuto)
- [ ] **Workflow execution** (cron-based)
- [ ] **Cleanup jobs**:
  - Delete old logs (> 30d)
  - Delete old monitoring checks (> 90d)
  - Delete expired sessions
  - Delete expired refresh tokens
- [ ] **Backup jobs** (opcional)

---

### 18. TESTING

#### 18.1 Testing Setup
- [ ] Jest ou Vitest
- [ ] Supertest (HTTP testing)
- [ ] Test database (SQLite ou PostgreSQL test instance)
- [ ] Test environment setup

#### 18.2 Unit Tests
- [ ] Services tests
- [ ] Utils tests
- [ ] Middleware tests
- [ ] Validators tests

#### 18.3 Integration Tests
- [ ] API endpoints tests
- [ ] Database operations
- [ ] Authentication flow
- [ ] WebSocket events

#### 18.4 E2E Tests (opcional)
- [ ] Full user journeys
- [ ] Login → SSH connect → execute command
- [ ] Create alert → trigger → receive notification

#### 18.5 Test Coverage
- [ ] Target: 70%+ coverage
- [ ] Coverage reports (Istanbul/nyc)

---

### 19. DOCUMENTATION

#### 19.1 API Documentation
- [ ] Swagger/OpenAPI setup
- [ ] swagger-jsdoc + swagger-ui-express
- [ ] Documentar todos os endpoints:
  - Description
  - Parameters
  - Request body schema
  - Response schema
  - Examples
- [ ] Endpoint: `/api-docs`

#### 19.2 Code Documentation
- [ ] JSDoc comments em functions/classes
- [ ] README.md com:
  - Project overview
  - Setup instructions
  - Environment variables
  - Running tests
  - Deployment

#### 19.3 Architecture Documentation
- [ ] Database schema diagram
- [ ] API architecture
- [ ] WebSocket events diagram
- [ ] Module dependencies

---

### 20. ERROR HANDLING

#### 20.1 Error Classes
- [ ] Custom error classes:
  - `AppError` (base)
  - `ValidationError`
  - `AuthenticationError`
  - `AuthorizationError`
  - `NotFoundError`
  - `ConflictError`
  - `InternalServerError`

#### 20.2 Error Handling Middleware
- [ ] Catch all errors
- [ ] Log errors (Winston)
- [ ] Return formatted error response:
  ```json
  {
    "error": {
      "message": "...",
      "code": "ERROR_CODE",
      "statusCode": 400
    }
  }
  ```
- [ ] Hide stack traces em production

#### 20.3 Error Monitoring
- [ ] Sentry integration (opcional)
- [ ] Error alerts
- [ ] Error aggregation

---

### 21. PERFORMANCE OPTIMIZATION

#### 21.1 Database Optimization
- [ ] Indexes em queries frequentes
- [ ] Query optimization (EXPLAIN ANALYZE)
- [ ] Connection pooling
- [ ] Pagination em list endpoints

#### 21.2 Caching
- [ ] Redis caching:
  - User sessions
  - API responses (cache-aside pattern)
  - Metrics data (1min TTL)
- [ ] Cache invalidation strategies

#### 21.3 Response Compression
- [ ] Compression middleware (gzip/brotli)

#### 21.4 Lazy Loading
- [ ] Lazy load relations no Prisma

#### 21.5 Concurrency
- [ ] Use worker threads para CPU-intensive tasks
- [ ] Queue system (Bull) para async tasks

---

### 22. MONITORING & OBSERVABILITY

#### 22.1 Application Monitoring
- [ ] Health check endpoint (`/health`)
- [ ] Ready check endpoint (`/ready`)
- [ ] Metrics endpoint (`/metrics`) - Prometheus format (opcional)

#### 22.2 Logging
- [ ] Structured logging (JSON)
- [ ] Log levels appropriados
- [ ] Request logging
- [ ] Error logging
- [ ] Audit logging

#### 22.3 APM (opcional)
- [ ] New Relic ou Datadog integration
- [ ] Performance monitoring
- [ ] Distributed tracing

---

### 23. DEPLOYMENT PREPARATION

#### 23.1 Environment Configuration
- [ ] .env.production
- [ ] Secrets management (AWS Secrets Manager, etc)

#### 23.2 Build Process
- [ ] TypeScript compilation
- [ ] Build script (`npm run build`)
- [ ] Output to `dist/`

#### 23.3 Process Manager
- [ ] PM2 config (ecosystem.config.js)
- [ ] Cluster mode
- [ ] Auto-restart
- [ ] Log management

#### 23.4 Database Migrations
- [ ] Production migration strategy
- [ ] Rollback plan
- [ ] Seed data para production

---

## 📊 RESUMO DO TRABALHO BACKEND

### Estatísticas
- **Módulos principais:** 9 (Auth, SSH, Database, API, Monitoring, Metrics, Logs, Alerts, Automation)
- **Endpoints totais:** ~100+
- **Models Prisma:** ~15+
- **WebSocket namespaces:** 4
- **Services/Connectors:** ~15+
- **Middlewares:** ~10
- **Scheduled jobs:** ~5+

### Tempo Estimado
- **Setup inicial & Database:** 8-12 horas
- **Autenticação completa:** 10-12 horas
- **SSH Module:** 12-16 horas
- **Database Module:** 12-16 horas
- **API Testing Module:** 8-10 horas
- **Monitoring Module:** 12-16 horas
- **Metrics Module:** 10-12 horas
- **Logs Module:** 10-14 horas
- **Alerts Module:** 12-16 horas
- **Automation Module:** 16-20 horas
- **WebSocket Gateway:** 8-10 horas
- **Security & Optimization:** 10-12 horas
- **Testing & Documentation:** 12-16 horas

**TOTAL ESTIMADO:** 140-190 horas (3.5-5 semanas full-time)

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS (Prioridade 1)

1. **Setup inicial do projeto backend**
2. **Configurar TypeScript + estrutura de pastas**
3. **Setup Prisma + PostgreSQL + Redis**
4. **Criar server.ts base com Express**
5. **Implementar módulo de autenticação completo**
6. **Criar primeiros endpoints protegidos**
7. **Setup WebSocket básico**

---

**Última atualização:** 2025-11-30
**Versão:** 1.0
