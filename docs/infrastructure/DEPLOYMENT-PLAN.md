# Deployment Plan

How Adopt Don't Shop is hosted, and where to find the setup guides (audience: whoever sets up or looks after the host). The recurring release procedure is [operations/deploy.md](../operations/deploy.md); an in-progress deploy gone wrong is [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).

## Setup guides

Three step-by-step guides, done in order on the same host. Each one assumes the one before it is finished.

| Order | Guide                                        | What it does                                                                                                                        | Visitors see afterwards                   |
| ----- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1     | [SERVER-SETUP.md](./SERVER-SETUP.md)         | First-time host setup: OS, firewall, Docker, `deploy` user, SSH lockdown, DNS, the GitHub secrets that let deploys reach the server | Nothing yet                               |
| 2     | [STAGING-SETUP.md](./STAGING-SETUP.md)       | Staging stack, TLS, the edge gateway, staging access control                                                                        | Landing page on the apex; private staging |
| 3     | [PRODUCTION-SETUP.md](./PRODUCTION-SETUP.md) | Production stack next to staging, monitoring, the switch from landing page to production, first admin, backups                      | Production on the apex; staging unchanged |

The rest of this document is reference material the guides link to.

## Model

- All deploys ship from `main`, dispatched via `make` (GitHub Actions + `gh`).
- CI builds each service/app image, tags it by full git SHA, pushes to GHCR.
- The host pulls pre-built images — nothing is built on the server.
- Rollback = redeploy a previous SHA (`make rollback`).
- Frontend uses same-origin API (empty `VITE_API_BASE_URL`); nginx proxies `/api/` to the gateway.

## Architecture

A single host (a netcup VPS; any x86-64 Linux VPS with Docker works) runs a shared gateway stack (nginx + certbot on :80/:443) plus one full application stack per environment on its own Docker network.

TLS terminates at the gateway only. Each stack's own nginx is plain HTTP on the internal Docker network (it serves `/uploads/` from the uploads volume) and publishes no host port; nothing else is reachable from outside except SSH.

```
main branch
  ├── make staging ─► GitHub Actions ─► build images (:<sha>) ─► push GHCR ─► SSH: write DEPLOY_SHA + compose up on /opt/ads/staging
  └── make prod    ─► GitHub Actions ─► (approval gate) ─────────► SSH: write DEPLOY_SHA + compose up on /opt/ads/production

Per-environment application stack (docker-compose.prod.yml / .staging.yml):

  nginx (per-stack) ─► service-gateway :4000 ─► 10 gRPC services
                                                (auth pets rescue applications notifications
                                                 moderation matching audit chat cms)
  service-ops :4100 (HTTP, host loopback only — never behind nginx) ─► the same 10 services
  app-client · app-admin · app-rescue
  database (PG16+PostGIS) · redis · nats (JetStream) · clamav
```

## Sizing

| Workload                                                                  | Approx. RAM                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| Staging stack (12 services, 3 apps, Postgres, Redis, NATS, ClamAV, nginx) | ~3.3 GB measured on the pre-launch host         |
| Production stack                                                          | as staging; estimated 4–5 GB under real traffic |
| Observability overlay (Prometheus, Loki, Tempo, Grafana, exporters)       | 1–1.5 GB (estimate)                             |
| GlitchTip overlay                                                         | ~1.5 GB (estimate)                              |

- **Gateway + staging** fits in 8 GB with the 4 GB swap file (server setup, step 6).
- **Gateway + staging + production with observability** needs 16 GB.
- Leave `GLITCHTIP_ENABLED` unset. For error tracking use a hosted Sentry project instead (its free tier is enough): put its DSN in `SENTRY_DSN` in the host `.env` and in `VITE_SENTRY_DSN` under the `production-vars` environment.
- The swap file is headroom for ClamAV's signature reloads, not for steady-state load.

