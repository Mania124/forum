.PHONY: help build up down restart logs clean dev prod tools backup restore

# Default target
help:
	@echo "Forum Application - Docker Commands"
	@echo ""
	@echo "Basic Commands:"
	@echo "  make build     - Build all Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - View logs from all services"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start in development mode with live logs"
	@echo "  make tools     - Start with database admin tools"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean     - Clean up containers and volumes"
	@echo "  make backup    - Backup database and files"
	@echo "  make restore   - Restore from backup"
	@echo ""
	@echo "Production:"
	@echo "  make prod      - Start in production mode"
	@echo ""
	@echo "Access URLs:"
	@echo "  Application:   http://localhost:8000"
	@echo "  Backend API:   http://localhost:8080"
	@echo "  DB Admin:      http://localhost:8081 (with tools)"

# Build all images
build:
	@echo "🏗️  Building Docker images..."
	docker-compose build

# Start all services
up:
	@echo "🚀 Starting Forum application..."
	docker-compose up -d
	@echo "✅ Application started!"
	@echo "🌐 Access at: http://localhost:8000"

# Start with live logs
dev:
	@echo "🔧 Starting in development mode..."
	docker-compose up --build

# Start with database tools
tools:
	@echo "🛠️  Starting with database admin tools..."
	docker-compose --profile tools up -d
	@echo "✅ Application and tools started!"
	@echo "🌐 Application: http://localhost:8000"
	@echo "🗄️  DB Admin: http://localhost:8081"

# Stop all services
down:
	@echo "🛑 Stopping Forum application..."
	docker-compose down
	@echo "✅ Application stopped!"

# Restart all services
restart:
	@echo "🔄 Restarting Forum application..."
	docker-compose restart
	@echo "✅ Application restarted!"

# View logs
logs:
	@echo "📋 Viewing application logs..."
	docker-compose logs -f

# View frontend logs
logs-frontend:
	@echo "📋 Viewing frontend logs..."
	docker-compose logs -f frontend

# View backend logs
logs-backend:
	@echo "📋 Viewing backend logs..."
	docker-compose logs -f backend

# Clean up everything
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete!"

# Full rebuild
rebuild:
	@echo "🔨 Full rebuild..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Rebuild complete!"

# Production mode
prod:
	@echo "🏭 Starting in production mode..."
	docker-compose -f docker-compose.yml up -d
	@echo "✅ Production deployment started!"

# Backup data
backup:
	@echo "💾 Creating backup..."
	@mkdir -p ./backups/$(shell date +%Y%m%d_%H%M%S)
	docker cp forum-backend:/app/data ./backups/$(shell date +%Y%m%d_%H%M%S)/database
	docker cp forum-backend:/app/static ./backups/$(shell date +%Y%m%d_%H%M%S)/files
	@echo "✅ Backup created in ./backups/"

# Show status
status:
	@echo "📊 Service Status:"
	docker-compose ps

# Show resource usage
stats:
	@echo "📈 Resource Usage:"
	docker stats --no-stream forum-frontend forum-backend

# Execute shell in backend
shell-backend:
	@echo "🐚 Opening shell in backend container..."
	docker-compose exec backend sh

# Execute shell in frontend
shell-frontend:
	@echo "🐚 Opening shell in frontend container..."
	docker-compose exec frontend sh

# Test connectivity
test:
	@echo "🧪 Testing service connectivity..."
	@echo "Frontend to Backend:"
	docker-compose exec frontend wget -q --spider http://backend:8080/api/categories && echo "✅ OK" || echo "❌ Failed"
	@echo "External access:"
	curl -s http://localhost:8000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend Failed"
	curl -s http://localhost:8080/api/categories > /dev/null && echo "✅ Backend OK" || echo "❌ Backend Failed"

# Update application
update:
	@echo "🔄 Updating application..."
	git pull
	docker-compose down
	docker-compose build
	docker-compose up -d
	@echo "✅ Update complete!"

# Development setup
setup:
	@echo "⚙️  Setting up development environment..."
	@echo "Checking Docker..."
	docker --version
	docker-compose --version
	@echo "Building images..."
	make build
	@echo "Starting services..."
	make up
	@echo "✅ Setup complete!"
	@echo "🌐 Access your application at: http://localhost:8000"
