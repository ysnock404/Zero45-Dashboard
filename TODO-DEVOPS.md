# 📋 TODO DevOps - ysnockserver Dashboard

## 🎯 Stack Tecnológica DevOps

- **Containerização:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana (opcional)
- **Logs:** Loki (opcional)
- **Container Registry:** Docker Hub ou GitHub Container Registry
- **Cloud:** AWS/DigitalOcean/Hetzner (a escolher)
- **SSL:** Let's Encrypt (Certbot)

---

## 📦 TODO DEVOPS COMPLETO

### 1. DOCKER SETUP

#### 1.1 Estrutura Docker
```
045h/
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── default.conf
│   └── scripts/
│       ├── init-db.sh
│       └── backup.sh
├── docker-compose.yml
├── docker-compose.prod.yml
└── .dockerignore
```

#### 1.2 Frontend Dockerfile
- [ ] Criar `docker/Dockerfile.frontend`
  - [ ] Multi-stage build:
    - Stage 1: Build (Node.js)
    - Stage 2: Serve (Nginx)
  - [ ] Base image: `node:20-alpine`
  - [ ] Copy package.json e package-lock.json
  - [ ] `npm ci` (clean install)
  - [ ] Copy source code
  - [ ] `npm run build`
  - [ ] Nginx stage: `nginx:alpine`
  - [ ] Copy build output para Nginx
  - [ ] Copy nginx config
  - [ ] Expose port 80
  - [ ] Healthcheck

#### 1.3 Backend Dockerfile
- [ ] Criar `docker/Dockerfile.backend`
  - [ ] Multi-stage build:
    - Stage 1: Build
    - Stage 2: Production
  - [ ] Base image: `node:20-alpine`
  - [ ] Install dependencies
  - [ ] Copy Prisma schema
  - [ ] Generate Prisma Client
  - [ ] Copy source
  - [ ] Build TypeScript
  - [ ] Production stage (smaller image)
  - [ ] Copy node_modules e dist/
  - [ ] Expose port 3000
  - [ ] Healthcheck
  - [ ] CMD: `npm start`

#### 1.4 Docker Compose (Development)
- [ ] Criar `docker-compose.yml`
  - [ ] **Services:**
    - [ ] **frontend**
      - Build from Dockerfile.frontend
      - Ports: 5173:5173
      - Volumes: mount src/ (hot reload)
      - Environment variables
    - [ ] **backend**
      - Build from Dockerfile.backend
      - Ports: 3000:3000
      - Volumes: mount src/
      - Environment variables
      - Depends on: postgres, redis
    - [ ] **postgres**
      - Image: postgres:16-alpine
      - Ports: 5432:5432
      - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
      - Volumes: postgres_data
      - Healthcheck
    - [ ] **redis**
      - Image: redis:7-alpine
      - Ports: 6379:6379
      - Volumes: redis_data
      - Healthcheck
    - [ ] **nginx** (reverse proxy)
      - Image: nginx:alpine
      - Ports: 80:80
      - Volumes: mount nginx configs
      - Depends on: frontend, backend
  - [ ] **Networks:** ysnockserver-network
  - [ ] **Volumes:** postgres_data, redis_data

#### 1.5 Docker Compose (Production)
- [ ] Criar `docker-compose.prod.yml`
  - [ ] Override dev config
  - [ ] No volume mounts (use built images)
  - [ ] Production environment variables
  - [ ] Resource limits (CPU, Memory)
  - [ ] Restart policies: always
  - [ ] Add InfluxDB service (opcional)
  - [ ] Add Prometheus service (opcional)
  - [ ] Add Grafana service (opcional)

#### 1.6 .dockerignore
- [ ] Criar `.dockerignore` em cada app:
  - node_modules
  - dist
  - .env
  - .git
  - *.log
  - coverage
  - .vscode

#### 1.7 Docker Commands/Scripts
- [ ] `docker-compose up -d` - Start all services
- [ ] `docker-compose down` - Stop all services
- [ ] `docker-compose logs -f` - View logs
- [ ] `docker-compose exec backend npm run migrate` - Run migrations
- [ ] Script para rebuild: `./scripts/rebuild.sh`