After any deploy that adds load, check headroom: `free -h`, `docker stats --no-stream`, `vmstat 1 5` (the `si`/`so` columns should be 0 after the first line), and `dmesg | grep -i oom` from the netcup console (no output = no out-of-memory kills). Swap that is in use but not moving is fine. If swap keeps moving or anything was OOM-killed, move to a bigger host, or turn observability off and deploy with `allow_blind_deploy=true` plus a `bypass_reason` (audited; nothing pages anyone while it is off).

## Repo files

| File                                                                | Purpose                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                                           | Production stack — GHCR images (includes a per-stack nginx)               |
| `docker-compose.staging.yml`                                        | Staging stack — same shape, isolated network                              |
| `docker-compose.observability.yml` / `docker-compose.glitchtip.yml` | Optional per-env overlays (`OBSERVABILITY_ENABLED` / `GLITCHTIP_ENABLED`) |
| `nginx/`                                                            | Per-stack nginx config (`docker-compose.prod.yml`'s own nginx service)    |
| `observability/`                                                    | Config tree for the observability overlay                                 |
| `deploy/gateway/docker-compose.gateway.yml`                         | Shared edge gateway nginx + certbot (joins the prod network)              |
| `deploy/gateway/docker-compose.gateway.staging.yml`                 | Overlay for hosts that also run staging (joins the staging network)       |
| `deploy/gateway/nginx.conf`                                         | All-domain routing (prod + staging)                                       |
| `deploy/gateway/landing/`                                           | Pre-launch landing page served on the apex (see STAGING-SETUP.md)         |
| `deploy/gateway/snippets/staging-access.conf`                       | Staging IP allowlist + basic auth (see STAGING-SETUP.md)                  |
| `.github/workflows/deploy.yml`                                      | Build → push → deploy workflow                                            |
| `.github/workflows/rollback.yml`                                    | Redeploy a previous SHA                                                   |
| `Makefile`                                                          | `make staging`, `make prod`, `make rollback`                              |
| `services/<name>/src/migrations/`                                   | Per-service migrations (each service runs its own)                        |

**ADS-1312**: everything above except `deploy/gateway/*` is now `scp`'d fresh to `/opt/ads/<env>/` by `deploy.yml` and `rollback.yml` on every run — it is no longer a one-time hand-copy. `deploy/gateway/*` is shipped to `/opt/ads/gateway/` too. The edge stack is not restarted by a deploy, but its nginx reloads itself every 12h (so renewed certificates are served), which also picks up a shipped `nginx.conf` change — an invalid config is rejected by the reload and the running one kept. Do not hand-edit files under `/opt/ads/gateway/`: the next deploy overwrites them. **The hostnames in `deploy/gateway/nginx.conf` are `adoptdontshop.app` and its subdomains** (`scripts/check-csp-headers.mjs` checks the same list) — if you deploy under a different domain, change both in the repo, and keep `PROD_HOSTNAME` identical.

## GitHub reference

### Environments (Settings → Environments)

| Environment         | Protection                                                                      | Created in          |
| ------------------- | ------------------------------------------------------------------------------- | ------------------- |
| `staging`           | None — deploys immediately                                                      | STAGING-SETUP.md    |
| `staging-vars`      | None — holds the staging build's `VITE_*` variables                             | STAGING-SETUP.md    |
| `production`        | Required reviewers; enable **Prevent self-review** (up to six reviewer entries) | PRODUCTION-SETUP.md |
| `production-bypass` | Required reviewers — the small set allowed to sign off on safety-check bypasses | PRODUCTION-SETUP.md |
| `production-vars`   | None — holds the production build's `VITE_*` variables                          | PRODUCTION-SETUP.md |
| `backups`           | None — the nightly backup runs here (a schedule cannot pass a reviewer gate)    | PRODUCTION-SETUP.md |

An environment without saved reviewers does not block anything, so the gate only takes effect once reviewers are saved.

### Secrets (Settings → Secrets → Actions)

Infrastructure secrets (repository level, set in SERVER-SETUP.md):

| Secret                         | Value                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETCUP_HOST`                  | Server IP / hostname                                                                                                                                                                                                                                                                                                                                                                                    |
| `NETCUP_HOST_FINGERPRINT`      | SSH host key fingerprint (pinned, ADS-670)                                                                                                                                                                                                                                                                                                                                                              |
| `NETCUP_SSH_KEY`               | Private key for the `deploy` user                                                                                                                                                                                                                                                                                                                                                                       |
| `GHCR_TOKEN`                   | PAT scoped **`read:packages` only** — pulls images on the host. Both `deploy.yml` and `rollback.yml` FAIL the run if it carries `write:packages`, `delete:packages`, or `repo` scope (ADS-671).                                                                                                                                                                                                         |
| `BACKUP_BUCKET` / `AWS_REGION` | Repo **variables** (not secrets) for the nightly backup workflow                                                                                                                                                                                                                                                                                                                                        |
| `DISCORD_WEBHOOK_URL`          | Optional. `deploy.yml` posts to it on any job failure (ADS-1324), and `docker.yml` posts every production smoke test result (pass or fail) — reuse the same webhook you write to `observability/alertmanager/secrets/discord_webhook_url_critical` on the host (see [observability-enable.md](../runbooks/observability-enable.md#4-wire-alertmanager-webhook-secrets)). Skipped gracefully when unset. |

Application secrets — `deploy.yml` validates all seven are present, then materialises them into `./secrets/<name>` file-mounts on the host (they are **not** hand-written into `.env`). `rollback.yml` requires the same set (ADS-1311) except `SENTRY_AUTH_TOKEN`, which is a build-time-only secret (see below). Staging's values are repository secrets (STAGING-SETUP.md); production's are environment secrets on both `production` and `production-bypass` (PRODUCTION-SETUP.md), which take priority over the repository ones:

| Secret                  | Purpose                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`            | Signs short-lived access tokens                                                                                                                                                                         |
| `JWT_REFRESH_SECRET`    | Signs refresh tokens                                                                                                                                                                                    |
| `ENCRYPTION_KEY`        | AES-256-GCM key for encrypted PII (64 hex chars)                                                                                                                                                        |
| `UPLOAD_SIGNING_SECRET` | Signs upload URLs                                                                                                                                                                                       |
| `DB_PASSWORD`           | Postgres password, composed raw into `database_url`. Use the `POSTGRES_PASSWORD` value printed by `pnpm secrets:generate` (hex, URL-safe); `deploy-secrets.sh` rejects anything outside `A-Za-z0-9._~-` |
| `NATS_AUTH_TOKEN`       | Shared token for the `nats` container + every publisher/subscriber (materialised into `secrets/nats_auth_token`; ADS-1311 fixed `rollback.yml` never writing this file)                                 |
| `PRINCIPAL_SIGNING_KEY` | HMAC key for the signed `x-principal-token` (ADS-800)                                                                                                                                                   |

Optional application secret — NOT validated by `deploy.yml`; when unset, `scripts/deploy-secrets.sh` writes an empty `secrets/ops_discord_webhook_url` and the deploy still succeeds:

| Secret                    | Purpose                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPS_DISCORD_WEBHOOK_URL` | Discord webhook `service-ops` posts break-glass unlock alerts to (ADR 0016). Set it per GitHub environment (staging / production). Without it `service-ops` refuses every unlock, so privileged reads stay masked. |

Generate strong values with `pnpm secrets:generate` (it prints `POSTGRES_PASSWORD`, which is the value for `DB_PASSWORD`; the same URL-safe rule applies to the host `.env` `REDIS_PASSWORD`; see [SECRETS-MANAGEMENT.md](../SECRETS-MANAGEMENT.md)); never reuse staging or dev values in production. Repo: `ideaSquared/adopt-dont-shop`; images under `ghcr.io/ideasquared/adopt-dont-shop/…`.

Build-time-only secret (`build-and-push` in `deploy.yml`, not shipped to the host):

| Secret              | Purpose                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Optional. Uploads frontend sourcemaps to GlitchTip so production stack traces are symbolicated (ADS-1319). Without it, the build logs a loud warning and skips the upload — it never fails the build. |

## Server reference

### Directory structure

```
/opt/ads/
  gateway/      docker-compose.gateway.yml, nginx.conf, snippets/, landing/,
                staging-access/ (host-only, never in git)
  staging/      docker-compose.staging.yml, docker-compose.observability.yml,
                docker-compose.glitchtip.yml, nginx/, observability/, scripts/,
                .env, .last_sha, secrets/
  production/   docker-compose.prod.yml, docker-compose.observability.yml,
                docker-compose.glitchtip.yml, nginx/, observability/, scripts/,
                .env, .last_sha, secrets/
```

`.last_sha` and `secrets/*` are written by the deploy workflow; do not hand-edit them. **ADS-1312**: everything else listed above is now `scp`'d fresh by `deploy.yml`/`rollback.yml` on every run (see "Repo files"), so it no longer needs a manual copy — only `.env`, the alerting secret files under `production/observability/alertmanager/secrets/`, `gateway/staging-access/` and the initial directory skeleton are hand-provisioned. The host `.env` files carry only non-secret config; `DEPLOY_SHA` is written by the deploy workflow on each run. Their contents are in STAGING-SETUP.md step 4 and PRODUCTION-SETUP.md step 6.

### Network exposure

Docker publishes container ports around ufw, so the firewall is not what keeps the databases private — the compose files are: only the gateway publishes ports (80/443), and the observability/GlitchTip UIs bind `127.0.0.1` only (reach them over an SSH tunnel). `service-ops` (the developer ops CLI backend, [ADR 0016](../adr/0016-developer-ops-cli.md)) is the one other deliberate exception, for the same reason as the observability UIs: it publishes `127.0.0.1:4101` (staging) / `127.0.0.1:4102` (production) on the host loopback only, never `0.0.0.0`, never behind nginx or the edge gateway, and developers reach it over a tunnel-only SSH user ([ops-cli runbook](../runbooks/ops-cli.md)). Do not add a `ports:` mapping to any other service, and never widen `service-ops` beyond `127.0.0.1`.

### SSH hardening

The SSH hardening file is `/etc/ssh/sshd_config.d/00-hardening.conf`. sshd keeps the FIRST value it reads for each option and reads `sshd_config.d/` in name order, so the file must sort before any provider drop-in (e.g. `50-cloud-init.conf` sets `PasswordAuthentication yes`). The host key fingerprint is read on the server itself, from the provider's console, because `ssh-keyscan` across the network trusts whatever answers, which is the impersonation the pinned fingerprint exists to stop.

### TLS

The gateway serves one certificate for every name, from `/etc/letsencrypt/live/<first name>/`, so the first `-d` given to certbot must be the bare domain the gateway config names (`adoptdontshop.app`). Do not add AAAA records until Docker has IPv6 enabled. From the first issuance on, the `certbot` container renews via the webroot every 12h and nginx reloads itself every 12h to serve the renewed certificate. `TlsCertificateExpiringSoon` (observability overlay) alerts if renewal stops working — see [runbooks/tls-cert-renewal.md](../runbooks/tls-cert-renewal.md).

`nginx/nginx.prod.conf` uses a `__PROD_HOSTNAME__` placeholder (nginx does not expand env vars in `server_name`). `deploy.yml`/`rollback.yml` re-apply the substitution on every run from the `PROD_HOSTNAME` key in `/opt/ads/production/.env` (ADS-1312); there is no manual `sed` step.

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies its own schema on container start (entrypoint runs `pnpm run --if-present db:migrate`). There is no `00-baseline` migration and no `SequelizeMeta` table — those belonged to the deleted monolith. On first boot each service creates its own `pgmigrations` bookkeeping table (inside its schema) automatically and runs `001+` forward. Nothing to seed by hand. The deploy workflow's health gate waits for each service to come up before passing.

Migrations seed roles and permissions but no user, and `db:seed` refuses to run in production; PRODUCTION-SETUP.md step 14 creates the first super admin.

Backups are automated by `.github/workflows/backup.yml` (nightly `0 2 * * *`) — see [db-backup-runbook.md](../db-backup-runbook.md); no host cron is required.
