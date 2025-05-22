#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Website Content Search Application...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Please install Docker and Docker Compose.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Start Weaviate
echo -e "${GREEN}Starting Weaviate Vector Database...${NC}"
docker compose up -d

# Wait for Weaviate to be ready
echo -e "${GREEN}Waiting for Weaviate to be ready...${NC}"
sleep 10

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 not found. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "${YELLOW}pip3 not found. Please install pip for Python 3.${NC}"
    exit 1
fi

# Download required NLTK data
echo -e "${GREEN}Downloading required NLTK data...${NC}"
python -c "import nltk; nltk.download('punkt_tab')"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 16 or higher.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm not found. Please install npm.${NC}"
    exit 1
fi

# Install backend dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
cd backend
pip3 install -r requirements.txt

# Start backend server in the background
echo -e "${GREEN}Starting backend server...${NC}"
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Go back to the project root
cd ..

# Install frontend dependencies
echo -e "${GREEN}Installing frontend dependencies...${NC}"
cd frontend
npm install

# Start frontend server in the background
echo -e "${GREEN}Starting frontend server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Go back to the project root
cd ..

echo -e "${GREEN}Application is running!${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}Weaviate Console: http://localhost:8080/v1/console${NC}"

# Wait for user to press Ctrl+C
echo -e "${YELLOW}Press Ctrl+C to stop the application${NC}"
trap "echo -e '${GREEN}Stopping application...${NC}'; kill $BACKEND_PID $FRONTEND_PID; docker compose down; exit 0" INT
wait
