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
docker compose up -d
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
docker compose up -d --build service-backend
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

### Follow logs for a service
```bash
docker logs adopt-dont-shop-app-admin-1 -f
docker logs adopt-dont-shop-service-backend-1 -f
```

### Last N lines
```bash
docker logs adopt-dont-shop-service-backend-1 --tail 50
```

### Filter backend logs for errors
```bash
docker logs adopt-dont-shop-service-backend-1 2>&1 | grep -i "error\|warn" | tail -30
```

### Check if a specific route is being hit
```bash
docker logs adopt-dont-shop-service-backend-1 2>&1 | grep "GET /api/v1/field-permissions" | tail -20
```

---

## Testing a production build

Test the exact image that would ship — build the production stage of Dockerfile.app.optimized:

```bash
# Build production image for a specific app
docker build \
  --build-arg APP_NAME=app.admin \
  --target production \
  -t ads-app-admin:test \
  -f Dockerfile.app.optimized \
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
  -f Dockerfile.app.optimized \
  .
```

---

## Checking what env vars a running container sees

```bash
docker exec adopt-dont-shop-app-admin-1 env | grep -E "VITE|DOCKER|NODE"
```

Critical vars to verify for correct proxy/CSRF behaviour:
- `DOCKER_ENV=true` — must be set so Vite proxy targets `service-backend`
- `VITE_API_BASE_URL=` — must be empty (not `http://localhost:5000`)

---

## Verifying the backend is healthy

```bash
curl -s http://localhost:5000/health | jq .
```

Expected response includes `"status": "healthy"` and all services (database, redis, etc.)
showing healthy. If the backend is unhealthy, check its logs before debugging frontend issues.

---

## Checking if a database table exists

```bash
docker exec adopt-dont-shop-database-1 \
  psql -U adopt_user -d adopt_dont_shop_dev \
  -c "\dt field_permissions"
```

---

## Running backend migrations manually

If a migration hasn't run (table missing, column missing):
```bash
docker exec adopt-dont-shop-service-backend-1 \
  npm run db:migrate
```

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

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` in Vite proxy logs | `DOCKER_ENV` not set or proxy targeting `localhost` | `--force-recreate` to pick up env changes |
| CSRF 403 on POST | `VITE_API_BASE_URL` is absolute URL, not empty | Set to `''` in docker-compose and `--force-recreate` |
| Stale lib changes not reflected | Vite alias missing for the lib | Add alias to `vite.config.ts` `libraryAliases` |
| Container exits immediately | Check logs — usually a missing env var or port conflict | `docker logs <container> --tail 20` |
| `restart` didn't apply env changes | `restart` doesn't re-read compose config | Use `--force-recreate` instead |
