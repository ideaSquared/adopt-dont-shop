# Deployment Plan — one-time provisioning

One-time setup to stand up a new Adopt Don't Shop environment: server, DNS, TLS, and the GitHub environments/secrets the deploy workflows need (audience: whoever bootstraps a host). The recurring release procedure is [operations/deploy.md](../operations/deploy.md); an in-progress deploy gone wrong is [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).

## Model

- All deploys ship from `main`, dispatched via `make` (GitHub Actions + `gh`).
- CI builds each service/app image, tags it by full git SHA, pushes to GHCR.
- The host pulls pre-built images — nothing is built on the server.
- Rollback = redeploy a previous SHA (`make rollback`).
- Frontend uses same-origin API (empty `VITE_API_BASE_URL`); nginx proxies `/api/` to the gateway.

## Architecture

A single Hetzner host runs a shared gateway stack (nginx + certbot on :80/:443) plus one full application stack per environment on its own Docker network.

```
main branch
  ├── make staging ─► GitHub Actions ─► build images (:<sha>) ─► push GHCR ─► SSH: write DEPLOY_SHA + compose up on /opt/ads/staging
  └── make prod    ─► GitHub Actions ─► (approval gate) ─────────► SSH: write DEPLOY_SHA + compose up on /opt/ads/production

Per-environment application stack (docker-compose.prod.yml / .staging.yml):

  nginx (per-stack) ─► service-gateway :4000 ─► 10 gRPC services
                                                (auth pets rescue applications notifications
                                                 moderation matching audit chat cms)
  app-client · app-admin · app-rescue
  database (PG16+PostGIS) · redis · nats (JetStream) · clamav
```

## Repo files

| File                                        | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `docker-compose.prod.yml`                   | Production stack — GHCR images (includes a per-stack nginx) |
| `docker-compose.staging.yml`                | Staging stack — same shape, isolated network                |
| `deploy/gateway/docker-compose.gateway.yml` | Shared edge gateway nginx + certbot                         |
| `deploy/gateway/nginx.conf`                 | All-domain routing (prod + staging)                         |
| `.github/workflows/deploy.yml`              | Build → push → deploy workflow                              |
| `.github/workflows/rollback.yml`            | Redeploy a previous SHA                                     |
| `Makefile`                                  | `make staging`, `make prod`, `make rollback`                |
| `services/<name>/src/migrations/`           | Per-service migrations (each service runs its own)          |

## GitHub setup

### Environments (Settings → Environments)

| Environment         | Protection                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| `staging`           | None — deploys immediately                                                      |
| `production`        | Required reviewers; enable **Prevent self-review** (up to six reviewer entries) |
| `production-bypass` | Required reviewers — the small set allowed to sign off on safety-check bypasses |

Configure reviewers once (repo admin): Settings → Environments → New environment → name it exactly `production` → Configure environment → tick **Required reviewers** + **Prevent self-review** → Save. Repeat for `production-bypass`. An unconfigured environment does not block anything, so the gate only takes effect once reviewers are saved.

### Secrets (Settings → Secrets → Actions)

Infrastructure secrets:

| Secret                         | Value                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HETZNER_HOST`                 | Server IP / hostname                                                                                                                                                                            |
| `HETZNER_HOST_FINGERPRINT`     | SSH host key fingerprint (pinned, ADS-670)                                                                                                                                                      |
| `HETZNER_SSH_KEY`              | Private key for the `deploy` user                                                                                                                                                               |
| `GHCR_TOKEN`                   | PAT scoped **`read:packages` only** — pulls images on the host. Both `deploy.yml` and `rollback.yml` FAIL the run if it carries `write:packages`, `delete:packages`, or `repo` scope (ADS-671). |
| `BACKUP_BUCKET` / `AWS_REGION` | Repo **variables** (not secrets) for the nightly backup workflow                                                                                                                                |

Application secrets — `deploy.yml` validates all six are present, then materialises them into `./secrets/<name>` file-mounts on the host (they are **not** hand-written into `.env`):

| Secret                  | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `JWT_SECRET`            | Signs short-lived access tokens                       |
| `JWT_REFRESH_SECRET`    | Signs refresh tokens                                  |
| `ENCRYPTION_KEY`        | AES-256-GCM key for encrypted PII (64 hex chars)      |
| `UPLOAD_SIGNING_SECRET` | Signs upload URLs                                     |
| `DB_PASSWORD`           | Postgres password (composed into `database_url`)      |
| `PRINCIPAL_SIGNING_KEY` | HMAC key for the signed `x-principal-token` (ADS-800) |

Generate strong values with `pnpm secrets:generate` (see [SECRETS-MANAGEMENT.md](../SECRETS-MANAGEMENT.md)); do not reuse staging/dev values. Repo: `ideaSquared/adopt-dont-shop`; images under `ghcr.io/ideasquared/adopt-dont-shop/…`.

## Server setup

### Directory structure

```
/opt/ads/
  gateway/      docker-compose.gateway.yml, nginx.conf, snippets/
  staging/      docker-compose.staging.yml, .env, .last_sha, secrets/
  production/   docker-compose.prod.yml, .env, .last_sha, secrets/
