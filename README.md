# Zero45 Dashboard

> "Just a cool looking dashboard I made for my homelab. SSH, stats, and vibes."

![Status](https://img.shields.io/badge/status-WIP%20%2F%20Unstable-red)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

**⚠️ WARNING: THIS IS A WORK IN PROGRESS**
This project is currently in active development. It is **unstable**, **not feature complete**, and **not ready for production use**. Use at your own risk. Expect bugs, breaking changes, and missing features.

---

## 🚀 About

Zero45 Dashboard is a personal project to create a unified control center for my homelab. It aims to replace multiple terminal windows with a single, beautiful, dark-themed interface.

**Current State:**
- 🚧 **Development Phase**: Pre-alpha
- 🐛 **Stability**: Low
- 🎨 **Design**: Custom Red/Black Theme

---

## ✨ Features (Planned/In Progress)

### ✅ Implemented (Kind of)
- 🖥️ **Proxmox integration** - `/api/proxmox/*` endpoints expose cluster resources, metrics, and power actions for nodes, VMs, and LXC containers
- 🪟 **RDP manager + Guacamole streaming** - CRUD for saved RDP hosts, tokenized Guacamole bridge, and in-browser viewer with fullscreen/status overlays
- 💻 **SSH Gateway 2.0** - Persistent SSH sessions with history, reconnection, encryption at rest for secrets, and an improved xterm.js frontend
- 📈 **Host metrics collector** - Aggregated CPU/memory/disk/network stats plus optional wattage sampling via `systeminformation`
- 🧠 **Auth / UI Core** - Basic JWT login/register, dashboard shell, JSON config, logging, etc.

### 🚧 To Do / Broken
- 🗄️ Database Management
- 🧪 API Testing
- 📈 Real Monitoring
- 🔔 Alerts
- 🤖 Automation
- 🐛 **Bug Fixing** (Lots of it)

---

## 🏃 Quick Start (If you dare)

### Requirements
- Node.js 20+
- macOS/Linux

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/ysnock404/Zero45-Dasboard.git
   cd Zero45-Dasboard
   ```

2. **Run the start script**
   ```bash
   ./start.sh
   ```

3. **Access**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## 🛠️ Service Management

Zero45 Dashboard runs as a systemd service called `zero45-dashboard.service`. Use:

```bash
sudo systemctl start zero45-dashboard.service     # Start frontend + backend
sudo systemctl stop zero45-dashboard.service      # Stop everything safely
sudo systemctl restart zero45-dashboard.service   # Apply new configs
sudo systemctl status zero45-dashboard.service    # Status and recent logs
```

- Logs go to `logs/systemd.log` and `logs/systemd.err.log`.
- The scripts `./start.sh` and `./stop.sh` are used internally by systemd.
  - When you run them manually, they just delegate to `systemctl` to keep state in sync.
  - If you must start/stop outside systemd, call the service via `systemctl`; it will invoke the scripts automatically.

---

## ⚙️ Configuration

Check `backend/config.example.json` for the structure. You need to create a `backend/config.json` file.

**Note:** The project uses a local `.env` file for the frontend which is not included in the repo.

---

## 🤝 Contributing

Feel free to fork and fix my bugs.

1. Fork it
2. Create your feature branch (`git checkout -b feature/cool-stuff`)
3. Commit your changes (`git commit -m 'Fixed something'`)
4. Push to the branch (`git push origin feature/cool-stuff`)
5. Create a new Pull Request

---

**Disclaimer:** This is a hobby project. Don't use this to manage critical infrastructure (yet).

**Developed by ysnock**
