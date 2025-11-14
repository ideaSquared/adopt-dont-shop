# Docker Infrastructure Guide

This document outlines the Docker infrastructure for the Adopt Don't Shop monorepo, following industry standards from CNCF, Google, and Vercel.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Best Practices](#best-practices)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using Make (Recommended)

```bash
# Start development environment
make dev

# Build all images
make build

# Run tests
make test

# View logs
make logs

# Stop all services
make down

# See all available commands
make help
```

### Using Docker Compose Directly

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Build and start
docker-compose up --build

# Stop all services
docker-compose down
```

## Architecture Overview

### Multi-Stage Builds

All Dockerfiles use multi-stage builds for optimal image sizes and build caching:

1. **base** - Foundation layer with common dependencies
2. **development** - Development environment with hot-reload
3. **build** - Compilation stage for production artifacts
4. **production** - Minimal runtime image

### Services

#### Infrastructure
- **database** - PostgreSQL 16 with PostGIS extensions
- **redis** - Redis 7 for caching and sessions
- **nginx** - Reverse proxy with subdomain routing

#### Backend
- **service-backend** - Express.js API server
  - Port: 5000
  - Health check: http://localhost:5000/health

#### Frontend Apps
- **app-client** - Public adoption portal (Port: 3000)
- **app-admin** - Admin dashboard (Port: 3001)
- **app-rescue** - Rescue organization portal (Port: 3002)

## Best Practices

### BuildKit Optimizations

All Dockerfiles use BuildKit features for improved performance:

```dockerfile
# syntax=docker/dockerfile:1.4

# Cache mount for npm packages
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Cache mount for Turbo builds
RUN --mount=type=cache,target=/app/.turbo \
    npx turbo run build --filter=${APP_NAME}
```

**Benefits:**
- 40-60% faster builds through intelligent caching
- Reduced network usage
- Smaller final image sizes

### Security Features

#### Non-Root User
All containers run as non-root users:

```dockerfile
USER backend  # Backend service
USER viteuser # Frontend apps
```

#### Security Headers
Nginx includes OWASP-recommended security headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

#### Health Checks
All services include health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1
```

### Image Optimization

#### .dockerignore
Comprehensive `.dockerignore` reduces build context:

- Excludes `node_modules`, test files, documentation
- Reduces build context from ~500MB to ~50MB
- 10x faster build context transfer

#### Layer Caching
Optimal layer ordering for maximum cache hits:

1. Package files (changes rarely)
2. Dependencies installation (cached unless package.json changes)
3. Source code (changes frequently)

## Development Workflow

### Local Development

#### Option 1: Using Make (Recommended)

```bash
# Start everything
make dev

# Start specific services
make dev-backend
make dev-frontend

# View logs
make logs-backend
make logs-client

# Access shell
make shell-backend
make shell-db
```

#### Option 2: Using docker-compose

```bash
# Start all services with live reload
docker-compose up

# Start specific services
docker-compose up service-backend database redis

# Rebuild a specific service
docker-compose up --build service-backend
```

### Custom Local Configuration

Create a `docker-compose.override.yml` file for local customizations:

```bash
# Copy example override file
cp docker-compose.override.yml.example docker-compose.override.yml

# Edit for your needs
vim docker-compose.override.yml
```

Example overrides:
- Increase memory limits
- Disable file watching
- Add debugging ports
- Custom volume mounts

### Database Operations

```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Reset database
make db-reset

# Backup database
make db-backup

# Access PostgreSQL shell
make shell-db
```

### Debugging

#### Backend Debugging

Add to `docker-compose.override.yml`:

```yaml
services:
  service-backend:
    ports:
      - "9229:9229"
    command: npm run dev:debug
```

Then attach your IDE debugger to `localhost:9229`.

#### Frontend Debugging

All frontend apps support React DevTools and browser debugging out of the box.

## Production Deployment

### Building Production Images

```bash
# Build all production images
make build-prod

# Or individually
docker build -t adopt-dont-shop/backend:latest \
  --target production \
  ./service.backend

docker build -t adopt-dont-shop/app-client:latest \
  --build-arg APP_NAME=app.client \
  --target production \
  -f Dockerfile.app.optimized .
```

### Production Compose

```bash
# Start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or using Make
make prod-up
```

### Environment Variables

Required production environment variables:

