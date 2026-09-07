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

| File                                                                | Purpose                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                                           | Production stack — GHCR images (includes a per-stack nginx)               |
| `docker-compose.staging.yml`                                        | Staging stack — same shape, isolated network                              |
| `docker-compose.observability.yml` / `docker-compose.glitchtip.yml` | Optional per-env overlays (`OBSERVABILITY_ENABLED` / `GLITCHTIP_ENABLED`) |
| `nginx/`                                                            | Per-stack nginx config (`docker-compose.prod.yml`'s own nginx service)    |
| `observability/`                                                    | Config tree for the observability overlay                                 |
| `deploy/gateway/docker-compose.gateway.yml`                         | Shared edge gateway nginx + certbot                                       |
| `deploy/gateway/nginx.conf`                                         | All-domain routing (prod + staging)                                       |
| `.github/workflows/deploy.yml`                                      | Build → push → deploy workflow                                            |
| `.github/workflows/rollback.yml`                                    | Redeploy a previous SHA                                                   |
| `Makefile`                                                          | `make staging`, `make prod`, `make rollback`                              |
| `services/<name>/src/migrations/`                                   | Per-service migrations (each service runs its own)                        |

**ADS-1312**: everything above except `deploy/gateway/*` is now `scp`'d fresh to `/opt/ads/<env>/` by `deploy.yml` and `rollback.yml` on every run — it is no longer a one-time hand-copy. `deploy/gateway/*` is shipped to `/opt/ads/gateway/` too, but the shared edge stack itself is not auto-restarted (see "Initial server setup" below).

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

Application secrets — `deploy.yml` validates all seven are present, then materialises them into `./secrets/<name>` file-mounts on the host (they are **not** hand-written into `.env`). `rollback.yml` requires the same set (ADS-1311) except `SENTRY_AUTH_TOKEN`, which is a build-time-only secret (see below):

| Secret                  | Purpose                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`            | Signs short-lived access tokens                                                                                                                                         |
| `JWT_REFRESH_SECRET`    | Signs refresh tokens                                                                                                                                                    |
| `ENCRYPTION_KEY`        | AES-256-GCM key for encrypted PII (64 hex chars)                                                                                                                        |
| `UPLOAD_SIGNING_SECRET` | Signs upload URLs                                                                                                                                                       |
| `DB_PASSWORD`           | Postgres password (composed into `database_url`)                                                                                                                        |
| `NATS_AUTH_TOKEN`       | Shared token for the `nats` container + every publisher/subscriber (materialised into `secrets/nats_auth_token`; ADS-1311 fixed `rollback.yml` never writing this file) |
| `PRINCIPAL_SIGNING_KEY` | HMAC key for the signed `x-principal-token` (ADS-800)                                                                                                                   |

Generate strong values with `pnpm secrets:generate` (see [SECRETS-MANAGEMENT.md](../SECRETS-MANAGEMENT.md)); do not reuse staging/dev values. Repo: `ideaSquared/adopt-dont-shop`; images under `ghcr.io/ideasquared/adopt-dont-shop/…`.

Build-time-only secret (`build-and-push` in `deploy.yml`, not shipped to the host):

| Secret              | Purpose                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Optional. Uploads frontend sourcemaps to GlitchTip so production stack traces are symbolicated (ADS-1319). Without it, the build logs a loud warning and skips the upload — it never fails the build. |

## Server setup

### Directory structure

```
/opt/ads/
  gateway/      docker-compose.gateway.yml, nginx.conf, snippets/
  staging/      docker-compose.staging.yml, docker-compose.observability.yml,
                docker-compose.glitchtip.yml, nginx/, observability/,
                .env, .last_sha, secrets/
  production/   docker-compose.prod.yml, docker-compose.observability.yml,
                docker-compose.glitchtip.yml, nginx/, observability/,
                .env, .last_sha, secrets/
```

`.last_sha` and `secrets/*` are written by the deploy workflow; do not hand-edit them. **ADS-1312**: everything else listed above is now `scp`'d fresh by `deploy.yml`/`rollback.yml` on every run (see "Repo files"), so it no longer needs a manual copy — only `.env` and the initial directory skeleton are hand-provisioned.

### Initial server setup

```bash
# As root:
adduser deploy && usermod -aG docker deploy && usermod -aG sudo deploy
# Install the deploy user's SSH public key into ~deploy/.ssh/authorized_keys

curl -fsSL https://get.docker.com | sh          # Docker Engine + Compose v2

mkdir -p /opt/ads/{gateway/snippets,staging,production}
chown -R deploy:deploy /opt/ads

# deploy/gateway/* is shipped by the first deploy.yml/rollback.yml run to
# /opt/ads/gateway/ (ADS-1312) — copy it by hand only if you need the edge
# gateway running BEFORE the first CI-driven deploy:
#   deploy/gateway/*  → /opt/ads/gateway/

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
# PROD_HOSTNAME (production only) — a plain literal, e.g. example.com, NOT
# the ${PROD_HOSTNAME} shell-style reference used above (docker-compose does
# not expand one .env value inside another). deploy.yml/rollback.yml read it
# to re-apply the __PROD_HOSTNAME__ substitution into nginx/nginx.prod.conf
# on every run, now that the file is shipped fresh each deploy (ADS-1312).
PROD_HOSTNAME=example.com
# DEPLOY_SHA is set to a specific git SHA by deploy.yml — there is NO :latest fallback.
# Optional observability toggles (off by default): OBSERVABILITY_ENABLED, GLITCHTIP_ENABLED, LOKI_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
# Production deploys FAIL preflight when OBSERVABILITY_ENABLED isn't `true`
# unless the operator dispatches with allow_blind_deploy=true (ADS-1307).
```

## DNS & TLS

Point A/AAAA records at the host. `nginx/nginx.prod.conf` uses a `__PROD_HOSTNAME__` placeholder (nginx does not expand env vars in `server_name`). **ADS-1312**: this file is now shipped fresh by `deploy.yml`/`rollback.yml` on every run, so the previous one-time hand `sed` would be silently overwritten by the next deploy — the substitution is now re-applied automatically on every run, driven by the `PROD_HOSTNAME` key in `/opt/ads/production/.env` (see above). Set that key once; there is no longer a manual `sed` step.

Records: `${PROD_HOSTNAME}`, `api.`, `admin.`, `rescue.` (and the `staging.`-prefixed equivalents). Certbot in the gateway stack issues and auto-renews the certs.

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies its own schema on container start (entrypoint runs `pnpm run --if-present db:migrate`). There is no `00-baseline` migration and no `SequelizeMeta` table — those belonged to the deleted monolith. On first boot each service creates its own `pgmigrations` bookkeeping table (inside its schema) automatically and runs `001+` forward. Nothing to seed by hand. The deploy workflow's health gate waits for each service to come up before passing.

Backups are automated by `.github/workflows/backup.yml` (nightly `0 2 * * *`) — see [db-backup-runbook.md](../db-backup-runbook.md); no host cron is required.

## Pre-flight checklist

- [ ] Repo confirmed as `ideaSquared/adopt-dont-shop`
- [ ] GitHub environments created: `staging`, `production`, `production-bypass` (reviewers + prevent self-review on the latter two)
- [ ] `staging-vars` / `production-vars` environments created, **no** required reviewers, each with `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_STATSIG_CLIENT_KEY` set to that target's values (ADS-1318)
- [ ] Infra secrets added: `HETZNER_HOST`, `HETZNER_HOST_FINGERPRINT`, `HETZNER_SSH_KEY`, `GHCR_TOKEN` (**`read:packages` only**); repo variables `BACKUP_BUCKET`, `AWS_REGION`
- [ ] Seven application secrets added: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `DB_PASSWORD`, `PRINCIPAL_SIGNING_KEY`, `NATS_AUTH_TOKEN`; optional build-time `SENTRY_AUTH_TOKEN` (ADS-1319)
- [ ] Host provisioned, `deploy` user + Docker installed, `/opt/ads/*` created
- [ ] DNS records point at the host
- [ ] `PROD_HOSTNAME` (plain literal) set in `/opt/ads/production/.env` — `deploy.yml` substitutes it into the freshly-shipped `nginx.prod.conf` on every run (ADS-1312); certbot issuance done
- [ ] Per-env `.env` created (non-secret config) — compose/nginx/observability files are shipped by the first deploy, not hand-copied (ADS-1312)
- [ ] `OBSERVABILITY_ENABLED=true` set in `/opt/ads/production/.env` before the first production deploy, or the deploy will fail preflight (ADS-1307; override with `allow_blind_deploy` + a reason if truly needed)
- [ ] Edge gateway started: `cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml up -d`
- [ ] First deploy: `make staging` → verify end-to-end → `make prod` (approve in the Actions UI)
