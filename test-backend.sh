#!/bin/bash

echo "🚀 ysnockserver - Test Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "📡 Checking backend..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is NOT running${NC}"
    echo -e "${YELLOW}  Run: cd backend && npm run dev${NC}"
    exit 1
fi

echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "  Response: $HEALTH"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi

echo ""

# Test login
echo "🔐 Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@ysnockserver.local","password":"admin"}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Login successful${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "  Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "  Response: $LOGIN_RESPONSE"
    exit 1
fi

echo ""

# Test SSH servers endpoint
echo "🖥️  Testing SSH servers endpoint..."
SSH_RESPONSE=$(curl -s http://localhost:3001/api/ssh/servers)

if echo "$SSH_RESPONSE" | grep -q "status"; then
    echo -e "${GREEN}✓ SSH servers endpoint working${NC}"
    echo "  Response: ${SSH_RESPONSE:0:100}..."
else
    echo -e "${RED}✗ SSH servers endpoint failed${NC}"
    echo "  Response: $SSH_RESPONSE"
    exit 1
fi

echo ""
echo "=============================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Login with: admin@ysnockserver.local / admin"
echo "3. Go to SSH page and add a server"
echo "4. Test the terminal!"
echo ""
