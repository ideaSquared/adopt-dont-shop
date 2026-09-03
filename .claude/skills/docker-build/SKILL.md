---
name: docker-build
description: >
  Docker commands for building, testing, and managing containers in this project.
  Apply when the user asks to build Docker images, restart containers, check logs,
  or verify a build works before shipping.
disable-model-invocation: true
---

# Docker Build & Test Commands

## Current container status

!`docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"`

## Everyday workflow

### Start all services

```bash
# Bare `docker compose up -d` starts only infra (database/redis/nats) — the apps and
# services sit behind compose profiles. Use the preflight launcher, which selects the
# right profiles:
pnpm docker:dev:detach
```

### Rebuild a single app after config changes

Use `--force-recreate` to pick up new environment variables (restart alone does not re-read
docker-compose env changes):

```bash
docker compose up -d --force-recreate app-admin
docker compose up -d --force-recreate app-client
docker compose up -d --force-recreate app-rescue
```

### Rebuild a service image after Dockerfile changes

```bash
docker compose up -d --build app-admin
docker compose up -d --build service-gateway
```

### Restart a container (HMR/config already loaded — just bounce the process)

```bash
docker compose restart app-admin
```

**Note:** `restart` does NOT re-read docker-compose.yml environment changes. Use
`--force-recreate` when you've changed env vars, ports, or volumes.

### Stop everything

```bash
docker compose down
```

### Stop and wipe volumes (fresh database)

```bash
docker compose down -v
```

---

## Checking logs

### Follow logs for a service (use compose service names, not guessed container names)

```bash
docker compose logs -f app-admin
docker compose logs -f service-gateway
# Per-tier shortcuts: pnpm docker:logs:gateway / :apps / :infra / :services
```

### Last N lines

```bash
docker compose logs --tail 50 service-gateway
```

### Filter a service's logs for errors

```bash
docker compose logs service-gateway 2>&1 | grep -i "error\|warn" | tail -30
```

### Check if a specific route is being hit

```bash
docker compose logs service-gateway 2>&1 | grep "GET /api/v1/field-permissions" | tail -20
```

---

## Testing a production build

Test the exact image that would ship — build the production stage of Dockerfile.app:

```bash
# Build production image for a specific app
docker build \
  --build-arg APP_NAME=app.admin \
  --target production \
  -t ads-app-admin:test \
  -f Dockerfile.app \
  .

# Run it locally to verify
docker run --rm -p 8080:80 ads-app-admin:test

# Check it serves correctly
curl -s http://localhost:8080/health
```

The production stage uses Nginx to serve the built SPA. If it starts and `/health` returns
200, the build is good.

---

## Testing the development image

```bash
docker build \
  --build-arg APP_NAME=app.admin \
  --target development \
  -t ads-app-admin:dev \
  -f Dockerfile.app \
  .
```

---

## Checking what env vars a running container sees

```bash
docker exec adopt-dont-shop-app-admin-1 env | grep -E "VITE|DOCKER|NODE"
```

Critical vars to verify for correct proxy/CSRF behaviour:

- `VITE_API_BASE_URL=` — must be empty in Docker dev (the Vite dev server proxies `/api` to the gateway over the compose network); set an absolute URL only when running the apps outside Docker.

---

## Verifying the gateway is healthy

```bash
curl -s http://localhost:4000/health/simple | jq .
```

The gateway is the only HTTP surface (port 4000). If it is unhealthy, check its logs and the
downstream services before debugging frontend issues. Each domain service exposes its own
`/health/simple` on `:500x`.

---

## Checking if a database table exists

```bash
pnpm docker:shell:db     # opens psql in the database container, then: \dt <schema>.<table>
# Each service owns one schema (auth, pets, …); e.g. \dt auth.field_permissions
```

---

## Running a service's migrations manually

Each service migrates its own schema on start. To run one by hand (containers running):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec service-auth pnpm db:migrate
```

The gateway owns no schema and has no `db:migrate` — only the ten domain services migrate.

---

## Pruning build cache (when disk is full or builds are stale)

```bash
# Remove dangling images
docker image prune -f

# Remove all unused images (careful — removes cached layers too)
docker image prune -a -f

# Nuclear option — remove everything not currently running
docker system prune -a -f
```

---

## Common failure patterns

| Symptom                            | Likely cause                                            | Fix                                                                             |
| ---------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ECONNREFUSED` in Vite proxy logs  | Gateway not up, or proxy targeting the wrong host       | Confirm `service-gateway` is healthy; `--force-recreate` to pick up env changes |
| CSRF 403 on POST                   | `VITE_API_BASE_URL` is an absolute URL, not empty       | Set to `''` in docker-compose and `--force-recreate`                            |
| Stale lib changes not reflected    | Vite alias missing for the lib                          | Add alias to `vite.config.ts` `libraryAliases`                                  |
| Container exits immediately        | Check logs — usually a missing env var or port conflict | `docker compose logs <service> --tail 20`                                       |
| `restart` didn't apply env changes | `restart` doesn't re-read compose config                | Use `--force-recreate` instead                                                  |

---

Canonical doc: [`docs/DOCKER.md`](../../../docs/DOCKER.md)
