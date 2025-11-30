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

# Check if ports are available
echo -e "${BLUE}📡 Checking ports...${NC}"

if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 (backend) is already in use${NC}"
    echo "   Kill the process or the backend is already running"
else
    echo -e "${GREEN}✓ Port 3001 (backend) is available${NC}"
fi

if check_port 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 (frontend) is already in use${NC}"
    echo "   Kill the process or the frontend is already running"
else
    echo -e "${GREEN}✓ Port 5173 (frontend) is available${NC}"
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

# Create logs directory for backend
mkdir -p backend/logs

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
    echo -e "   ${CYAN}http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check logs/backend.log for errors"
    exit 1
fi

echo ""

# Start frontend in background
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
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
echo -e "   Backend:   ${BLUE}http://localhost:3001${NC}"
echo -e "   Health:    ${BLUE}http://localhost:3001/health${NC}"
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
