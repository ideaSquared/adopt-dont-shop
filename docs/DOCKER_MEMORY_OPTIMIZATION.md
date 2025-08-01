# Docker Memory Optimization Guide

## Memory Issues Diagnosis

Your Docker containers are experiencing `ENOMEM: not enough memory` errors, which is causing:
- Build failures
- File watching crashes
- Module resolution problems
- Container restarts

## Immediate Solutions

### 1. Increase Docker Memory Limits

#### Windows Docker Desktop
1. Open Docker Desktop
2. Go to Settings → Resources → Memory
3. Increase memory to at least **8GB** (recommended: 12GB+)
4. Apply & Restart

#### WSL2 Configuration (if using WSL2)
Create/edit `C:\Users\{username}\.wslconfig`:
```ini
[wsl2]
memory=12GB
processors=4
swap=4GB
```

### 2. Docker Compose Memory Limits

Add memory limits to services in docker-compose.yml:
```yaml
services:
  app-client:
    mem_limit: 2g
    memswap_limit: 2g
  app-admin:
    mem_limit: 2g
    memswap_limit: 2g
  app-rescue:
    mem_limit: 2g
    memswap_limit: 2g
```

### 3. Optimize File Watching

Reduce file watching overhead:
```yaml
environment:
  # Disable intensive file watching
  CHOKIDAR_USEPOLLING: false
  WATCHPACK_POLLING: false
  # Use legacy watching for better memory usage
  CHOKIDAR_INTERVAL: 1000
  CHOKIDAR_AWAITWRITEFINISH: 2000
```

### 4. Node.js Memory Optimization

Add Node.js memory flags:
```yaml
environment:
  NODE_OPTIONS: "--max-old-space-size=4096 --max-semi-space-size=128"
```

## Quick Fix Commands

### Stop All Containers and Clean Up
```bash
docker-compose down
docker system prune -af --volumes
docker builder prune -af
```

### Restart with Memory Optimization
```bash
# Set environment variables for this session
$env:NODE_OPTIONS="--max-old-space-size=4096"
$env:CHOKIDAR_USEPOLLING="false"

# Start with reduced memory footprint
docker-compose up --build
```

## Alternative Development Approach

If Docker continues to have memory issues, consider:

1. **Local Development with Hot Reload**:
   ```bash
   npm run dev:libs-watch
   ```

2. **Hybrid Approach**: Run backend in Docker, frontend locally
   ```bash
   # Start only backend services
   docker-compose up database redis service-backend nginx
   
   # Run frontend locally
   npm run dev:rescue
   ```

## Monitoring Memory Usage

### Check Container Memory Usage
```bash
docker stats
```

### Monitor System Memory
```bash
# Windows PowerShell
Get-Counter "\Memory\Available MBytes"

# Or use Task Manager → Performance → Memory
```

## Long-term Solutions

1. **Optimize Dependencies**: Remove unused packages
2. **Code Splitting**: Implement lazy loading
3. **Build Optimization**: Use webpack-bundle-analyzer
4. **Container Optimization**: Multi-stage builds with smaller base images

## Emergency Recovery

If containers keep crashing:
1. Stop all containers: `docker-compose down`
2. Increase Docker memory to 12GB+
3. Restart Docker Desktop
4. Clear all caches: `docker system prune -af`
5. Restart with: `docker-compose up --no-cache --build`
