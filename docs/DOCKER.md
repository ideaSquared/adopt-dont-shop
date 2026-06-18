# Docker Infrastructure Guide

Comprehensive guide to the Docker setup for this monorepo. Pairs with [the root README](../README.md) — that has the quick-start commands; this has the architectural detail.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Best Practices](#best-practices)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [CI overlay (docker-compose.ci.yml)](#ci-overlay-docker-composeciyml)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
pnpm docker:dev               # start full stack (foreground)
pnpm docker:dev:detach        # start in background
pnpm docker:dev:build         # rebuild images then start
pnpm docker:logs              # follow logs
pnpm docker:down              # stop containers
pnpm docker:reset             # stop AND wipe volumes (destroys DB)
```

See [package.json](../package.json) for the full script list.

## Architecture Overview

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds for optimal image size and cache reuse:

| Stage | Purpose |
| --- | --- |
| `base` | Foundation layer (Node, system tools, non-root user) |
| `development` | Dev runtime with hot-reload (`pnpm dev`) |
| `build` | Compile TypeScript / bundle assets |
| `production` | Minimal runtime image (Node for backend, nginx for frontend) |

Each microservice under `services/` has its own `Dockerfile.service` (shared build template). All three frontend apps share [Dockerfile.app](../Dockerfile.app) and select their app via the `APP_NAME` build arg.

### Services

**Infrastructure**
- `database` — PostgreSQL 16 with PostGIS (`postgis/postgis:16-3.4`)
- `redis` — Redis 7 for cache and sessions
- `nginx` — Reverse proxy with subdomain routing (api, admin, rescue)

**Application**
- `service-gateway` — Fastify API gateway on port 4000 (health: `/health`)
- `app-client` — Public portal on 3000
- `app-admin` — Admin dashboard on 3001
- `app-rescue` — Rescue portal on 3002

## Best Practices

### BuildKit Optimizations

All Dockerfiles enable BuildKit (`# syntax=docker/dockerfile:1.4`) and use cache mounts:

```dockerfile
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

RUN --mount=type=cache,target=/app/.turbo \
    pnpm exec turbo run build --filter=...@adopt-dont-shop/${APP_NAME}
```

Result: 40-60% faster builds on warm cache, smaller layer graph.

### Security

- Non-root users in all containers (`viteuser` for frontend apps, `appuser` for microservice containers).
- Nginx adds OWASP headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy).
- Health checks on every service so orchestrators can detect bad state.
- Production overlay (`docker-compose.prod.yml`) requires every secret as `${VAR:?error}` — no defaults, fails fast.

### Image Optimization

- [.dockerignore](../.dockerignore) excludes `node_modules`, build outputs, docs, and IDE files. Build context is ~50MB instead of ~500MB.
- Layer ordering: package.json → `pnpm install --frozen-lockfile` → source code, so dependency installs cache cleanly.

## Development Workflow

### Standard Loop

```bash
pnpm docker:dev               # start the stack
# edit code in your editor — HMR handles the rest
pnpm docker:logs              # tail logs when debugging
pnpm docker:down              # stop when done
```

### Hot Reload Details

