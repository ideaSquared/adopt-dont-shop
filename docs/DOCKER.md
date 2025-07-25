# Docker Environment for Adopt Don't Shop

This document explains how to set up and run the Adopt Don't Shop application using Docker.

## Architecture

The application consists of multiple services:

- **service.backend** - Main API backend service (Node.js/Express)
- **app.client** - Public-facing React application (port 3000)
- **app.admin** - Admin dashboard React application (port 3001)  
- **app.rescue** - Rescue management React application (port 3002)
- **lib.components** - Shared React component library
- **database** - PostgreSQL database
- **redis** - Redis for caching and sessions
- **nginx** - Reverse proxy (production only)

## Quick Start

### Subdomain Setup

The application uses subdomain routing for a more production-like experience:
- **localhost** - Main client application
- **admin.localhost** - Admin dashboard  
- **rescue.localhost** - Rescue management portal
- **api.localhost** - Backend API

Modern browsers automatically resolve `*.localhost` subdomains to `127.0.0.1`, so no additional configuration is needed for most setups.

**Note**: If subdomains don't work in your browser, you can still access services directly via ports:
- Client: http://localhost:3000
- Admin: http://localhost:3001  
- Rescue: http://localhost:3002
- API: http://localhost:5000

### Development Environment

1. **Prerequisites**
   - Docker and Docker Compose installed
   - Git installed

2. **Setup**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd adopt-dont-shop
   
   # Copy environment file
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start development environment
   chmod +x scripts/docker-dev.sh
   ./scripts/docker-dev.sh
   ```

3. **Access Applications**
   - Client App: http://localhost
   - Admin App: http://admin.localhost  
   - Rescue App: http://rescue.localhost
   - Backend API: http://api.localhost
   - Database: localhost:5432 (direct connection)
   - Individual services (development): 
     - Client: http://localhost:3000
     - Admin: http://localhost:3001
     - Rescue: http://localhost:3002
     - Backend: http://localhost:5000

### Production Environment

1. **Setup**
   ```bash
   # Ensure .env is properly configured for production
   # Make sure JWT_SECRET is set to a secure value
   
   # Deploy production environment
   chmod +x scripts/docker-prod.sh
   ./scripts/docker-prod.sh
   ```

2. **Access Applications**
   - Main Site: http://localhost
   - Admin: http://admin.localhost
   - Rescue: http://rescue.localhost
   - API: http://api.localhost

## Manual Docker Commands

### Development
```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down
```

### Production
```bash
# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f [service-name]

# Stop services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

## Environment Variables

Key environment variables in `.env`:

```env
# Environment
NODE_ENV=development

# Database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=adopt_dont_shop

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# API URLs
API_URL=http://localhost:5000
VITE_API_URL=http://api.localhost
VITE_WS_URL=ws://api.localhost
```

## Service Details

### service.backend
- **Port**: 5000
- **Health Check**: http://localhost:5000/health
- **Database Migrations**: Runs automatically on startup
- **File Uploads**: Stored in `./uploads` volume

### Frontend Apps
- **app.client**: Public pet adoption interface
- **app.admin**: Administrative dashboard
- **app.rescue**: Rescue organization management
- **lib.components**: Shared UI components

All frontend apps are built with Vite and React, support hot-reloading in development.

### Database
- **PostgreSQL 16.4**
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume
- **Health Check**: Built-in pg_isready check

### Redis
- **Port**: 6379
- **Data**: Persisted in `redis_data` volume
- **Usage**: Session storage, caching

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Restart database
   docker-compose restart database
   ```

3. **Permission Issues** (Linux/macOS)
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   
   # Fix volume permissions
   sudo chown -R $USER:$USER ./uploads
   ```

4. **Build Failures**
   ```bash
   # Clean rebuild
   docker-compose down
   docker system prune -f
   docker-compose build --no-cache
   ```

### Debugging

```bash
# Enter a running container
docker-compose exec service-backend bash
docker-compose exec app-client sh

# View real-time logs
docker-compose logs -f --tail=100 service-backend

# Check service health
docker-compose ps
```

## Development Workflow

1. **Code Changes**: All source code is mounted as volumes, changes reflect immediately
2. **Database Changes**: Run migrations in the backend container
3. **Component Library**: Changes in lib.components are shared across apps
4. **Environment Variables**: Restart services after changing .env

## Production Considerations

- Set secure `JWT_SECRET`
- Configure proper `POSTGRES_PASSWORD`
- Use HTTPS in production (configure nginx SSL)
- Set up proper logging and monitoring
- Consider using Docker Swarm or Kubernetes for scaling
- Configure backup strategies for database volumes

## Monitoring

Health check endpoints:
- Backend: http://api.localhost/health
- Nginx: http://localhost/health

Use Docker's built-in health checks:
```bash
docker-compose ps
``` 