# Forum Application - Docker Deployment Guide

This guide explains how to deploy the Forum application using Docker and Docker Compose as a monolith with internal networking.

## 🏗️ Architecture Overview

The application consists of:
- **Frontend**: Nginx-served static files with API proxy
- **Backend**: Go application with SQLite database
- **Internal Network**: Docker bridge network for secure communication
- **Data Persistence**: Docker volumes for database and uploaded files

## 📋 Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- Git

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd forum
```

### 2. Build and Run
```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 3. Access the Application
- **Main Application**: http://localhost:8000
- **Backend API**: http://localhost:8080 (optional direct access)
- **Database Admin**: http://localhost:8081 (with --profile tools)

## 🔧 Docker Services

### Frontend Service
- **Container**: `forum-frontend`
- **Port**: 8000 → 80
- **Technology**: Nginx + Static Files
- **Features**:
  - Serves frontend assets
  - Proxies API calls to backend
  - Handles SPA routing
  - Security headers
  - Static file caching

### Backend Service
- **Container**: `forum-backend`
- **Port**: 8080 → 8080
- **Technology**: Go + SQLite
- **Features**:
  - REST API endpoints
  - File upload handling
  - Database management
  - Session management

### Network Architecture
```
Internet → Frontend (Nginx:80) → Backend (Go:8080)
                ↓
            Internal Network
         (forum-internal)
```

## 📁 Data Persistence

### Volumes
- `forum-backend-data`: Uploaded files and static assets
- `forum-database-data`: SQLite database files

### Backup Data
```bash
# Backup database
docker cp forum-backend:/app/data ./backup-data

# Backup uploaded files
docker cp forum-backend:/app/static ./backup-static
```

## 🛠️ Development Commands

### Basic Operations
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Development with Tools
```bash
# Start with database admin tool
docker-compose --profile tools up --build

# Access Adminer at http://localhost:8081
# Server: backend
# Database: /app/data/forum.db
```

### Container Management
```bash
# Execute commands in containers
docker-compose exec backend sh
docker-compose exec frontend sh

# View container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check if ports are in use
netstat -tulpn | grep :8000
netstat -tulpn | grep :8080

# Use different ports
docker-compose up --build -p 8001:80 -p 8081:8080
```

#### 2. Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up --build
```

#### 3. Network Issues
```bash
# Check network connectivity
docker-compose exec frontend ping backend
docker-compose exec backend ping frontend
```

#### 4. Build Issues
```bash
# Clean build
docker-compose down
docker system prune -f
docker-compose up --build --force-recreate
```

### Logs and Debugging
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Check container health
docker-compose ps
```

## 🔒 Security Features

### Network Security
- Internal Docker network isolation
- No direct database access from outside
- API proxy through nginx

### Application Security
- Security headers in nginx
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Data Security
- Persistent volumes for data
- File upload restrictions
- Session management

## 🚀 Production Deployment

### Environment Variables
Create `.env` file:
```env
# Database
DB_PATH=/app/data/forum.db

# Server
PORT=8080

# Security (add in production)
SESSION_SECRET=your-secret-key
ALLOWED_ORIGINS=https://yourdomain.com
```

### Production Optimizations
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    restart: always
    environment:
      - NODE_ENV=production
  backend:
    restart: always
    environment:
      - GO_ENV=production
```

### SSL/HTTPS Setup
Add reverse proxy (nginx/traefik) with SSL certificates:
```yaml
  reverse-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./ssl:/etc/ssl
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf
```

## 📊 Monitoring

### Health Checks
Both services include health checks:
- Frontend: HTTP check on port 80
- Backend: API endpoint check

### Resource Monitoring
```bash
# View resource usage
docker stats

# View specific container stats
docker stats forum-frontend forum-backend
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build
```

### Database Migrations
```bash
# Access backend container
docker-compose exec backend sh

# Run migrations (if needed)
./forum-server --migrate
```

## 📝 Configuration Files

### Key Files
- `docker-compose.yml`: Main orchestration
- `frontend/Dockerfile`: Frontend container build
- `frontend/nginx.conf`: Nginx configuration
- `backend/Dockerfile`: Backend container build
- `backend/Makefile`: Build automation

### Customization
- Modify `nginx.conf` for custom routing
- Update `docker-compose.yml` for different ports
- Adjust Dockerfiles for custom dependencies

## 🎯 Benefits of This Setup

### Monolith Advantages
- Single deployment unit
- Simplified networking
- Easier development and testing
- Reduced operational complexity

### Docker Benefits
- Consistent environments
- Easy scaling
- Isolated dependencies
- Simple deployment process

### Internal Networking
- Secure service communication
- No external API exposure needed
- Simplified configuration
- Better performance
