# Backend Deployment

> **Authoritative runbook:** [`docs/operations/deploy.md`](../operations/deploy.md). This page is a higher-level companion that covers prerequisites, environment shape, and rollback. The operator-side steps live in the runbook.

The backend ships as a Docker image alongside three frontend images. Production deploys are driven by `Makefile` targets at the repo root that dispatch GitHub Actions workflows (`deploy.yml`, `rollback.yml`).

## Prerequisites

### Runtime

- **Node.js**: v22 (pinned in `.nvmrc` and `package.json` engines `>=22 <23`). The production images are `node:22-alpine` (each service ships its own `services/<name>/Dockerfile`).
- **PostgreSQL**: 16 with the **PostGIS** extension (`postgis/postgis:16-3.4` in `docker-compose.yml`). Location features depend on PostGIS — a plain Postgres install is not enough.
- **Redis**: 7+ (`redis:7-alpine`) — used for sessions, BullMQ job queues, and rate-limiting.

### Storage and external services

- File storage (local volume for dev, S3-compatible for production uploads).
- SMTP provider for transactional email (configured via env vars).
- Sentry DSN for error tracking (optional but recommended).

## Environment Configuration

The authoritative env reference is the root [`.env.example`](../../.env.example). It documents every variable, including ones omitted here. `pnpm validate:env` checks a populated `.env` against the required-variable list.

The backend selects one of `DEV_DB_NAME` / `TEST_DB_NAME` / `PROD_DB_NAME` based on `NODE_ENV` — there is no generic `DB_NAME` (ADS-409/452/465).

### Required for production

These are enforced by `docker-compose.yml`'s `:?Error: ... required` guards — Compose refuses to start without them:

```bash
NODE_ENV=production

# Database (or set PROD_DATABASE_URL to override the discrete vars)
DB_HOST=...
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
PROD_DB_NAME=adopt_dont_shop_prod

# Database TLS (ADS-540) — production refuses `disable` unless ALLOW_INSECURE_DB=true
DB_SSL_MODE=verify-full
DB_SSL_ROOT_CERT=/etc/ssl/certs/rds-combined-ca-bundle.pem

# Redis
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...

# Auth secrets — generate with `pnpm secrets:generate`
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
CSRF_SECRET=...
ENCRYPTION_KEY=...
UPLOAD_SIGNING_SECRET=...

# CORS (comma-separated)
CORS_ORIGIN=https://adoptdontshop.example,https://admin.adoptdontshop.example
```

### Optional tuning

```bash
JWT_EXPIRES_IN=1h          # default 1h
JWT_REFRESH_EXPIRES_IN=7d  # default 7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DB_POOL_MAX=10
DB_POOL_MIN=2
```

## Deploy

Deploys go through GitHub Actions, triggered by `Makefile` targets:

```bash
make staging                              # deploy main to staging
make prod                                 # deploy main to production (requires manual approval)
make rollback env=production sha=abc1234  # roll back to a specific commit
make history                              # list recent commits to pick a rollback target
```

Behind the scenes:

- `deploy.yml` SSHes into the Hetzner host using `HETZNER_HOST` / `HETZNER_SSH_KEY` / `HETZNER_HOST_FINGERPRINT` secrets, pulls the backend image from GHCR (`GHCR_TOKEN`), and starts `docker-compose.prod.yml`.
- `rollback.yml` uses the same flow but pins to a previously published image SHA.

> `pnpm prod:up` spins the production Docker stack up locally for a smoke test. It does **not** deploy anywhere — use `make prod` for that.

## Database migrations

Each service owns and runs its own migrations under `services/<name>/src/migrations/`. No `sequelize-cli`.

```bash
pnpm migrate              # apply pending migrations
pnpm db:migrate:undo      # roll back the most recent migration
pnpm db:migrate:status    # list applied / pending migrations
```

On a production deploy, run `pnpm migrate` inside the running backend container before traffic is shifted (the runbook covers the exact sequence). For destructive or long migrations see [`docs/migrations/schema-equivalence-runbook.md`](../migrations/schema-equivalence-runbook.md).

## Health and observability

- `GET /health` — basic liveness probe.
- `GET /health/simple` — minimal probe (no DB touch).
- `GET /health/ready` — readiness; checks DB + Redis.
- Swagger UI at `/api/docs`.
- Sentry init via `lib.observability` when `SENTRY_DSN` is set.
- Logs are structured JSON (Winston). Aggregate via your platform of choice.

## See also

- [`docs/operations/deploy.md`](../operations/deploy.md) — the operator-side runbook.
- [`docs/runbooks/deploy-rollback.md`](../runbooks/deploy-rollback.md) — incident rollback procedure.
- [`docs/runbooks/migration-failure.md`](../runbooks/migration-failure.md) — when migrations fail mid-deploy.
- [`docs/INFRA.md`](../INFRA.md) — infra topology (nginx, uploads, signed URLs).
- [`docs/security/`](../security/) — production security guidance (data protection, gRPC trust, webhook replay protection, image signing).
