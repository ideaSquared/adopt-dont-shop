# Docker Setup & Troubleshooting Guide

This document explains how to set up and run the Adopt Don't Shop application using Docker, along with common troubleshooting solutions.

## Architecture

The application consists of multiple services:

- **service.backend** - Main API backend service (Node.js/Express)
- **app.client** - Public-facing React application (port 3000)
- **app.admin** - Admin dashboard React application (port 3001)
- **app.rescue** - Rescue management React application (port 3002)
- **database** - PostgreSQL (with PostGIS)
- **redis** - Redis for caching and sessions
- **nginx** - Reverse proxy for subdomain routing (runs in dev and prod)

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

   # Start all services
   docker compose up
   ```

3. **Access Applications**
   - Visit http://localhost (or individual ports as noted above)
   - Admin panel: http://admin.localhost
   - Rescue portal: http://rescue.localhost

## Environment Configuration

### Required Environment Variables

The authoritative example lives in [`.env.example`](../../.env.example) at the repo root. The minimum dev set looks like:

```env
NODE_ENV=development

# Database
POSTGRES_USER=adopt_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_IMMEDIATELY
POSTGRES_DB=adopt_dont_shop_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets — generate fresh values via `npm run secrets:generate`
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
CSRF_SECRET=...

# Frontend → backend
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_BASE_URL=ws://localhost:5000

# CORS (comma-separated list of allowed origins)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost,http://admin.localhost,http://rescue.localhost,http://api.localhost,http://localhost:5000
```

Generate strong secrets and append them to your `.env` with `npm run secrets:generate >> .env`.

## Common Issues & Solutions

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

### 3. Port Conflicts

**Problem**: Ports already in use on your system.

**Solution**:

```bash
# Stop conflicting services
sudo service nginx stop
sudo service postgresql stop

# Or modify ports in docker-compose.yml
```

### 4. Subdomain Access Issues

**Problem**: `*.localhost` subdomains not resolving.

**Solution**: Use direct port access or add entries to `/etc/hosts`:

```
127.0.0.1 admin.localhost
127.0.0.1 rescue.localhost
127.0.0.1 api.localhost
```

### 5. Volume Permission Issues

**Problem**: Permission denied errors with mounted volumes.

**Solution**:

```bash
# On Linux/macOS, fix ownership
sudo chown -R $USER:$USER ./uploads
chmod -R 755 ./uploads
```

## Production Deployment

### Using Production Compose File

```bash
# Build and start production services (applies the prod overlay on top
# of the base compose file — both flags are required).
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or via npm script
npm run prod:up

# Check service status
docker compose ps
```

### SSL/TLS Setup

For production, ensure SSL certificates are properly configured:

```bash
# Place certificates in nginx/ssl/
cp your-domain.crt nginx/ssl/
cp your-domain.key nginx/ssl/

# Update nginx configuration for HTTPS
```

## Docker Commands Reference

```bash
# Development
docker compose up                    # Start all services
docker compose up -d                 # Start in background
docker compose down                  # Stop all services
docker compose logs service-name     # View service logs
docker compose exec service-name bash # Access container shell

# Production (both -f flags required — prod overlays on top of base)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Maintenance
docker compose build                 # Rebuild all images
docker compose pull                  # Update base images
docker system prune                  # Clean up unused resources
```

## Performance Tips

1. **Use BuildKit** for faster builds:

   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

2. **Multi-stage builds** are already configured for optimal image sizes

3. **Volume caching** is configured for `node_modules` to speed up development

4. **Health checks** ensure services are ready before accepting connections

## Monitoring & Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f service-backend
docker compose logs -f app-client

# Monitor resource usage
docker stats
```

## Next Steps

- Review [Infrastructure Documentation](./INFRASTRUCTURE.md) for complete system overview
- See [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md) for architecture patterns
- See [../DOCKER.md](../DOCKER.md) for the Docker infrastructure deep dive
