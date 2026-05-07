# Docker Infrastructure Guide

Comprehensive guide to the Docker setup for this monorepo. Pairs with [the root README](../README.md) — that has the quick-start commands; this has the architectural detail.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Best Practices](#best-practices)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
npm run docker:dev               # start full stack (foreground)
npm run docker:dev:detach        # start in background
npm run docker:dev:build         # rebuild images then start
npm run docker:logs              # follow logs
npm run docker:down              # stop containers
npm run docker:reset             # stop AND wipe volumes (destroys DB)
```

See [package.json](../package.json) for the full script list.

## Architecture Overview

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds for optimal image size and cache reuse:

| Stage | Purpose |
| --- | --- |
| `base` | Foundation layer (Node, system tools, non-root user) |
| `development` | Dev runtime with hot-reload (`npm run dev`) |
| `build` | Compile TypeScript / bundle assets |
| `production` | Minimal runtime image (Node for backend, nginx for frontend) |

Backend uses [service.backend/Dockerfile](../service.backend/Dockerfile). All three frontend apps share [Dockerfile.app.optimized](../Dockerfile.app.optimized) and select their app via the `APP_NAME` build arg.

### Services

**Infrastructure**
- `database` — PostgreSQL 16 with PostGIS (`postgis/postgis:16-3.4`)
- `redis` — Redis 7 for cache and sessions
- `nginx` — Reverse proxy with subdomain routing (api, admin, rescue)

**Application**
- `service-backend` — Express API on port 5000 (health: `/health`)
- `app-client` — Public portal on 3000
- `app-admin` — Admin dashboard on 3001
- `app-rescue` — Rescue portal on 3002

## Best Practices

### BuildKit Optimizations

All Dockerfiles enable BuildKit (`# syntax=docker/dockerfile:1.4`) and use cache mounts:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

RUN --mount=type=cache,target=/app/.turbo \
    npx turbo run build --filter=...@adopt-dont-shop/${APP_NAME}
```

Result: 40-60% faster builds on warm cache, smaller layer graph.

### Security

- Non-root users in all containers (`backend` for service-backend, `viteuser` for frontend apps).
- Nginx adds OWASP headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy).
- Health checks on every service so orchestrators can detect bad state.
- Production overlay (`docker-compose.prod.yml`) requires every secret as `${VAR:?error}` — no defaults, fails fast.

### Image Optimization

- [.dockerignore](../.dockerignore) excludes `node_modules`, build outputs, docs, and IDE files. Build context is ~50MB instead of ~500MB.
- Layer ordering: package.json → `npm ci` → source code, so dependency installs cache cleanly.

## Development Workflow

### Standard Loop

```bash
npm run docker:dev               # start the stack
# edit code in your editor — HMR handles the rest
npm run docker:logs              # tail logs when debugging
npm run docker:down              # stop when done
```

### Hot Reload Details

The dev stack is configured for HMR on Windows/macOS/Linux:

| Layer | Mechanism | Latency |
| --- | --- | --- |
| Frontend apps (`app.*/src/**`) | Vite HMR with polling (`CHOKIDAR_USEPOLLING=true`, `CHOKIDAR_INTERVAL=1000`) | ~1-2s |
| Frontend libs (`lib.*/src/**` except `lib.types`) | Vite aliases point at lib `src/` — HMR picks them up | ~1-2s |
| Backend (`service.backend/src/**`) | `ts-node-dev --poll` | ~2s |
| `lib.types/src/**` | `lib-types-watcher` sidecar runs `tsc --watch`; backend picks up dist changes via workspace symlink | ~2-5s |

### Targeting Specific Services

```bash
docker compose up service-backend database redis    # backend stack only
docker compose up app-admin                         # one frontend
docker compose up --build service-backend           # force rebuild a service
```

### Custom Local Configuration

Create `docker-compose.override.yml` (gitignored) for personal tweaks:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

Common overrides: increase memory limits, expose debug ports, mount extra volumes.

### Database Operations

```bash
npm run db:migrate               # sequelize migrations
npm run db:seed                  # seed dev data
npm run db:reset                 # migrate + seed
npm run docker:shell:db          # open psql
```

For a destructive reset (drop DB + re-init):

```bash
npm run docker:reset             # WIPES VOLUMES
npm run docker:dev:detach
npm run db:reset
```

### Debugging

**Backend** — add to `docker-compose.override.yml` (the repo doesn't ship a dedicated `dev:debug` script, so override the command to enable Node's `--inspect`):

```yaml
services:
  service-backend:
    ports:
      - "9229:9229"
    command: >
      npx ts-node-dev --inspect=0.0.0.0:9229 --respawn --transpile-only --poll
      --watch src src/index.ts
```

Attach your IDE debugger to `localhost:9229`.

**Frontend** — React DevTools and browser DevTools work out of the box.

## Production Deployment

### Smoke Test Locally

```bash
npm run prod:build               # build production images
npm run prod:up                  # start production stack
npm run prod:down                # stop
```

The production overlay (`docker-compose.prod.yml`) requires all secrets to be set explicitly — no defaults. Generate fresh secrets first:

```bash
npm run secrets:generate >> .env.production
```

### Building Individual Images

```bash
# Backend
docker build --target production -t adopt-dont-shop/backend:latest ./service.backend

# Frontend (any app)
docker build \
  --build-arg APP_NAME=app.client \
  --target production \
  -f Dockerfile.app.optimized \
  -t adopt-dont-shop/app-client:latest .
```

### Required Production Env Vars

```env
NODE_ENV=production
POSTGRES_USER=...                    # required
POSTGRES_PASSWORD=...                # required (strong)
POSTGRES_DB=...                      # required
JWT_SECRET=...                       # required
JWT_REFRESH_SECRET=...               # required
SESSION_SECRET=...                   # required
CSRF_SECRET=...                      # required
REDIS_PASSWORD=...                   # required in prod
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
```

### Health Checks

- Backend: `GET http://localhost:5000/health` → 200
- Frontend (nginx): `GET http://localhost/health` → 200
- Database: `pg_isready` (Docker healthcheck)

## CI/CD Integration

`.github/workflows/docker.yml`:

1. Build backend (development + production targets)
2. Build all three frontend apps in parallel via `Dockerfile.app.optimized`
3. Validate full-stack compose integration using `docker-compose.ci.yml`
4. Trivy security scan on built images

CI uses BuildKit cache for 40-60% faster builds:

```yaml
- uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
```

## Troubleshooting

### Out of Memory

Symptoms: container crashes, OOM kills.

Fixes:

1. Increase Docker Desktop memory (Settings → Resources).
2. Override per-service in `docker-compose.override.yml`:
   ```yaml
   services:
     app-client:
       mem_limit: 4g
       environment:
         NODE_OPTIONS: '--max-old-space-size=4096'
   ```

### Slow / No File Watching (Windows/macOS)

Polling is enabled by default (`CHOKIDAR_USEPOLLING=true`). If HMR still misfires:

- Confirm the env var is set inside the container: `docker compose exec app-client env | grep CHOKIDAR`
- Reduce watch scope in the relevant `vite.config.ts`


### Port Already in Use

```bash
# Find the offender (Linux/macOS)
lsof -i :5000
# Or remap in docker-compose.override.yml
services:
  service-backend:
    ports:
      - "5001:5000"
```

### Stale Build Cache

```bash
docker compose build --no-cache
# Or rebuild a single service
docker compose build --no-cache service-backend
```

### Database Connection Issues

```bash
npm run docker:ps                # is database "healthy"?
docker compose logs database     # check init logs
npm run docker:reset             # last resort — WIPES DATA
npm run docker:dev:detach
npm run db:reset
```

### Cleanup

```bash
npm run docker:down              # stop containers, keep volumes
npm run docker:reset             # stop + remove volumes (destroys DB)
docker system prune              # full system prune (be careful)
docker images "adopt-dont-shop/*" -q | xargs docker rmi -f   # remove project images
```

## Performance Notes

- **BuildKit** is enabled by default in Docker Desktop. If using Linux: `export DOCKER_BUILDKIT=1`.
- **Parallel builds**: `docker compose build --parallel`.
- **Resource limits** are set in [docker-compose.yml](../docker-compose.yml) (mem_limit + cpus). Adjust per service if needed.
- **Named volumes** for databases (not bind mounts) — much faster on Windows/macOS.

## Monitoring

```bash
docker stats                     # real-time CPU/memory
npm run docker:ps                # service status + ports
docker compose logs -f service-backend   # service-specific logs
```

## Additional Resources

- [Docker best practices](https://docs.docker.com/develop/dev-best-practices/)
- [BuildKit docs](https://docs.docker.com/build/buildkit/)
- [Multi-stage builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Docker Compose docs](https://docs.docker.com/compose/)

## Support

1. Check this guide and the [root README](../README.md)
2. Tail logs: `npm run docker:logs`
3. Try `npm run docker:reset && npm run docker:dev:build` (wipes data)
4. Open an issue on GitHub
