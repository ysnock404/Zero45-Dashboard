# Zero45 Dashboard

![Status](https://img.shields.io/badge/status-WIP%20%2F%20Unstable-red)
![Version](https://img.shields.io/badge/version-0.1.1--beta-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Unified Infrastructure Management Dashboard**

A modern, web-based control panel for managing SSH connections, RDP sessions, Proxmox virtualization, and system monitoring - all in one beautiful interface.

---

## 📋 Overview

Zero45 Dashboard is a full-stack TypeScript application that provides centralized management for your infrastructure. Built with security and user experience in mind, it features end-to-end encryption, real-time monitoring, and a sleek dark-themed UI.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Database:** Prisma ORM + SQLite
- **Real-time:** Socket.IO + WebSocket
- **Security:** JWT + AES-256-GCM encryption + bcrypt

---

## ✨ Features

### 🔐 Authentication & Security
- ✅ JWT-based authentication (access + refresh tokens)
- ✅ AES-256-GCM encryption for stored credentials
- ✅ Password hashing with bcrypt
- ✅ Token blacklisting with Redis
- ✅ Session management

### 💻 SSH Management
- ✅ Persistent SSH sessions with xterm.js
- ✅ Multi-server connection management
- ✅ Encrypted password and private key storage
- ✅ Real-time terminal streaming via WebSocket
- ✅ Command history and session reconnection

### 🪟 RDP Management
- ✅ RDP connection manager
- ✅ In-browser RDP viewer (Guacamole)
- ✅ Fullscreen and responsive controls
- ✅ Encrypted credential storage
- ✅ Connection status monitoring

### 🖥️ Proxmox Integration
- ✅ Real-time cluster monitoring
- ✅ VM and container management
- ✅ Power controls (start/stop/reboot)
- ✅ Resource metrics and graphs
- ✅ Storage and network information

### 📊 System Monitoring
- ✅ CPU, memory, disk, and network metrics
- ✅ Real-time data via WebSocket
- ✅ Historical data visualization
- ✅ Power consumption tracking (where available)

### 🎨 User Interface
- ✅ Modern dark theme (red/black)
- ✅ Responsive design
- ✅ 25+ Shadcn/ui components
- ✅ Real-time status updates
- ✅ Intuitive navigation

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (22.x recommended)
- **npm** or **yarn**
- **Linux** (tested on Debian/Ubuntu)
- **Optional:** Redis (for token blacklisting), Proxmox VE (for VM management)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ysnock404/Zero45-Dashboard.git
   cd Zero45-Dashboard
   ```

2. **Configure environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

   Required variables:
   - `DATABASE_URL` - SQLite database path
   - `JWT_SECRET` - Secret for access tokens
   - `JWT_REFRESH_SECRET` - Secret for refresh tokens
   - `ENCRYPTION_KEY` - 32-byte hex key for AES-256-GCM (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

3. **Install dependencies and setup database**
   ```bash
   # Backend
   cd backend
   npm install
   npx prisma migrate deploy
   npx prisma db seed  # Creates admin user

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Start the application**
   ```bash
   # From project root
   ./start.sh
   ```

5. **Access the dashboard**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9031
   - Login: `admin@zero45.local` / `admin`

---

## 🛠️ Service Management

Zero45 Dashboard can run as a systemd service for production deployments.

### Setup systemd service

```bash
sudo cp zero45-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zero45-dashboard.service
sudo systemctl start zero45-dashboard.service
```

### Service commands

```bash
sudo systemctl start zero45-dashboard    # Start service
sudo systemctl stop zero45-dashboard     # Stop service
sudo systemctl restart zero45-dashboard  # Restart service
sudo systemctl status zero45-dashboard   # Check status
```

Or use the convenience scripts:
```bash
./start.sh    # Start (delegates to systemctl if available)
./stop.sh     # Stop
./restart.sh  # Restart
```

Logs are located in `logs/backend.log` and `logs/frontend.log`.

---

## ⚙️ Configuration

### Backend Configuration

**Environment Variables (`.env`):**
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Encryption
ENCRYPTION_KEY="64-char-hex-key-here"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Server
NODE_ENV="production"
PORT="9031"
```

**JSON Configuration (`backend/config.json`):**
See `backend/config.example.json` for structure. Configure:
- SSH connection settings
- Proxmox API credentials
- Guacamole settings
- Logging preferences

### Frontend Configuration

Frontend uses environment variables from Vite. Create `frontend/.env` if needed.

---

## 📁 Project Structure

```
Zero45-Dashboard/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT authentication
│   │   │   ├── ssh/           # SSH management
│   │   │   ├── rdp/           # RDP management
│   │   │   ├── proxmox/       # Proxmox integration
│   │   │   └── host/          # System metrics
│   │   ├── shared/
│   │   │   ├── services/      # Prisma, Redis, Crypto
│   │   │   ├── middleware/    # Auth, errors
│   │   │   └── utils/         # Logger, helpers
│   │   └── server.ts          # Express + Socket.IO
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Admin user seed
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API clients
│   │   ├── stores/            # Zustand state
│   │   └── App.tsx
│   └── package.json
├── logs/                      # Application logs
├── start.sh                   # Startup script
├── stop.sh                    # Shutdown script
└── restart.sh                 # Restart script
```

---

## 🔒 Security

### Default Credentials

**⚠️ IMPORTANT:** Change the default admin password immediately after first login!

- Email: `admin@zero45.local`
- Password: `admin`

### Security Features

- **Encryption at rest:** All SSH/RDP passwords are encrypted with AES-256-GCM
- **JWT tokens:** Short-lived access tokens (15min) + refresh tokens (7 days)
- **Token blacklisting:** Logout invalidates tokens via Redis
- **Password hashing:** bcrypt with 10 rounds
- **WebSocket auth:** JWT verification on all WebSocket connections
- **Session tracking:** Database-backed session management

### Recommendations

1. Generate strong secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Enable Redis for token blacklisting:
   ```bash
   sudo apt install redis-server
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   ```

3. Use HTTPS in production with a reverse proxy (nginx/Caddy)

4. Implement rate limiting on login endpoints

---

## 🗺️ Roadmap

### Current Version (v1.0.0-beta)
- ✅ Core authentication and security
- ✅ SSH/RDP/Proxmox management
- ✅ Real-time monitoring
- ✅ Encrypted credential storage

### Planned Features
- [ ] SFTP file browser
- [ ] Database management module
- [ ] API testing interface
- [ ] Advanced monitoring and alerts
- [ ] Automation workflows
- [ ] Multi-user support with roles
- [ ] Audit logging
- [ ] Two-factor authentication
- [ ] Docker deployment
- [ ] Mobile-responsive improvements

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Backend development
cd backend
npm run dev

# Frontend development
cd frontend
npm run dev
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Issues:** https://github.com/ysnock404/Zero45-Dashboard/issues
- **Documentation:** See project wiki (coming soon)

---

## 🙏 Acknowledgments

- [Shadcn/ui](https://ui.shadcn.com/) - UI component library
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Guacamole](https://guacamole.apache.org/) - Remote desktop gateway
- [Prisma](https://www.prisma.io/) - Database ORM
- [Socket.IO](https://socket.io/) - Real-time communication

---

**Developed by ysnock404**

Last Updated: December 2025
