# Docker Infrastructure Guide

Authoritative reference for the Docker dev stack (audience: engineers running or debugging the stack locally). Pairs with [the root README](../README.md) — that has the quick-start commands; this has the architectural detail. Production deploys are owned by [`docs/operations/deploy.md`](./operations/deploy.md).

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Best Practices](#best-practices)
- [Development Workflow](#development-workflow)
- [Smoke-testing production images locally](#smoke-testing-production-images-locally)
- [Reproducing CI E2E locally](#reproducing-ci-e2e-locally)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
pnpm docker:dev               # start the dev stack (foreground)
pnpm docker:dev:detach        # start in background
pnpm docker:dev:build         # rebuild images then start
pnpm docker:logs              # follow logs
pnpm docker:down              # stop containers
pnpm docker:reset             # stop AND wipe volumes (destroys DB)
```

See [package.json](../package.json) for the full script list.

### What `pnpm docker:dev` starts

By default `pnpm docker:dev` boots the **`dev` profile**: all three apps, every
microservice + the gateway, and infra (Postgres, Redis, NATS, lib-types-watcher).
It deliberately **excludes** the observability stack (Loki, Prometheus, Grafana,
Tempo, Alertmanager) and nginx — you don't need six extra containers to work on
a feature, and services only ship to Loki/Tempo when `LOKI_URL` / `OTEL_*` are
set anyway. Bring everything up with `pnpm docker:dev --profile full`; boot a
single frontend (still with the gateway + services) with `pnpm docker:dev:client`
/ `:admin` / `:rescue`.

Cold-start note: the shared dev image bakes `node_modules`, but your source is
bind-mounted and picked up live by the watchers (Vite HMR, `tsx watch`,
`lib.types` `tsc --watch`). A `git pull` that changes only source needs **no
rebuild** — `pnpm docker:dev` only rebuilds the image when `pnpm-lock.yaml` or
`Dockerfile.dev` changed, and otherwise just reconciles the containers that
actually differ. It prints which of the two happened on every run.

## Architecture Overview

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds for optimal image size and cache reuse:

| Stage         | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `base`        | Foundation layer (Node, system tools, non-root user)         |
| `development` | Dev runtime with hot-reload (`pnpm dev`)                     |
| `build`       | Compile TypeScript / bundle assets                           |
| `production`  | Minimal runtime image (Node for backend, nginx for frontend) |

Every microservice under `services/` is built from a single parameterised [`Dockerfile.service`](../Dockerfile.service) at the repo root; each service is selected via the `SERVICE` and `SERVICE_DIR` build args. All three frontend apps share [Dockerfile.app](../Dockerfile.app) and select their app via the `APP_NAME` build arg.

### Services

**Infrastructure**

- `database` — PostgreSQL 16 with PostGIS (`postgis/postgis:16-3.4`)
- `redis` — Redis 7 for cache and sessions
- `nats` — JetStream event bus between microservices
- `nginx` — Reverse proxy for subdomain routing. Profile-gated (`proxy` / `full`) in dev — it does **not** run under the default `dev` profile; bring it up with `pnpm docker:dev --profile full` (or `proxy`).

**Application**

- `service-gateway` — Fastify API gateway on port 4000 (dev health: `/health/ready`)
- `app-client` — Public portal on 3000
- `app-admin` — Admin dashboard on 3001
- `app-rescue` — Rescue portal on 3002

The ten domain gRPC services (`service-auth`, `service-pets`, …) sit behind the `services` / `full` profiles and are also started by `pnpm docker:dev`.

### Subdomain routing

When nginx is running (`--profile full` / `proxy`), the apps are reachable on `*.localhost` subdomains — modern browsers resolve these to `127.0.0.1` automatically, so no `/etc/hosts` edit is needed:

| Host               | Serves                   | Direct-port fallback    |
| ------------------ | ------------------------ | ----------------------- |
| `localhost`        | Public client app        | `http://localhost:3000` |
| `admin.localhost`  | Admin dashboard          | `http://localhost:3001` |
| `rescue.localhost` | Rescue management portal | `http://localhost:3002` |
| `api.localhost`    | Gateway API              | `http://localhost:4000` |

Without nginx, use the direct ports. If `*.localhost` does not resolve in your browser, add the three subdomains to `/etc/hosts` pointing at `127.0.0.1`.

## Best Practices

### BuildKit Optimizations

All Dockerfiles enable BuildKit (`# syntax=docker/dockerfile:1.4`) and use cache mounts:

```dockerfile
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

RUN --mount=type=cache,target=/app/.turbo \
    pnpm exec turbo run build --filter=...@adopt-dont-shop/app.${APP_NAME}
```

Result: 40-60% faster builds on warm cache, smaller layer graph.

### Security

- Non-root users in all containers (`viteuser` for frontend apps, `svcuser` for microservice containers).
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

| Layer                                             | Mechanism                                                                                                                              | Latency                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Frontend apps (`app.*/src/**`)                    | Vite HMR — native inotify on Linux, polling on macOS/Windows (`CHOKIDAR_USEPOLLING`, `CHOKIDAR_INTERVAL`, `CHOKIDAR_AWAITWRITEFINISH`) | ~<500ms (Linux) / ~1-2s (macOS, Windows) |
| Frontend libs (`lib.*/src/**` except `lib.types`) | Vite aliases point at lib `src/` — HMR picks them up                                                                                   | ~1-2s                                    |
| Backend services (`services/*/src/**`)            | `tsx watch` (native fs events)                                                                                                         | ~1s                                      |
| `lib.types/src/**`                                | `lib-types-watcher` sidecar runs `tsc --watch`; backend picks up dist changes via workspace symlink                                    | ~2-5s                                    |

`pnpm bootstrap` auto-detects the host OS and appends the polling vars to `.env` on macOS/Windows. To verify per-container:

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
pnpm docker:dev:detach        # each service re-migrates its schema on start
pnpm db:seed                  # (optional) reload dev seed data
```

### Debugging

**Backend** — add to `docker-compose.override.yml` (override the target service's command to enable Node's `--inspect`):

```yaml
services:
  service-gateway:
    ports:
      - '9229:9229'
    command: >
      node --inspect=0.0.0.0:9229 --import tsx/esm --watch src/index.ts
```

Attach your IDE debugger to `localhost:9229`.

**Frontend** — React DevTools and browser DevTools work out of the box.

## Smoke-testing production images locally

> This section is for building and running the production-mode images on your **own machine**. The real production deploy runs `docker compose -f docker-compose.prod.yml` on the netcup host from `/opt/ads/production` and is driven by `.github/workflows/deploy.yml` — see [`docs/operations/deploy.md`](./operations/deploy.md), the authoritative release procedure.

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

# Frontend (any app — APP_NAME is the bare app name; Dockerfile.app adds the `app.` prefix)
docker build \
  --build-arg APP_NAME=client \
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
ENCRYPTION_KEY=...                   # required (exactly 64 hex chars)
NATS_AUTH_TOKEN=...                  # required
REDIS_PASSWORD=...                   # required in prod
UPLOAD_SIGNING_SECRET=...            # required in prod
PRINCIPAL_SIGNING_KEY=...            # required in prod
RESEND_API_KEY=...                   # required in prod (Resend dashboard)
DEFAULT_FROM_EMAIL=...               # required in prod (Resend-verified sender)
FCM_PROJECT_ID=...                   # required in prod
FCM_SERVICE_ACCOUNT_JSON=...         # required in prod (Firebase service-account JSON)
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
```

`pnpm secrets:generate` emits every generated secret in this list. The four notifications provider values are not generated: the staging and production compose files run `service-notifications` with `EMAIL_PROVIDER=resend` and `PUSH_PROVIDER=fcm`, and it refuses to boot without them. Set them in the host `.env`; the deploy workflow writes `RESEND_API_KEY` and `FCM_SERVICE_ACCOUNT_JSON` to `secrets/resend_api_key` and `secrets/fcm_service_account_json`. `pnpm validate:env` also requires `CORS_ORIGIN`, `FRONTEND_URL`, `RESCUE_FRONTEND_URL`, `STATSIG_SERVER_SECRET_KEY` and `PROD_DB_NAME` in production; see [`env-reference.md`](./env-reference.md) for the full variable reference.

### Health Checks

- Gateway: `GET http://localhost:4000/health/ready` → 200 (probes DB/NATS/Redis, not just liveness; ADS-1327)
- Frontend (nginx): `GET http://localhost/health` → 200
- Database: `pg_isready` (Docker healthcheck)

## CI/CD Integration

`.github/workflows/docker.yml` runs on changes to Dockerfiles / compose files / `.dockerignore` and has three jobs:

1. `build-apps` — builds each frontend app's development and production targets via `Dockerfile.app` (matrix over the three apps).
2. `build-services` — builds each microservice's development and production targets via `Dockerfile.service` (matrix), then runs a Trivy scan on the built image and fails on fixable CRITICAL/HIGH vulnerabilities.
3. `build-dev-image` — builds the shared dev image and pushes it to GHCR on non-PR runs.

`docker.yml` does **not** stand up the stack — full-stack compose integration is exercised by the `test-e2e` job in `.github/workflows/ci.yml` (see [Reproducing CI E2E locally](#reproducing-ci-e2e-locally)). Both Dockerfiles use BuildKit cache mounts (see [BuildKit Optimizations](#buildkit-optimizations)) rather than an external buildx cache action.

## Reproducing CI E2E locally

CI and local runs share one mechanism: `docker-compose.e2e.yml`, layered last on top of `docker-compose.yml` + `docker-compose.dev.yml` and driven by `scripts/e2e-isolated.mjs` (the `e2e-suite` composite action builds the shared dev image, then calls the script). It boots a **throwaway, isolated** copy of the stack, so an e2e run never shares rate-limit counters, data or saved logins with your dev stack.

```bash
pnpm docker:down            # the isolated stack is sized to fit alone, not beside the dev stack
pnpm e2e:isolated           # boot, seed, run the @smoke subset, tear down
pnpm e2e:isolated:full      # the whole suite, plus the production-limits gateway
pnpm e2e:isolated --keep    # leave it running to poke at it; stop with pnpm e2e:isolated:down
```

What is different from `pnpm docker:dev`:

| Aspect                    | Dev stack                              | Isolated e2e stack (`ads-e2e`)                                                                                               |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Compose project           | checkout directory (`adopt-dont-shop`) | `ads-e2e` (the script refuses anything else, and never the dev project's name)                                               |
| Network, volumes, secrets | `adopt-dont-shop-network`, `./secrets` | `ads-e2e-network`, `ads-e2e_*` volumes, `./.e2e-stack/` (fresh secrets per run)                                              |
| Host ports                | 3000-3002, 4000, 5432, 6380, 4222…     | **13000-13002** (apps), **14000** (gateway), **14001** (limits gateway); nothing else                                        |
| Apps                      | Vite dev servers with HMR              | the same Vite dev servers, on the e2e ports, capped at 2 GB each                                                             |
| Data                      | `db:spam` plants thousands of rows     | only the SQL bootstrap plus the personas the runner seeds through the API                                                    |
| Not started               | n/a                                    | nginx, observability, ClamAV (uploads fail open), the in-compose seeder                                                      |
| Rate limits               | 1000 req/min, 100 logins/min           | lifted (100000) on the main gateway; production defaults on the `limits` gateway                                             |
| Memory                    | ~7-8 GB with everything                | explicit `mem_limit`/`cpus` per service; peak ~7 GiB while booting (6.9 GiB sampled on a CI runner; each run prints its own) |

The script checks for a running dev stack (any other compose project running `service-gateway`/`database`/`app-client`) and refuses with a pointer to `pnpm docker:down`; `--force` overrides. It also warns when Docker's memory limit is below what the stack needs. At the end it prints phase timings and the peak memory it sampled.

It reuses the dev image `adopt-dont-shop-dev:latest` (pulled from GHCR or built locally if missing; `--build` forces a rebuild, needed after a lockfile change). The source tree is bind-mounted, so the stack runs your working tree. Because of that, the script first runs `pnpm build:libs` on the host (the services import the compiled `lib.*` dist and nothing in the shared dev image builds it; turbo caches reruns), so `pnpm install` must have been run.

**The production-limits gateway.** The main e2e gateway has its limits lifted so parallel specs are not throttled, which would leave the limiter untested. Full runs (`--full`, or `--limits`) therefore also start `service-gateway-limits` (compose profile `limits`): a second gateway from the same image with the default limits and its own Redis database (so the main gateway's traffic cannot spend its budget), on port 14001. `e2e/tests/gateway-limits` points at it through `E2E_LIMITER_GATEWAY_URL` and skips itself when that is unset (any run against the shared dev stack).

Useful variants:

```bash
pnpm e2e:isolated tests/client/pet-discovery.spec.ts      # any Playwright args are passed through
pnpm e2e:isolated --workers 4                              # default is 3 locally (CI keeps 2)
pnpm e2e:isolated --keep && pnpm e2e:isolated --reuse tests/client   # iterate on a kept stack
pnpm e2e:isolated:down                                     # `down -v` scoped to ads-e2e
```

Saved logins go to `e2e/.auth-isolated/` (not `e2e/.auth/`). The Playwright config also blocks service workers for these runs (`E2E_BLOCK_SERVICE_WORKERS`), so a PWA worker can never cache `/api/v1/pets` between tests. Serving built bundles with `vite preview` instead of the dev servers was tried and dropped for now: the bundle threw `require("react")` in the browser on CI.

CI (`.github/actions/e2e-suite`) builds the dev image with `docker buildx bake` and a gha cache, then runs `node scripts/e2e-isolated.mjs` (`--full` for `test-e2e`, default `@smoke` for the required `test-e2e-smoke`). On failure the script prints container status and writes `docker-compose.log`, which the job uploads with the Playwright report. If you hit odd failures locally that CI doesn't see, check for a stale `adopt-dont-shop-dev` image after a lockfile change (`pnpm e2e:isolated --build`).

## Troubleshooting

For a symptom → diagnosis → fix runbook covering the full range of dev-stack
failures (migration failures, NATS startup races, nginx 502s, stale images,
and more), see
[`docs/runbooks/dev-stack-troubleshooting.md`](./runbooks/dev-stack-troubleshooting.md).
The sections below cover the handful of Docker-specific issues in more depth.

### Tailing logs for one tier instead of everything

`pnpm docker:logs` tails all ~14 containers at once, which is noisy when
you're debugging a single tier. Per-tier shortcuts (ADS-897):

```bash
pnpm docker:logs:gateway     # service-gateway only
pnpm docker:logs:apps        # app-client, app-admin, app-rescue
pnpm docker:logs:infra       # database, redis, nats
pnpm docker:logs:services    # every extracted microservice except the gateway
```

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

Since [ADS-766](https://linear.app/ideasquared/issue/ADS-766) polling is opt-in per host: `pnpm bootstrap` writes `CHOKIDAR_USEPOLLING=true` to `.env` on macOS/Windows; Linux leaves it unset on purpose. If HMR misfires on macOS or Windows:

- Confirm the env var is set inside the container: `docker compose exec app-client env | grep CHOKIDAR`
- If empty, re-run `pnpm bootstrap` or copy the polling snippet from `docker-compose.override.yml.example` into a real `docker-compose.override.yml`
- Reduce watch scope in the relevant `vite.config.ts`

If HMR misfires on **Linux**, the cause is almost certainly not polling — check that the file system has inotify watches available (`cat /proc/sys/fs/inotify/max_user_watches`).

### Port Already in Use

```bash
# Find the offender (Linux/macOS)
lsof -i :4000
# Or remap in docker-compose.override.yml
services:
  service-gateway:
    ports:
      - "4001:4000"
```

### Native Dev: ECONNREFUSED Proxying to the Gateway (IPv6-first hosts)

`apps/*/vite.config.ts` proxy `/api`, `/health` and `/monitoring` to the
gateway using the `127.0.0.1` literal (not `localhost`) when running
natively (outside Docker). This is deliberate: the gateway binds
`0.0.0.0` by default, which is IPv4-only. On IPv6-first hosts (recent
macOS, some Linux resolver configs) `localhost` can resolve to `::1`
first, and a Vite proxy pointed at `localhost` would then ECONNREFUSED
against a gateway that isn't listening on `::1`. If you see this locally,
confirm the gateway is actually up on `127.0.0.1:4000` (`curl
http://127.0.0.1:4000/health`) rather than chasing an IPv6 config change.

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
pnpm docker:dev:detach        # each service re-migrates its schema on start
pnpm db:seed                  # (optional) reload dev seed data
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
