# Docker Containerization Fixes

## Issues Identified and Fixed

### 1. Frontend API Configuration Issue
**Problem**: The frontend was hardcoded to use `http://localhost:8080` for API calls, which doesn't work in Docker containers.

**Fix**: Modified `frontend/components/utils/ApiUtils.mjs` to use relative URLs when running in Docker:
```javascript
static BASE_URL = window.location.hostname === 'localhost' && window.location.port === '8000' 
    ? 'http://localhost:8080' 
    : '';
```

This allows:
- Local development: Uses `http://localhost:8080` when accessing via `localhost:8000`
- Docker deployment: Uses relative URLs that nginx proxies to the backend

### 2. Port Mapping Issue
**Problem**: Docker Compose was mapping `8000:8000` but the frontend container runs nginx on port 80.

**Fix**: Changed Docker Compose port mapping to `8000:80` and updated health check accordingly.

### 3. Favicon URL Issue
**Problem**: The favicon was hardcoded to `http://localhost:8080/static/pictures/forum-logo.png`.

**Fix**: Changed to relative URL `/static/pictures/forum-logo.png` so nginx can proxy it properly.

### 4. CORS Configuration Enhancement
**Problem**: Backend CORS was restrictive and might not work properly with Docker networking.

**Fix**: Enhanced CORS middleware to handle:
- Requests without Origin header (from nginx proxy)
- Multiple localhost variations for development
- Proper Docker environment configuration

### 5. Database Path Configuration
**Problem**: Backend was using hardcoded database path instead of environment variable.

**Fix**: Modified `backend/main.go` to use `DB_PATH` environment variable with fallback.

## Files Modified

1. `frontend/components/utils/ApiUtils.mjs` - API base URL logic
2. `frontend/index.html` - Favicon URL
3. `docker-compose.yml` - Port mapping and environment variables
4. `backend/middleware/cors.go` - Enhanced CORS handling
5. `backend/main.go` - Database path configuration

## Testing

Created `test-docker.sh` script to verify:
- Container startup
- Backend API accessibility
- Frontend accessibility  
- API proxy functionality through nginx

## Usage

### For Local Development
```bash
# Backend
cd backend && go run .

# Frontend (in separate terminal)
cd frontend && npx serve -s . -l 8000
```

### For Docker Deployment
```bash
# Build and start all services
docker-compose up --build

# Test the setup
./test-docker.sh

# Access application at http://localhost:8000
```

### Stopping Docker Services
```bash
docker-compose down
```

## Architecture

```
[Browser] → [nginx:80] → [API Proxy] → [Go Backend:8080]
    ↓
[Static Files served by nginx]
```

- Frontend runs in nginx container, serves static files
- nginx proxies `/api/*` requests to backend container
- Backend runs Go server with database
- All containers communicate via Docker network `forum-network`

## Environment Variables

- `FRONTEND_ORIGIN`: CORS allowed origin (default: http://localhost:8000)
- `DB_PATH`: Database file path (default: forum.db)
- `PORT`: Backend server port (default: 8080)
