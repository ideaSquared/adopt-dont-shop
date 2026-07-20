# Backend Deployment

> **Authoritative runbook:** [`docs/operations/deploy.md`](../operations/deploy.md). This page is a higher-level companion that covers prerequisites, environment shape, and rollback. The operator-side steps live in the runbook.

The backend ships as a Docker image alongside three frontend images. Production deploys are driven by `Makefile` targets at the repo root that dispatch GitHub Actions workflows (`deploy.yml`, `rollback.yml`).

## Prerequisites

### Runtime

- **Node.js**: v22 (pinned in `.nvmrc` and `package.json` engines `>=22 <23`). All backend services share the top-level `Dockerfile.service` (parameterised via the `SERVICE` / `SERVICE_DIR` build args), built on `node:22-alpine`.
- **PostgreSQL**: 16 with the **PostGIS** extension (`postgis/postgis:16-3.4` in `docker-compose.yml`). Location features depend on PostGIS — a plain Postgres install is not enough.
- **Redis**: 7+ (`redis:7-alpine`) — used by the gateway for the shared rate-limit store and by services for idempotency keys.

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
ENCRYPTION_KEY=...
UPLOAD_SIGNING_SECRET=...

# CORS (comma-separated)
CORS_ORIGIN=https://adoptdontshop.example,https://admin.adoptdontshop.example
```

### Optional tuning

```bash
JWT_EXPIRES_IN=1h          # default 1h
JWT_REFRESH_EXPIRES_IN=7d  # default 7d
GATEWAY_RATE_LIMIT_MAX=100     # per-IP requests per window (default 100)
GATEWAY_RATE_LIMIT_WINDOW="1 minute"  # any @lukeed/ms format
```

> DB pool sizing is not env-tunable today — `packages/db/src/client.ts`
> hardcodes the timeout defaults and delegates max-connection sizing to
> pg's built-in default (10). If you need to change these, edit
> `TIMEOUT_DEFAULTS` in `packages/db/src/client.ts` and redeploy.

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

Each service owns and runs its own migrations under `services/<name>/src/migrations/` via `node-pg-migrate`. There is no root-level `pnpm migrate` script — each schema-owning service exposes a `db:migrate` script that the container entrypoint runs automatically on start.

To run migrations by hand against a running container:

```bash
docker compose exec service-auth pnpm db:migrate            # auth service
docker compose exec service-pets pnpm db:migrate            # pets service
docker compose exec service-applications pnpm db:migrate    # …and so on
```

The schema-owning services are `auth`, `pets`, `rescue`, `applications`, `chat`, `notifications`, `moderation`, `matching`, `cms`, and `audit`. The gateway owns no tables, so `service-gateway` has no `db:migrate` script.

For destructive or long migrations see [`docs/migrations/schema-equivalence-runbook.md`](../migrations/schema-equivalence-runbook.md).

## Health and observability

- `GET /health/simple` — the sole health endpoint the gateway exposes
  (liveness only, no DB touch). Every backing service exposes the same
  path on its own container port.
- Swagger UI at `/docs` (served by `@fastify/swagger-ui` on the gateway,
  with the raw OpenAPI JSON at `/openapi.json`).
- `/metrics` — Prometheus text exposition on the gateway and each service.
- Sentry init via `lib.observability` when `SENTRY_DSN` is set.
- Logs are structured JSON. Aggregate via your platform of choice; a Loki
  transport is enabled when `LOKI_URL` is set.

## See also

- [`docs/operations/deploy.md`](../operations/deploy.md) — the operator-side runbook.
- [`docs/runbooks/deploy-rollback.md`](../runbooks/deploy-rollback.md) — incident rollback procedure.
- [`docs/runbooks/migration-failure.md`](../runbooks/migration-failure.md) — when migrations fail mid-deploy.
- [`docs/INFRA.md`](../INFRA.md) — infra topology (nginx, uploads, signed URLs).
- [`docs/security/`](../security/) — production security guidance (data protection, gRPC trust, webhook replay protection, image signing).
