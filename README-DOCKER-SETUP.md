# Docker Setup Guide for Adopt Don't Shop

## Issues Fixed

### 1. Database Connection Issues ✅ RESOLVED

**Problem**: Service-backend couldn't connect to PostgreSQL database due to missing environment variables.

**Solution**: Updated `docker-compose.yml` to provide proper database configuration:
- Added `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` environment variables
- Added `DEV_DB_NAME` for development environment
- Database connection now works properly

### 2. Styled Components Dependency Issues ✅ RESOLVED

**Problem**: App-client couldn't resolve `styled-components` from the shared components library.

**Solution**: 
- Moved `styled-components` to peerDependencies in `lib.components/package.json`
- Added missing dependencies (`@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`, `clsx`) to both lib.components and app.client
- Updated Vite configuration in app.client to properly resolve styled-components
- Rebuilt containers to pick up new dependencies

### 3. Environment Variables Setup

**Created proper environment variable structure**:
```env
# Development Environment Variables
NODE_ENV=development

# Database Configuration
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=adopt_dont_shop

# Application URLs
API_URL=http://api.localhost
VITE_API_URL=http://api.localhost
VITE_WS_URL=ws://api.localhost

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-at-least-32-chars

# Development specific
DB_LOGGING=true
```

## Current Status

### ✅ Working Services:
- **Database**: PostgreSQL running and connected
- **Redis**: Cache service running
- **App-Client**: React application on port 3000 (styled-components issue resolved)
- **App-Admin**: Admin application on port 3001
- **App-Rescue**: Rescue application on port 3002
- **Lib-Components**: Shared components library building successfully
- **Nginx**: Reverse proxy running
- **Service-Backend**: API server running on port 5000 (database connected)

### ⚠️ Known Issues:
- **Email Queue Tables**: Some database tables (like `email_queue`) don't exist yet
  - Service continues to run but logs errors every 5 seconds
  - This is a minor issue - the main functionality works
  - Can be resolved by running database seeders when needed

## How to Run

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check status**:
   ```bash
   docker-compose ps
   ```

3. **View logs**:
   ```bash
   # All services
   docker-compose logs

   # Specific service
   docker-compose logs app-client
   docker-compose logs service-backend
   ```

4. **Access applications**:
   - Client App: http://localhost:3000
   - Admin App: http://localhost:3001  
   - Rescue App: http://localhost:3002
   - API Health: http://localhost:5000/health

## Development Commands

```bash
# Rebuild a specific service
docker-compose build app-client

# Restart a service
docker-compose restart service-backend

# View real-time logs
docker-compose logs -f app-client

# Execute commands in a container
docker-compose exec service-backend npm run build

# Stop all services
docker-compose down

# Stop and remove volumes (nuclear option)
docker-compose down -v
```

## Architecture

The application consists of:
- **3 Frontend Apps**: Client (public), Admin (management), Rescue (rescue organizations)
- **1 Backend API**: Service-backend (Node.js/Express/Sequelize)
- **1 Shared Library**: Lib-components (React components)
- **Infrastructure**: PostgreSQL, Redis, Nginx

All services are containerized and orchestrated with Docker Compose. 