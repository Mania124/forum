#!/bin/bash

# Test script for Docker containerization
echo "🧪 Testing Docker containerization setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Docker and Docker Compose are available
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed or not in PATH${NC}"
    exit 1
fi

print_status 0 "Docker and Docker Compose are available"

# Clean up any existing containers
print_info "Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans 2>/dev/null || docker compose down --volumes --remove-orphans 2>/dev/null

# Build and start containers
print_info "Building and starting containers..."
if docker-compose up --build -d 2>/dev/null || docker compose up --build -d 2>/dev/null; then
    print_status 0 "Containers started successfully"
else
    print_status 1 "Failed to start containers"
    exit 1
fi

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 10

# Test backend health
print_info "Testing backend health..."
backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/categories)
if [ "$backend_response" = "200" ]; then
    print_status 0 "Backend is responding (HTTP $backend_response)"
else
    print_status 1 "Backend is not responding properly (HTTP $backend_response)"
fi

# Test frontend
print_info "Testing frontend..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)
if [ "$frontend_response" = "200" ]; then
    print_status 0 "Frontend is responding (HTTP $frontend_response)"
else
    print_status 1 "Frontend is not responding properly (HTTP $frontend_response)"
fi

# Test API proxy through frontend
print_info "Testing API proxy through frontend..."
proxy_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/categories)
if [ "$proxy_response" = "200" ]; then
    print_status 0 "API proxy is working (HTTP $proxy_response)"
else
    print_status 1 "API proxy is not working properly (HTTP $proxy_response)"
fi

# Show container status
print_info "Container status:"
docker-compose ps 2>/dev/null || docker compose ps 2>/dev/null

# Show logs if there are issues
if [ "$backend_response" != "200" ] || [ "$frontend_response" != "200" ] || [ "$proxy_response" != "200" ]; then
    print_info "Showing recent logs for debugging:"
    echo "=== Backend logs ==="
    docker-compose logs --tail=20 backend 2>/dev/null || docker compose logs --tail=20 backend 2>/dev/null
    echo "=== Frontend logs ==="
    docker-compose logs --tail=20 frontend 2>/dev/null || docker compose logs --tail=20 frontend 2>/dev/null
fi

print_info "Test completed. Access the application at http://localhost:8000"
print_info "To stop containers: docker-compose down"