---

### 2. NGINX CONFIGURATION

#### 2.1 Nginx Reverse Proxy
- [ ] Criar `docker/nginx/nginx.conf`
  - [ ] Worker processes
  - [ ] Events configuration
  - [ ] HTTP block
  - [ ] Include default.conf

#### 2.2 Default Config
- [ ] Criar `docker/nginx/default.conf`
  - [ ] **Frontend** (`/`)
    - Proxy pass to frontend:5173 (dev) ou serve static (prod)
    - HTML5 history mode (try_files)
  - [ ] **Backend API** (`/api`)
    - Proxy pass to backend:3000
    - Headers: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
  - [ ] **WebSocket** (`/socket.io`)
    - Proxy pass to backend:3000
    - WebSocket upgrade headers
  - [ ] **Health checks**
    - `/health` -> backend
  - [ ] **Static assets**
    - Caching headers
    - Gzip compression

#### 2.3 SSL Configuration (Production)
- [ ] SSL config block
- [ ] Redirect HTTP to HTTPS
- [ ] SSL certificates path
- [ ] SSL protocols (TLS 1.2, 1.3)
- [ ] SSL ciphers
- [ ] HSTS header
- [ ] OCSP stapling

#### 2.4 Performance Optimizations
- [ ] Gzip compression
- [ ] Brotli compression (opcional)
- [ ] Client body buffer size
- [ ] Keepalive timeout
- [ ] Worker connections
- [ ] Rate limiting (opcional)

#### 2.5 Security Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: no-referrer-when-downgrade
- [ ] Content-Security-Policy (configurar)

---

### 3. CI/CD - GITHUB ACTIONS

#### 3.1 Workflow Structure
```
.github/
└── workflows/
    ├── ci.yml
    ├── deploy-staging.yml
    └── deploy-production.yml
```

#### 3.2 CI Workflow (ci.yml)
- [ ] **Triggers:**
  - Push to main/develop
  - Pull requests
- [ ] **Jobs:**
  - [ ] **Lint & Format Check**
    - Checkout code
    - Setup Node.js
    - Install dependencies
    - Run ESLint
    - Run Prettier check
  - [ ] **Frontend Tests**
    - Checkout code
    - Setup Node.js
    - Install dependencies
    - Run tests (Vitest)
    - Upload coverage
  - [ ] **Backend Tests**
    - Checkout code
    - Setup Node.js
    - Setup PostgreSQL (service container)
    - Install dependencies
    - Run migrations
    - Run tests (Jest/Vitest)
    - Upload coverage
  - [ ] **Build Check**
    - Build frontend
    - Build backend
    - Check for build errors
  - [ ] **Docker Build**
    - Build frontend image
    - Build backend image
    - Check images build successfully

#### 3.3 Deploy Staging Workflow
- [ ] **Trigger:** Push to develop branch
- [ ] **Jobs:**
  - [ ] Run CI checks first
  - [ ] Build Docker images
  - [ ] Push to registry (tag: staging)
  - [ ] SSH to staging server
  - [ ] Pull images
  - [ ] Run docker-compose down
  - [ ] Run docker-compose up -d
  - [ ] Run migrations
  - [ ] Health check
  - [ ] Notify (Slack/Discord) sobre deploy

#### 3.4 Deploy Production Workflow
- [ ] **Trigger:**
  - Manual (workflow_dispatch)
  - Push tag (v*)
- [ ] **Jobs:**
  - [ ] Run full CI suite
  - [ ] Build Docker images
  - [ ] Tag images (latest, version tag)
  - [ ] Push to registry
  - [ ] **Backup production DB** (antes de deploy)
  - [ ] SSH to production server
  - [ ] Pull images
  - [ ] Run migrations (em staging primeiro?)
  - [ ] Blue-green deployment ou rolling update
  - [ ] Health check
  - [ ] Rollback se health check falhar
  - [ ] Notify sobre deploy (success/failure)

