#!/bin/bash

SERVICE_NAME="zero45-dashboard.service"

# Prefer systemd control when available (manual invocation).
if [ -z "${INVOCATION_ID:-}" ] && command -v systemctl >/dev/null 2>&1; then
    echo "[stop.sh] Delegating stop to systemctl (${SERVICE_NAME})..."
    exec systemctl stop "${SERVICE_NAME}"
fi

# If running inside systemd (ExecStop), rely on unit management and exit quietly.
if [ -n "${INVOCATION_ID:-}" ]; then
    exit 0
fi

# ysnockserver - Stop Script
# Para todos os processos do ysnockserver

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              🛑 ysnockserver Stop                         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $name on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ $name stopped${NC}"
    else
        echo -e "${CYAN}ℹ $name is not running on port $port${NC}"
    fi
}

# Stop backend (port 9031)
kill_port 9031 "Backend"

# Stop frontend (port 5173)
kill_port 5173 "Frontend"

echo ""
echo -e "${GREEN}✅ All ysnockserver processes stopped${NC}"
echo ""