The dev stack is configured for HMR on Windows/macOS/Linux. Since [ADS-766](https://linear.app/ideasquared/issue/ADS-766) the CHOKIDAR polling vars are **only set on macOS and Windows** — Linux uses native inotify and saves the steady-state CPU that polling burns.

| Layer | Mechanism | Latency |
| --- | --- | --- |
| Frontend apps (`app.*/src/**`) | Vite HMR — native inotify on Linux, polling on macOS/Windows (`CHOKIDAR_USEPOLLING`, `CHOKIDAR_INTERVAL`, `CHOKIDAR_AWAITWRITEFINISH`) | ~<500ms (Linux) / ~1-2s (macOS, Windows) |
| Frontend libs (`lib.*/src/**` except `lib.types`) | Vite aliases point at lib `src/` — HMR picks them up | ~1-2s |
| Backend services (`services/*/src/**`) | `tsx watch` (native fs events) | ~1s |
| `lib.types/src/**` | `lib-types-watcher` sidecar runs `tsc --watch`; backend picks up dist changes via workspace symlink | ~2-5s |

`pnpm setup` auto-detects the host OS and appends the polling vars to `.env` on macOS/Windows. To verify per-container:

```bash
docker compose exec app-client env | grep CHOKIDAR    # Linux: empty. macOS/Windows: USEPOLLING=true ...
```

If you need to force polling (e.g. testing a Linux VM that uses a shared filesystem) copy the relevant snippet from `docker-compose.override.yml.example`'s "macOS / Windows" section, or set `CHOKIDAR_USEPOLLING=true` in `.env`.

### Targeting Specific Services

```bash
docker compose --profile services up service-gateway database redis nats    # gateway stack only
docker compose up app-admin                                                 # one frontend
docker compose --profile services up --build service-gateway               # force rebuild a service
```

### Custom Local Configuration

Create `docker-compose.override.yml` (gitignored) for personal tweaks:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

Common overrides: increase memory limits, expose debug ports, mount extra volumes.

### Database Operations

```bash
# Each service auto-migrates on start via its entrypoint.
# To migrate a single service by hand (containers must be running):
docker compose exec service-auth pnpm db:migrate
pnpm docker:shell:db          # open psql
```

For a destructive reset (drop DB + re-init):

```bash
pnpm docker:reset             # WIPES VOLUMES
pnpm docker:dev:detach
pnpm db:reset
```

### Debugging

**Backend** — add to `docker-compose.override.yml` (override the target service's command to enable Node's `--inspect`):

```yaml
services:
  service-gateway:
    ports:
      - "9229:9229"
    command: >
      node --inspect=0.0.0.0:9229 --import tsx/esm --watch src/index.ts
```

Attach your IDE debugger to `localhost:9229`.

**Frontend** — React DevTools and browser DevTools work out of the box.

## Production Deployment

### Smoke Test Locally

```bash
pnpm prod:build               # build production images
pnpm prod:up                  # start production stack
pnpm prod:down                # stop
```

The production overlay (`docker-compose.prod.yml`) requires all secrets to be set explicitly — no defaults. Generate fresh secrets first:

```bash
pnpm secrets:generate >> .env.production
```

### Building Individual Images

```bash
# Gateway (example — each service under services/ uses Dockerfile.service)
docker build --build-arg SERVICE=@adopt-dont-shop/service.gateway --build-arg SERVICE_DIR=services/gateway \
  --target production -f Dockerfile.service -t adopt-dont-shop/service-gateway:latest .

# Frontend (any app)
docker build \
  --build-arg APP_NAME=app.client \
  --target production \
  -f Dockerfile.app \
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

- Gateway: `GET http://localhost:4000/health` → 200
- Frontend (nginx): `GET http://localhost/health` → 200
- Database: `pg_isready` (Docker healthcheck)

## CI/CD Integration

`.github/workflows/docker.yml`:

1. Build backend (development + production targets)
2. Build all three frontend apps in parallel via `Dockerfile.app`
3. Validate full-stack compose integration using `docker-compose.ci.yml`
4. Trivy security scan on built images

CI uses BuildKit cache for 40-60% faster builds:

```yaml
- uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
```

## CI overlay (docker-compose.ci.yml)

### Why it exists

The dev stack in `docker-compose.yml` is optimised for inner-loop development: it bind-mounts source code, overrides the backend `entrypoint`/`command` to wire up a runtime `lib.types` symlink, and mounts a writable `./uploads` directory from the host. None of that is appropriate for CI:

- Bind-mounted source shadows the built artifacts baked into the image, so we'd be testing the host's working tree instead of the image we just built.
- The host `./uploads` mount masks the image's `appuser`-owned uploads directory and causes `EACCES` when the backend tries to `mkdirSync` inside it.
- The dev `entrypoint`/`command` reference paths that only resolve when bind mounts are active — in CI they don't exist.

`docker-compose.ci.yml` is a minimal overlay applied on top of `docker-compose.yml` to undo exactly those dev-only behaviours.

### What it changes

For each microservice (e.g. `service-gateway`):

- `volumes: !reset []` — the `!reset` tag *replaces* the base volume list rather than appending to it (the default Compose merge for sequences). This is what removes the dev bind mounts, including the `./uploads` mount that breaks permissions.
- `entrypoint: ["/usr/bin/dumb-init", "--"]` — restores the Dockerfile ENTRYPOINT. The compose override entrypoint uses relative paths that only resolve under bind mounts.
- `command: ["npm", "run", "dev"]` — restores the Dockerfile CMD. The compose command override creates a runtime symlink for bind-mounted `lib.types`, which is irrelevant when the image already contains a copy of the built library in `node_modules`.

### Reproducing a CI E2E run locally

```bash
# Build images the same way CI does, then bring the stack up with the overlay
docker compose -f docker-compose.yml -f docker-compose.ci.yml build
docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d

# Tail logs / run the same smoke checks CI runs
docker compose -f docker-compose.yml -f docker-compose.ci.yml logs -f service-gateway

# Tear down (always include both files so the project name matches)
docker compose -f docker-compose.yml -f docker-compose.ci.yml down -v
```

If you skip the overlay, you'll either hit the `uploads` `EACCES` error or end up testing your local working tree rather than the built image.

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

Since [ADS-766](https://linear.app/ideasquared/issue/ADS-766) polling is opt-in per host: `pnpm setup` writes `CHOKIDAR_USEPOLLING=true` to `.env` on macOS/Windows; Linux leaves it unset on purpose. If HMR misfires on macOS or Windows:

- Confirm the env var is set inside the container: `docker compose exec app-client env | grep CHOKIDAR`
- If empty, re-run `pnpm setup` or copy the polling snippet from `docker-compose.override.yml.example` into a real `docker-compose.override.yml`
- Reduce watch scope in the relevant `vite.config.ts`

If HMR misfires on **Linux**, the cause is almost certainly not polling — check that the file system has inotify watches available (`cat /proc/sys/fs/inotify/max_user_watches`).


### Port Already in Use

```bash
# Find the offender (Linux/macOS)
lsof -i :5000
# Or remap in docker-compose.override.yml
services:
  service-gateway:
    ports:
      - "4001:4000"
```

### Stale Build Cache

```bash
docker compose build --no-cache
# Or rebuild a single service
docker compose build --no-cache service-gateway
```

### Database Connection Issues

```bash
pnpm docker:ps                # is database "healthy"?
docker compose logs database     # check init logs
pnpm docker:reset             # last resort — WIPES DATA
pnpm docker:dev:detach
pnpm db:reset
```

### Cleanup

```bash
pnpm docker:down              # stop containers, keep volumes
pnpm docker:reset             # stop + remove volumes (destroys DB)
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
pnpm docker:ps                # service status + ports
docker compose logs -f service-gateway   # service-specific logs
```

## Additional Resources

- [Docker best practices](https://docs.docker.com/develop/dev-best-practices/)
- [BuildKit docs](https://docs.docker.com/build/buildkit/)
- [Multi-stage builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Docker Compose docs](https://docs.docker.com/compose/)

## Support

1. Check this guide and the [root README](../README.md)
2. Tail logs: `pnpm docker:logs`
3. Try `pnpm docker:reset && pnpm docker:dev:build` (wipes data)
4. Open an issue on GitHub