#### 3.5 Secrets Configuration
- [ ] GitHub Secrets:
  - [ ] `DOCKER_USERNAME`
  - [ ] `DOCKER_PASSWORD`
  - [ ] `SSH_PRIVATE_KEY` (para deploy em server)
  - [ ] `SERVER_HOST`
  - [ ] `SERVER_USER`
  - [ ] `SLACK_WEBHOOK` (notificações)
  - [ ] Production env vars (DATABASE_URL, JWT_SECRET, etc)

---

### 4. SERVER SETUP (VPS/Cloud)

#### 4.1 Escolher Provider
- [ ] AWS EC2
- [ ] DigitalOcean Droplet
- [ ] Hetzner Cloud
- [ ] Linode
- [ ] Outro

#### 4.2 Server Provisioning
- [ ] Create VM instance
- [ ] OS: Ubuntu 22.04 LTS
- [ ] Size: 2GB RAM mínimo (4GB recomendado)
- [ ] Firewall rules:
  - [ ] Port 22 (SSH)
  - [ ] Port 80 (HTTP)
  - [ ] Port 443 (HTTPS)
  - [ ] Close all outros ports
- [ ] SSH key setup

#### 4.3 Server Initial Setup
- [ ] SSH into server
- [ ] Update packages: `apt update && apt upgrade -y`
- [ ] Install Docker:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  ```
- [ ] Install Docker Compose
- [ ] Create non-root user
- [ ] Add user to docker group
- [ ] Setup SSH key authentication
- [ ] Disable password authentication
- [ ] Configure UFW firewall
- [ ] Install fail2ban (security)

#### 4.4 Directory Structure
```
/opt/ysnockserver/
├── docker-compose.yml
├── .env
├── nginx/
│   └── conf.d/
├── ssl/
│   ├── cert.pem
│   └── key.pem
├── backups/
└── logs/
```
- [ ] Create directories
- [ ] Set proper permissions

---

### 5. SSL/TLS CERTIFICATES

#### 5.1 Domain Setup
- [ ] Register domain (ou usar subdomain)
- [ ] Point A record to server IP
- [ ] Point AAAA record (IPv6) se disponível
- [ ] Verify DNS propagation

#### 5.2 Let's Encrypt Setup
- [ ] Install Certbot:
  ```bash
  apt install certbot python3-certbot-nginx
  ```
- [ ] Obtain certificate:
  ```bash
  certbot --nginx -d ysnockserver.com -d www.ysnockserver.com
  ```
- [ ] Test auto-renewal:
  ```bash
  certbot renew --dry-run
  ```
- [ ] Setup cron job para auto-renewal

#### 5.3 Certificate Renewal
- [ ] Cron job (crontab -e):
  ```
  0 0 * * 0 certbot renew --quiet
  ```
- [ ] Post-renewal hook (reload nginx)

---

### 6. DATABASE MANAGEMENT

#### 6.1 PostgreSQL Backup
- [ ] Backup script (`docker/scripts/backup.sh`):
  ```bash
  pg_dump -U user -h postgres dbname > backup.sql
  ```
- [ ] Compress backups (gzip)
- [ ] Cron job para backups diários
- [ ] Retention policy (guardar 7d, 4w, 12m)
- [ ] Upload para S3/Backblaze (opcional)

#### 6.2 Database Restore
- [ ] Restore script:
  ```bash
  psql -U user -h postgres dbname < backup.sql
  ```
- [ ] Test restore em staging periodicamente

#### 6.3 Database Migrations
- [ ] Run migrations em deploy:
  ```bash
  docker-compose exec backend npm run migrate:deploy
  ```
- [ ] Rollback strategy
- [ ] Migration testing em staging first

#### 6.4 Database Monitoring
- [ ] Monitor connection count
- [ ] Monitor query performance
- [ ] Monitor disk usage
- [ ] Alerts para slow queries

---

### 7. MONITORING & LOGGING

#### 7.1 Application Logs
- [ ] Docker logs: `docker-compose logs -f`
- [ ] Log rotation (docker logging driver)
- [ ] Centralized logging (opcional):
  - Loki + Grafana
  - ELK stack
  - CloudWatch (se AWS)

#### 7.2 System Monitoring
- [ ] **Prometheus** (opcional)
  - [ ] Setup Prometheus container
  - [ ] Scrape metrics from:
    - Node exporter (system metrics)
    - Backend /metrics endpoint
    - PostgreSQL exporter
    - Redis exporter
  - [ ] Retention policy

#### 7.3 Grafana Dashboards (opcional)
- [ ] Setup Grafana container
- [ ] Import dashboards:
  - Node exporter dashboard
  - PostgreSQL dashboard
  - Application metrics dashboard
- [ ] Configure alerts

#### 7.4 Uptime Monitoring
- [ ] External monitoring (UptimeRobot, Pingdom, etc)
- [ ] Monitor HTTPS endpoint
- [ ] Alert via email/SMS se down

#### 7.5 Error Tracking
- [ ] Sentry integration
- [ ] Backend error reporting
- [ ] Frontend error reporting
- [ ] Source maps upload

---

### 8. SECURITY

#### 8.1 Server Hardening
- [ ] SSH hardening:
  - Disable root login
  - Disable password authentication
  - Change default SSH port (opcional)
  - Use SSH keys only
- [ ] Install fail2ban
- [ ] Configure UFW firewall
- [ ] Keep system updated (unattended-upgrades)

#### 8.2 Docker Security
- [ ] Run containers as non-root user
- [ ] Use official base images
- [ ] Scan images for vulnerabilities (Trivy, Snyk)
- [ ] Limit container resources
- [ ] Use secrets management (não commit .env)

#### 8.3 Application Security
- [ ] Environment variables via secrets
- [ ] Rotate JWT secrets periodically
- [ ] Strong database passwords
- [ ] Redis password
- [ ] Rate limiting (Nginx + backend)
- [ ] HTTPS only em production
- [ ] CSRF protection
- [ ] CORS whitelist

#### 8.4 Secrets Management
- [ ] .env files não commitados (gitignore)
- [ ] Use AWS Secrets Manager ou similar (prod)
- [ ] Rotate secrets periodicamente
- [ ] Encrypt backups

---

### 9. PERFORMANCE OPTIMIZATION

#### 9.1 Caching
- [ ] Redis caching strategy
- [ ] Nginx caching (static assets)
- [ ] Browser caching headers
- [ ] CDN para static assets (opcional)

#### 9.2 Database Optimization
- [ ] Indexes em queries frequentes
- [ ] Connection pooling (Prisma)
- [ ] Query optimization
- [ ] Read replicas (se necessário)

#### 9.3 Load Balancing (se escalar)
- [ ] Multiple backend instances
- [ ] Nginx load balancer
- [ ] Session stickiness (via Redis)

#### 9.4 CDN (opcional)
- [ ] Cloudflare
- [ ] AWS CloudFront
- [ ] Cache static assets
- [ ] DDoS protection

---

### 10. BACKUP & DISASTER RECOVERY

#### 10.1 Backup Strategy
- [ ] **Database backups:**
  - Daily automated backups
  - Weekly full backups
  - Upload to remote storage (S3)
- [ ] **Volume backups:**
  - Docker volumes backup
  - User uploaded files
- [ ] **Configuration backups:**
  - Nginx configs
  - Environment variables (encrypted)

#### 10.2 Disaster Recovery Plan
- [ ] Document recovery procedures
- [ ] Test restore process (quarterly)
- [ ] RTO/RPO targets
- [ ] Backup server provisioning script

#### 10.3 Backup Testing
- [ ] Restore backup em staging
- [ ] Verify data integrity
- [ ] Test application functionality

---

### 11. INFRASTRUCTURE AS CODE (opcional)

#### 11.1 Terraform
- [ ] Define infrastructure:
  - VPS instance
  - Firewall rules
  - DNS records
  - Load balancer (se necessário)
- [ ] Terraform state management (S3 backend)
- [ ] Terraform modules

#### 11.2 Ansible (opcional)
- [ ] Server provisioning playbook
- [ ] Application deployment playbook
- [ ] Configuration management

---

### 12. DEPLOYMENT PROCEDURES

#### 12.1 Deployment Checklist
- [ ] Run tests locally
- [ ] Run CI pipeline (must pass)
- [ ] Deploy to staging first
- [ ] Test em staging
- [ ] Backup production DB
- [ ] Deploy to production
- [ ] Run migrations
- [ ] Health check
- [ ] Monitor logs para erros
- [ ] Rollback se problemas

#### 12.2 Rollback Procedure
- [ ] Keep previous Docker images
- [ ] Quick rollback script:
  ```bash
  docker-compose down
  docker-compose up -d --force-recreate
  ```
- [ ] Database rollback (restore backup)

#### 12.3 Zero-Downtime Deployment
- [ ] Blue-green deployment strategy
- [ ] Rolling updates
- [ ] Health check antes de switch

---

### 13. COST OPTIMIZATION

#### 13.1 Resource Monitoring
- [ ] Monitor CPU usage
- [ ] Monitor RAM usage
- [ ] Monitor disk usage
- [ ] Monitor bandwidth
- [ ] Right-size server (não over-provision)

#### 13.2 Auto-scaling (se necessário)
- [ ] Horizontal scaling (múltiplas instâncias)
- [ ] Load balancer
- [ ] Auto-scaling groups (AWS)

#### 13.3 Cost Alerts
- [ ] Setup billing alerts
- [ ] Budget limits

---

### 14. DOCUMENTATION

#### 14.1 DevOps Documentation
- [ ] **Deployment Guide**
  - Setup instructions
  - Deployment procedures
  - Rollback procedures
- [ ] **Infrastructure Diagram**
  - Network topology
  - Service dependencies
  - Data flow
- [ ] **Runbooks**
  - Common issues e soluções
  - Emergency procedures
  - Contact info
- [ ] **Environment Variables**
  - Lista completa de vars
  - Descrição de cada uma
  - Default values

#### 14.2 Operational Procedures
- [ ] Backup & restore procedures
- [ ] Scaling procedures
- [ ] Incident response plan
- [ ] On-call rotation (se equipa)

---

### 15. COMPLIANCE & AUDIT

#### 15.1 Audit Logging
- [ ] Log all access (SSH)
- [ ] Log all deployments
- [ ] Log all database changes (migrations)
- [ ] Retain logs (6-12 months)

#### 15.2 Compliance (se necessário)
- [ ] GDPR compliance
- [ ] Data retention policies
- [ ] Privacy policy
- [ ] Terms of service

---

## 📊 RESUMO DO TRABALHO DEVOPS

### Infraestrutura Core
- **Containers:** 5+ (frontend, backend, postgres, redis, nginx)
- **CI/CD Workflows:** 3 (CI, staging deploy, prod deploy)
- **Monitoring Tools:** 2-3 (Prometheus, Grafana, Uptime monitor)
- **Backup Jobs:** 3+ (DB, volumes, configs)

### Tempo Estimado
- **Docker setup:** 6-8 horas
- **Nginx configuration:** 4-6 horas
- **CI/CD pipelines:** 8-12 horas
- **Server setup & provisioning:** 6-8 horas
- **SSL/TLS setup:** 2-3 horas
- **Database backups & migrations:** 4-6 horas
- **Monitoring & logging:** 8-12 horas
- **Security hardening:** 6-8 horas
- **Documentation:** 4-6 horas
- **Testing & troubleshooting:** 8-10 horas

**TOTAL ESTIMADO:** 56-80 horas (1.5-2 semanas full-time)

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS (Prioridade 1)

1. **Criar Dockerfiles** para frontend e backend
2. **Setup docker-compose.yml** para desenvolvimento
3. **Configurar Nginx** reverse proxy
4. **Testar stack localmente** (docker-compose up)
5. **Setup GitHub Actions CI** (lint + tests)
6. **Provisionar servidor** (DigitalOcean/Hetzner)
7. **Setup deployment pipeline**

---

## 🔧 Scripts Úteis

### Build & Run Local
```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down

# Clean up
docker-compose down -v --remove-orphans
```

### Production Deploy
```bash
# SSH to server
ssh user@server

# Pull latest
cd /opt/ysnockserver
git pull

# Backup DB
./scripts/backup.sh

# Deploy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npm run migrate:deploy

# Check health
curl https://ysnockserver.com/health
```

---

**Última atualização:** 2025-11-30
**Versão:** 1.0
