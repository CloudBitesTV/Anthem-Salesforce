#!/bin/bash

# anthemPlayer.sh - Run anthem player with webserver management
# This script:
# 1. Starts the Node.js server in the background (or kills existing one)
# 2. Waits for it to be ready
# 3. Runs the anthem player
# 4. Stops the server

set -e

# Check if at least two arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <salesforce-org-alias> <opportunity-id>"
    echo "Example: $0 anthemorg 006XXXXXXXXXXXXXXX"
    exit 1
fi

# Set variables from script arguments
SF_ORG_ALIAS="$1"
OPPORTUNITY_ID="$2"

echo "🚀 Starting anthem player with webserver management..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup background processes
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up background processes...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Server stopped${NC}"
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

# Check if port 8080 is already in use and kill existing process
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8080 is already in use. Stopping existing server...${NC}"
    EXISTING_PID=$(lsof -Pi :8080 -sTCP:LISTEN -t)
    kill $EXISTING_PID 2>/dev/null || true
    sleep 2
fi

echo -e "${YELLOW}📡 Starting Node.js server...${NC}"

# Start the server in the background
APP_PORT=8080 npm start > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8080/docs/json > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is ready${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Error: Server failed to start within 30 seconds${NC}"
        exit 1
    fi
    
    sleep 1
done

echo -e "${YELLOW}🎵 Running anthem player...${NC}"

# Run the anthem player directly to avoid output buffering
if node bin/anthemPlayer/anthemPlayer.js "$SF_ORG_ALIAS" "$OPPORTUNITY_ID"; then
    echo -e "${GREEN}✅ Anthem player completed successfully${NC}"
else
    echo -e "${RED}❌ Error: Anthem player failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Anthem player session complete!${NC}"
echo -e "${GREEN}📁 Generated files in bin/anthemPlayer/ directory${NC}"
echo -e "${YELLOW}🌐 Open bin/anthemPlayer/anthemPlayer.html in your browser to play the anthem${NC}"
