#!/bin/bash

# Simple script to build and start the forum containers

echo "🚀 Starting Forum Application..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
print_info "Stopping any existing containers..."
docker-compose down > /dev/null 2>&1

# Build containers
print_info "Building containers..."
if docker-compose build; then
    print_success "Containers built successfully"
else
    print_error "Failed to build containers"
    exit 1
fi

# Start containers
print_info "Starting containers..."
if docker-compose up -d; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi

# Wait a moment for services to be ready
print_info "Waiting for services to be ready..."
sleep 5

# Check if services are responding
print_info "Checking services..."
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/categories)
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)

if [ "$backend_status" = "200" ]; then
    print_success "Backend is running (port 8080)"
else
    print_error "Backend is not responding properly"
fi

if [ "$frontend_status" = "200" ]; then
    print_success "Frontend is running (port 8000)"
else
    print_error "Frontend is not responding properly"
fi

# Show container status
print_info "Container status:"
docker-compose ps

echo ""
print_success "Forum application is ready!"
echo "🌐 Access the application at: http://localhost:8000"
echo "🔧 Backend API available at: http://localhost:8080"
echo ""
echo "To stop the application, run: docker-compose down"
