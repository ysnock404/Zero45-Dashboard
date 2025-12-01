#!/bin/bash

# ysnockserver - Start Script
# Inicia backend e frontend simultaneamente

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              🚀 ysnockserver Startup                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Resolve guacd settings from backend/config.json (fallbacks)
GUAC_HOST="127.0.0.1"
GUAC_PORT="4822"
if command -v jq >/dev/null 2>&1 && [ -f "backend/config.json" ]; then
    GUAC_HOST=$(jq -r '.guacamole.host // "127.0.0.1"' backend/config.json 2>/dev/null)
    GUAC_PORT=$(jq -r '.guacamole.port // 4822' backend/config.json 2>/dev/null)
fi

# Check if ports are available
echo -e "${BLUE}📡 Checking ports...${NC}"

if check_port 9031; then
    echo -e "${YELLOW}⚠️  Port 9031 (backend) is already in use${NC}"
    echo "   Kill the process or the backend is already running"
else
    echo -e "${GREEN}✓ Port 9031 (backend) is available${NC}"
fi

if check_port 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 (frontend) is already in use${NC}"
    echo "   Kill the process or the frontend is already running"
else
    echo -e "${GREEN}✓ Port 5173 (frontend) is available${NC}"
fi

if check_port "$GUAC_PORT"; then
    echo -e "${YELLOW}⚠️  Port $GUAC_PORT (guacd) is already in use${NC}"
    echo "   If guacd is already running, this is expected."
else
    echo -e "${GREEN}✓ Port $GUAC_PORT (guacd) is available${NC}"
fi

echo ""

# Check if backend dependencies are installed
echo -e "${BLUE}📦 Checking backend dependencies...${NC}"
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend dependencies not found. Installing...${NC}"
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies found${NC}"
fi

echo ""

# Check if frontend dependencies are installed
echo -e "${BLUE}📦 Checking frontend dependencies...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not found. Installing...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies found${NC}"
fi

echo ""

# Check if frontend .env exists
if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env not found. Creating from .env.example...${NC}"
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✓ Frontend .env created${NC}"
    echo ""
fi

# Check if backend config.json exists
if [ ! -f "backend/config.json" ]; then
    echo -e "${RED}❌ Backend config.json not found!${NC}"
    echo "Please create backend/config.json"
    exit 1
fi

echo -e "${GREEN}✓ Backend config.json found${NC}"
echo ""

# Start/ensure guacd (Guacamole daemon) is running
GUAC_CONTAINER="guacd"
GUAC_STARTED=0
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker not found. Skipping auto-start of guacd.${NC}"
    echo "    Start guacd manually (host ${GUAC_HOST}:${GUAC_PORT}) or install Docker."
elif ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker daemon not running. Skipping auto-start of guacd.${NC}"
    echo "    Start Docker or run guacd manually (host ${GUAC_HOST}:${GUAC_PORT})."
else
    echo -e "${BLUE}🧩 Starting guacd (Guacamole daemon)...${NC}"
    if docker ps -a --format '{{.Names}}' | grep -q "^${GUAC_CONTAINER}$"; then
        if ! docker ps --format '{{.Names}}' | grep -q "^${GUAC_CONTAINER}$"; then
            docker start "${GUAC_CONTAINER}" >/dev/null
            GUAC_STARTED=1
            echo -e "${GREEN}✓ guacd container started${NC}"
        else
            echo -e "${GREEN}✓ guacd already running${NC}"
        fi
    else
        docker run -d --name "${GUAC_CONTAINER}" -p ${GUAC_PORT}:4822 guacamole/guacd >/dev/null
        GUAC_STARTED=1
        echo -e "${GREEN}✓ guacd container created and started (port ${GUAC_PORT} -> 4822)${NC}"
    fi
fi

# Create logs directory for backend/frontend
mkdir -p backend/logs
mkdir -p logs

# Start backend and frontend
echo "════════════════════════════════════════════════════════════"
echo -e "${CYAN}🚀 Starting ysnockserver...${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${YELLOW}🛑 Shutting down ysnockserver...${NC}"
    echo "════════════════════════════════════════════════════════════"
    
    # Kill all child processes
    pkill -P $$

    # Stop guacd container if we started it
    if [ "${GUAC_STARTED}" -eq 1 ]; then
        echo -e "${BLUE}⏹️  Stopping guacd...${NC}"
        docker stop "${GUAC_CONTAINER}" >/dev/null
    fi
    
    echo -e "${GREEN}✓ All processes stopped${NC}"
    echo -e "${CYAN}👋 Goodbye!${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend in background
echo -e "${BLUE}🔧 Starting Backend...${NC}"
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "   ${CYAN}http://localhost:9031${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check logs/backend.log for errors"
    exit 1
fi

echo ""

# Start frontend in background
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend
npm run dev -- --host --port 5173 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a bit for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "   ${CYAN}http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo "Check logs/frontend.log for errors"
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ysnockserver is running!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}📍 URLs:${NC}"
echo -e "   Frontend:  ${BLUE}http://localhost:5173${NC}"
echo -e "   Backend:   ${BLUE}http://localhost:9031${NC}"
echo -e "   Health:    ${BLUE}http://localhost:9031/health${NC}"
echo ""
echo -e "${CYAN}🔐 Login Credentials:${NC}"
echo -e "   Email:     ${YELLOW}admin@ysnockserver.local${NC}"
echo -e "   Password:  ${YELLOW}admin${NC}"
echo ""
echo -e "${CYAN}📝 Logs:${NC}"
echo -e "   Backend:   ${BLUE}logs/backend.log${NC}"
echo -e "   Frontend:  ${BLUE}logs/frontend.log${NC}"
echo ""
echo -e "${CYAN}💡 Tips:${NC}"
echo "   - Press Ctrl+C to stop all services"
echo "   - Run './test-backend.sh' to test the API"
echo "   - Check logs if something goes wrong"
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Keep script running and show live logs
echo -e "${CYAN}📊 Live Logs (Ctrl+C to stop):${NC}"
echo "────────────────────────────────────────────────────────────"
echo ""

# Tail both logs
tail -f logs/backend.log logs/frontend.log &
TAIL_PID=$!

# Wait for user to press Ctrl+C
wait $TAIL_PID