```bash
# Backend
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
DB_HOST=<database-host>
DB_PASSWORD=<secure-password>

# Frontend Apps
VITE_API_URL=https://api.adoptdontshop.com
VITE_WS_URL=wss://api.adoptdontshop.com
```

### Health Checks

All services expose health endpoints:

- Backend: `http://localhost:5000/health`
- Frontend: `http://localhost:80/health` (Nginx)

## CI/CD Integration

### GitHub Actions

The `.github/workflows/docker.yml` workflow:

1. **Build Backend** - Builds development and production images
2. **Build Apps** - Builds all frontend apps in parallel
3. **Test Compose** - Validates full stack integration
4. **Security Scan** - Scans images for vulnerabilities (Trivy)

### Build Caching

GitHub Actions uses BuildKit cache for faster builds:

```yaml
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
```

### Security Scanning

Trivy scans all images for vulnerabilities:

```bash
# Manual scan
make security-scan

# Or with trivy directly
trivy image adopt-dont-shop/backend:latest
```

## Troubleshooting

### Common Issues

#### Out of Memory

**Symptoms:** Container crashes, build failures

**Solutions:**

1. Increase Docker memory allocation (Docker Desktop settings)
2. Reduce concurrent builds:
   ```bash
   docker-compose up --build --no-build --scale app-admin=0
   ```
3. Add to `docker-compose.override.yml`:
   ```yaml
   services:
     app-client:
       mem_limit: 4g
       environment:
         NODE_OPTIONS: '--max-old-space-size=4096'
   ```

#### Slow File Watching (Windows/Mac)

**Symptoms:** Changes not reflected, slow hot-reload

**Solutions:**

1. Enable polling (already configured):
   ```yaml
   environment:
     CHOKIDAR_USEPOLLING: true
     CHOKIDAR_INTERVAL: 1000
   ```

2. Reduce file watching scope in `vite.config.ts`:
   ```typescript
   watch: {
     ignored: ['**/node_modules/**', '**/dist/**']
   }
   ```

#### Port Already in Use

**Symptoms:** `port is already allocated`

**Solutions:**

1. Check what's using the port:
   ```bash
   lsof -i :5000
   ```

2. Stop conflicting service or change port in `docker-compose.override.yml`:
   ```yaml
   services:
     service-backend:
       ports:
         - "5001:5000"
   ```

#### Build Cache Issues

**Symptoms:** Builds using stale dependencies

**Solutions:**

1. Clear build cache:
   ```bash
   make build-nocache
   ```

2. Or with docker-compose:
   ```bash
   docker-compose build --no-cache
   ```

#### Database Connection Issues

**Symptoms:** Backend can't connect to database

**Solutions:**

1. Ensure database is healthy:
   ```bash
   docker-compose ps database
   make health
   ```

2. Check database logs:
   ```bash
   make logs-db
   ```

3. Reset database:
   ```bash
   docker-compose down -v
   docker-compose up -d database
   ```

### Performance Optimization

#### Build Performance

1. **Use BuildKit** (enabled by default):
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Parallel builds**:
   ```bash
   docker-compose up --build --parallel
   ```

3. **Optimize .dockerignore**:
   - Exclude unnecessary files
   - Reduces build context size
   - Faster context transfer

#### Runtime Performance

1. **Resource limits** (already configured):
   ```yaml
   mem_limit: 2g
   cpus: '1.0'
   ```

2. **Volume optimization**:
   - Use named volumes for databases
   - Avoid mounting entire workspace if possible

3. **Network optimization**:
   - Use custom networks (configured)
   - Reduces inter-container latency

### Cleanup

```bash
# Remove containers and volumes
make clean

# Remove images
make clean-images

# Complete cleanup
make clean-all

# Prune Docker system (careful!)
make prune
```

## Monitoring

### Container Stats

```bash
# Real-time stats
docker stats

# Service status
make status

# Health checks
make health
```

### Logs

```bash
# All logs
make logs

# Specific service
make logs-backend
make logs-client

# Follow logs
docker-compose logs -f service-backend
```

## Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [Multi-Stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [CNCF Cloud Native Best Practices](https://github.com/cncf/tag-app-delivery)

## Support

For issues or questions:
1. Check this documentation
2. Review logs with `make logs`
3. Try `make clean && make dev`
4. Open an issue on GitHub