```

`.last_sha` and `secrets/*` are written by the deploy workflow; do not hand-edit them.

### Initial server setup

```bash
# As root:
adduser deploy && usermod -aG docker deploy && usermod -aG sudo deploy
# Install the deploy user's SSH public key into ~deploy/.ssh/authorized_keys

curl -fsSL https://get.docker.com | sh          # Docker Engine + Compose v2

mkdir -p /opt/ads/{gateway/snippets,staging,production}
chown -R deploy:deploy /opt/ads

# Copy from the repo to the host:
#   deploy/gateway/*          → /opt/ads/gateway/
#   docker-compose.prod.yml   → /opt/ads/production/
#   docker-compose.staging.yml→ /opt/ads/staging/

# Start the edge gateway first (creates the shared external networks)
cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml up -d
```

### Host `.env` (non-secret config)

Application secrets come from GitHub (above) as `secrets/*` files. The host `/opt/ads/<env>/.env` carries only non-secret config; `DEPLOY_SHA` is written by the deploy workflow on each run:

```env
POSTGRES_USER=ads_prod
POSTGRES_DB=adopt_dont_shop_prod
REDIS_PASSWORD=<generated>
CORS_ORIGIN=https://${PROD_HOSTNAME},https://admin.${PROD_HOSTNAME},https://rescue.${PROD_HOSTNAME}
# DEPLOY_SHA is set to a specific git SHA by deploy.yml — there is NO :latest fallback.
# Optional observability toggles (off by default): OBSERVABILITY_ENABLED, GLITCHTIP_ENABLED, LOKI_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
```

## DNS & TLS

Point A/AAAA records at the host. `nginx/nginx.prod.conf` uses a `__PROD_HOSTNAME__` placeholder (nginx does not expand env vars in `server_name`), substituted at deploy time — set `PROD_HOSTNAME` and replace it:

```bash
sed -i.bak "s/__PROD_HOSTNAME__/${PROD_HOSTNAME}/g" nginx/nginx.prod.conf
```

Records: `${PROD_HOSTNAME}`, `api.`, `admin.`, `rescue.` (and the `staging.`-prefixed equivalents). Certbot in the gateway stack issues and auto-renews the certs.

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies its own schema on container start (entrypoint runs `pnpm run --if-present db:migrate`). There is no `00-baseline` migration and no `SequelizeMeta` table — those belonged to the deleted monolith. On first boot each service creates its own `pgmigrations` bookkeeping table (inside its schema) automatically and runs `001+` forward. Nothing to seed by hand. The deploy workflow's health gate waits for each service to come up before passing.

Backups are automated by `.github/workflows/backup.yml` (nightly `0 2 * * *`) — see [db-backup-runbook.md](../db-backup-runbook.md); no host cron is required.

## Pre-flight checklist

- [ ] Repo confirmed as `ideaSquared/adopt-dont-shop`
- [ ] GitHub environments created: `staging`, `production`, `production-bypass` (reviewers + prevent self-review on the latter two)
- [ ] Infra secrets added: `HETZNER_HOST`, `HETZNER_HOST_FINGERPRINT`, `HETZNER_SSH_KEY`, `GHCR_TOKEN` (**`read:packages` only**); repo variables `BACKUP_BUCKET`, `AWS_REGION`
- [ ] Six application secrets added: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `DB_PASSWORD`, `PRINCIPAL_SIGNING_KEY`
- [ ] Host provisioned, `deploy` user + Docker installed, `/opt/ads/*` created
- [ ] DNS records point at the host
- [ ] `__PROD_HOSTNAME__` substituted in `nginx.prod.conf`; certbot issuance done
- [ ] Files copied to the host; per-env `.env` created (non-secret config)
- [ ] Edge gateway started: `cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml up -d`
- [ ] First deploy: `make staging` → verify end-to-end → `make prod` (approve in the Actions UI)
