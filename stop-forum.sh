#!/bin/bash

# Simple script to stop the forum containers

echo "🛑 Stopping Forum Application..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Stop containers
print_info "Stopping containers..."
if docker-compose down; then
    print_success "Forum application stopped successfully"
else
    print_info "No containers were running"
fi

# Optional: Remove volumes (uncomment if you want to reset data)
# print_info "Removing data volumes..."
# docker-compose down --volumes

print_success "Done!"
