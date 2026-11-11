# Deployment Plan — one-time provisioning

One-time setup to stand up a new Adopt Don't Shop environment: server, DNS, TLS, and the GitHub environments/secrets the deploy workflows need (audience: whoever bootstraps a host). The recurring release procedure is [operations/deploy.md](../operations/deploy.md); an in-progress deploy gone wrong is [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).

> **Start here.** Setting up the netcup VPS before launch (public landing page + private staging, no production yet)? Follow [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md) from top to bottom. It is a complete step-by-step guide. The rest of this document is the production setup for launch day.

## Model

- All deploys ship from `main`, dispatched via `make` (GitHub Actions + `gh`).
- CI builds each service/app image, tags it by full git SHA, pushes to GHCR.
- The host pulls pre-built images — nothing is built on the server.
- Rollback = redeploy a previous SHA (`make rollback`).
- Frontend uses same-origin API (empty `VITE_API_BASE_URL`); nginx proxies `/api/` to the gateway.

## Architecture

A single host (a netcup VPS; any x86-64 Linux VPS with Docker works) runs a shared gateway stack (nginx + certbot on :80/:443) plus one full application stack per environment on its own Docker network. Staging is optional: a production-only host runs just the production stack and the gateway without its staging overlay.

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

Estimates, not measurements — confirm on your host after the first deploy:

| Workload                                                                     | Approx. RAM   |
| ---------------------------------------------------------------------------- | ------------- |
| Production stack (12 services, 3 apps, Postgres, Redis, NATS, ClamAV, nginx) | 4–5 GB        |
| Observability overlay (Prometheus, Loki, Tempo, Grafana, exporters)          | 1–1.5 GB      |
| GlitchTip overlay                                                            | ~1.5 GB       |
| A staging stack                                                              | as production |

An **8 GB host** runs production plus the observability overlay, and nothing else:

- Set `OBSERVABILITY_ENABLED=true` — production deploys fail preflight without it (ADS-1307).
- Leave `GLITCHTIP_ENABLED` unset. For error tracking use a hosted Sentry project instead (its free tier is enough): put its DSN in `SENTRY_DSN` in the host `.env` and in `VITE_SENTRY_DSN` under the `production-vars` environment.
- No staging stack on the same host.
- Add the 4 GB swap file (step 6 of [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md)) — headroom for ClamAV's signature reloads, not for steady-state load.

A **staging-only host** (pre-launch: gateway + staging, no production) also fits in 8 GB with the swap file.

After the first deploy, check headroom: `free -h`, `docker stats --no-stream`, and `dmesg | grep -i oom` (no output = no out-of-memory kills). If swap stays in use or anything was OOM-killed, either move to a 16 GB host or turn observability off and deploy with `allow_blind_deploy=true` plus a `bypass_reason` (audited; nothing pages anyone while it is off). Staging, or GlitchTip, needs 16 GB.

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
| `deploy/gateway/landing/`                                           | Pre-launch landing page served on the apex (see "Pre-launch")             |
| `deploy/gateway/snippets/staging-access.conf`                       | Staging IP allowlist + basic auth (see "Pre-launch")                      |
| `.github/workflows/deploy.yml`                                      | Build → push → deploy workflow                                            |
| `.github/workflows/rollback.yml`                                    | Redeploy a previous SHA                                                   |
| `Makefile`                                                          | `make staging`, `make prod`, `make rollback`                              |
| `services/<name>/src/migrations/`                                   | Per-service migrations (each service runs its own)                        |

**ADS-1312**: everything above except `deploy/gateway/*` is now `scp`'d fresh to `/opt/ads/<env>/` by `deploy.yml` and `rollback.yml` on every run — it is no longer a one-time hand-copy. `deploy/gateway/*` is shipped to `/opt/ads/gateway/` too. The edge stack is not restarted by a deploy, but its nginx reloads itself every 12h (so renewed certificates are served), which also picks up a shipped `nginx.conf` change — an invalid config is rejected by the reload and the running one kept. Do not hand-edit files under `/opt/ads/gateway/`: the next deploy overwrites them. **The hostnames in `deploy/gateway/nginx.conf` are `adoptdontshop.app` and its subdomains** (`scripts/check-csp-headers.mjs` checks the same list) — if you deploy under a different domain, change both in the repo, and keep `PROD_HOSTNAME` identical.

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

| Secret                         | Value                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETCUP_HOST`                  | Server IP / hostname                                                                                                                                                                                                                                                                                                                                                                                    |
| `NETCUP_HOST_FINGERPRINT`      | SSH host key fingerprint (pinned, ADS-670)                                                                                                                                                                                                                                                                                                                                                              |
| `NETCUP_SSH_KEY`               | Private key for the `deploy` user                                                                                                                                                                                                                                                                                                                                                                       |
| `GHCR_TOKEN`                   | PAT scoped **`read:packages` only** — pulls images on the host. Both `deploy.yml` and `rollback.yml` FAIL the run if it carries `write:packages`, `delete:packages`, or `repo` scope (ADS-671).                                                                                                                                                                                                         |
| `BACKUP_BUCKET` / `AWS_REGION` | Repo **variables** (not secrets) for the nightly backup workflow                                                                                                                                                                                                                                                                                                                                        |
| `DISCORD_WEBHOOK_URL`          | Optional. `deploy.yml` posts to it on any job failure (ADS-1324), and `docker.yml` posts every production smoke test result (pass or fail) — reuse the same webhook you write to `observability/alertmanager/secrets/discord_webhook_url_critical` on the host (see [observability-enable.md](../runbooks/observability-enable.md#4-wire-alertmanager-webhook-secrets)). Skipped gracefully when unset. |

Application secrets — `deploy.yml` validates all seven are present, then materialises them into `./secrets/<name>` file-mounts on the host (they are **not** hand-written into `.env`). `rollback.yml` requires the same set (ADS-1311) except `SENTRY_AUTH_TOKEN`, which is a build-time-only secret (see below):

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

Generate strong values with `pnpm secrets:generate` (it prints `POSTGRES_PASSWORD`, which is the value for `DB_PASSWORD`; the same URL-safe rule applies to the host `.env` `REDIS_PASSWORD`; see [SECRETS-MANAGEMENT.md](../SECRETS-MANAGEMENT.md)); do not reuse staging/dev values. Repo: `ideaSquared/adopt-dont-shop`; images under `ghcr.io/ideasquared/adopt-dont-shop/…`.

Build-time-only secret (`build-and-push` in `deploy.yml`, not shipped to the host):

| Secret              | Purpose                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Optional. Uploads frontend sourcemaps to GlitchTip so production stack traces are symbolicated (ADS-1319). Without it, the build logs a loud warning and skips the upload — it never fails the build. |

## Server setup

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

`.last_sha` and `secrets/*` are written by the deploy workflow; do not hand-edit them. **ADS-1312**: everything else listed above is now `scp`'d fresh by `deploy.yml`/`rollback.yml` on every run (see "Repo files"), so it no longer needs a manual copy — only `.env` and the initial directory skeleton are hand-provisioned.

### Initial server setup

The server setup commands (updates, firewall, Docker, the `deploy` user, SSH lockdown, swap, `/opt/ads` directories, host fingerprint) are steps 2–8 of [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md). A production-only host runs the same steps, then continues with "Host `.env`" below, the first deploy, and "DNS & TLS". Start the edge gateway only after the first deploy (it joins the Docker network that deploy creates) and after the certificate exists (nginx will not start without it).

Docker publishes container ports around ufw, so the firewall is not what keeps the databases private — the compose files are: only the gateway publishes ports (80/443), and the observability/GlitchTip UIs bind `127.0.0.1` only (reach them over an SSH tunnel). `service-ops` (the developer ops CLI backend, [ADR 0016](../adr/0016-developer-ops-cli.md)) is the one other deliberate exception, for the same reason as the observability UIs: it publishes `127.0.0.1:4101` (staging) / `127.0.0.1:4102` (production) on the host loopback only, never `0.0.0.0`, never behind nginx or the edge gateway, and developers reach it over a tunnel-only SSH user ([ops-cli runbook](../runbooks/ops-cli.md)). Do not add a `ports:` mapping to any other service, and never widen `service-ops` beyond `127.0.0.1`.

The SSH hardening file is `/etc/ssh/sshd_config.d/00-hardening.conf`. sshd keeps the FIRST value it reads for each option and reads `sshd_config.d/` in name order, so the file must sort before any provider drop-in (e.g. `50-cloud-init.conf` sets `PasswordAuthentication yes`). The host key fingerprint is read on the server itself, from the provider's console, because `ssh-keyscan` across the network trusts whatever answers, which is the impersonation the pinned fingerprint exists to stop.

### Host `.env` (non-secret config)

**Production host only.** Pre-launch staging writes its `.env` in step 12 of [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md).

Application secrets come from GitHub (above) as `secrets/*` files. The host `/opt/ads/<env>/.env` carries only non-secret config; `DEPLOY_SHA` is written by the deploy workflow on each run:

```env
POSTGRES_USER=ads_prod
POSTGRES_DB=adopt_dont_shop_prod
REDIS_PASSWORD=<generated, e.g. openssl rand -hex 32>
# Literal values only — write out each origin in full.
CORS_ORIGIN=https://adoptdontshop.app,https://admin.adoptdontshop.app,https://rescue.adoptdontshop.app
# Base URL for links in emails (verify email, reset password). Required:
# compose refuses to start without it.
FRONTEND_URL=https://adoptdontshop.app
# Rescue app origin for staff invitation email links. Required: compose
# refuses to start without it.
RESCUE_FRONTEND_URL=https://rescue.adoptdontshop.app
# PROD_HOSTNAME (production only) — a plain literal. deploy.yml/rollback.yml
# read it to re-apply the __PROD_HOSTNAME__ substitution into
# nginx/nginx.prod.conf on every run (ADS-1312). It must match the hostnames
# in deploy/gateway/nginx.conf, or the per-stack nginx drops the gateway's
# /uploads/ requests.
PROD_HOSTNAME=adoptdontshop.app
# service-notifications refuses to boot in production without these
# (ADS-1302); the deploy fails before `up -d` if either key is missing.
EMAIL_PROVIDER=resend
RESEND_API_KEY=<from resend.com — the sending domain must be verified there>
DEFAULT_FROM_EMAIL=noreply@adoptdontshop.app
# Push is off (PUSH_PROVIDER defaults to none) until an app registers device
# tokens. To turn it on, uncomment all three; the JSON must be ONE line
# (jq -c . service-account.json):
# PUSH_PROVIDER=fcm
# FCM_PROJECT_ID=<Firebase project id>
# FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# service-ops (developer ops CLI, ADR 0016). Non-secret, and REQUIRED: the service
# refuses to boot without the three keys, and deploy.yml fails before `up -d` if
# any is missing. Create the GitHub OAuth app and team first (ops-cli runbook).
# One team per environment, so each host .env names its own team.
# OPS_GITHUB_CLIENT_ID=<client id of the OAuth app, device flow enabled>
# OPS_GITHUB_ORG=ideaSquared
# OPS_GITHUB_TEAM=<team slug for this environment>
# OPS_SESSION_TTL_HOURS=8
# DEPLOY_SHA is set to a specific git SHA by deploy.yml — there is NO :latest fallback.
# Grafana admin password — REQUIRED in production, because production deploys require
# OBSERVABILITY_ENABLED=true and docker-compose.observability.yml fails `compose up`
# without it. Also needs the Alertmanager webhook files on the host; see
# docs/runbooks/observability-enable.md.
OBSERVABILITY_ENABLED=true
GF_SECURITY_ADMIN_PASSWORD=<generated, e.g. openssl rand -hex 24>
# Other optional observability toggles (off by default): GLITCHTIP_ENABLED, LOKI_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
# Production deploys FAIL preflight when OBSERVABILITY_ENABLED isn't `true`
# unless the operator dispatches with allow_blind_deploy=true (ADS-1307).
```

## DNS & TLS

Point A records at the host. Do not add AAAA records until Docker has IPv6 enabled (see "IPv6" in the pre-launch runbook). `nginx/nginx.prod.conf` uses a `__PROD_HOSTNAME__` placeholder (nginx does not expand env vars in `server_name`). **ADS-1312**: this file is now shipped fresh by `deploy.yml`/`rollback.yml` on every run, so the previous one-time hand `sed` would be silently overwritten by the next deploy — the substitution is now re-applied automatically on every run, driven by the `PROD_HOSTNAME` key in `/opt/ads/production/.env` (see above). Set that key once; there is no longer a manual `sed` step.

Records: `${PROD_HOSTNAME}`, `www.`, `api.`, `admin.`, `rescue.` (and `staging.`, `staging-api.`, `staging-admin.`, `staging-rescue.` if you run staging). The gateway serves one certificate for every name, from `/etc/letsencrypt/live/<first name>/`, so the first `-d` below must be the bare domain the gateway config names.

**First issuance** — once DNS resolves to the host and after the first deploy, with nothing yet on port 80 (the gateway's nginx cannot start without a certificate, so this uses certbot's own standalone server):

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml run --rm --no-deps -p 80:80 \
  --entrypoint certbot certbot certonly --standalone \
  -d adoptdontshop.app -d www.adoptdontshop.app -d api.adoptdontshop.app \
  -d admin.adoptdontshop.app -d rescue.adoptdontshop.app \
  --email <an address you read — expiry warnings go here> --agree-tos --no-eff-email
docker compose -f docker-compose.gateway.yml up -d
# Host that also runs staging (after its first deploy):
# docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml up -d
```

The staging vhosts use the same certificate, so a host that runs staging must include its names too: add `-d staging.adoptdontshop.app -d staging-api.adoptdontshop.app -d staging-admin.adoptdontshop.app -d staging-rescue.adoptdontshop.app` to the command above. Adding staging later means expanding the existing certificate first — with the gateway running, `docker compose -f docker-compose.gateway.yml run --rm --no-deps certbot certonly --webroot -w /var/www/certbot --expand` with every `-d` (production and staging), then `docker compose -f docker-compose.gateway.yml exec nginx nginx -s reload`.

From then on the `certbot` container renews via the webroot every 12h and nginx reloads itself every 12h to serve the renewed certificate. `TlsCertificateExpiringSoon` (observability overlay) alerts if renewal stops working — see [runbooks/tls-cert-renewal.md](../runbooks/tls-cert-renewal.md).

## Pre-launch runbook (netcup VPS)

Moved to [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md): a step-by-step guide for the pre-launch host (landing page + private staging), including the waiting list and the switch to production at launch.

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies its own schema on container start (entrypoint runs `pnpm run --if-present db:migrate`). There is no `00-baseline` migration and no `SequelizeMeta` table — those belonged to the deleted monolith. On first boot each service creates its own `pgmigrations` bookkeeping table (inside its schema) automatically and runs `001+` forward. Nothing to seed by hand. The deploy workflow's health gate waits for each service to come up before passing.

### First super_admin

Migrations seed roles and permissions but no user, and `db:seed` refuses to run in production, so a fresh stack has no admin to verify rescue sign-ups. After the first deploy, create one with the compiled one-shot CLI in `service-auth` (run it once, from `/opt/ads/production`):

```bash
read -rsp 'Admin password: ' ADMIN_PW; echo
printf '%s' "$ADMIN_PW" | docker compose -f docker-compose.prod.yml exec -T service-auth   node dist/db/bootstrap-admin.js --password-stdin   --email you@example.org --first-name Ada --last-name Admin
unset ADMIN_PW
```

The password is read from stdin only (never an argument or environment variable), so it stays out of the process list; `read -s` keeps it out of shell history. It must satisfy the same policy as registration (at least 8 characters). The command refuses with a non-zero exit if an active `super_admin` already exists, never overwrites, and records an `auth.actionTaken` audit event. Name and email may instead come from `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_FIRST_NAME` and `BOOTSTRAP_ADMIN_LAST_NAME`. Sign in at the admin app to verify the first rescues.

Backups are automated by `.github/workflows/backup.yml` (nightly `0 2 * * *`) — see [db-backup-runbook.md](../db-backup-runbook.md); no host cron is required.

## Pre-flight checklist

For the production launch. Pre-launch setup is covered by [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md).

- [ ] Repo confirmed as `ideaSquared/adopt-dont-shop`
- [ ] The production stack boots and serves end to end: `Production Image Smoke` is green on `main`, or run `pnpm smoke:prod` locally (see [testing.md](../testing.md#production-smoke-test))
- [ ] GitHub environments created: `staging`, `production`, `production-bypass` (reviewers + prevent self-review on the latter two)
- [ ] `staging-vars` / `production-vars` environments created, **no** required reviewers, each with `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_STATSIG_CLIENT_KEY` set to that target's values (ADS-1318)
- [ ] Infra secrets added: `NETCUP_HOST`, `NETCUP_HOST_FINGERPRINT`, `NETCUP_SSH_KEY`, `GHCR_TOKEN` (**`read:packages` only**); repo variables `BACKUP_BUCKET`, `AWS_REGION`; optional `DISCORD_WEBHOOK_URL` secret for deploy failure notifications (ADS-1324)
- [ ] Seven application secrets added: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `DB_PASSWORD`, `PRINCIPAL_SIGNING_KEY`, `NATS_AUTH_TOKEN`; optional build-time `SENTRY_AUTH_TOKEN` (ADS-1319)
- [ ] Host hardened (updates, ufw 22/80/443, key-only SSH, no root login, swap) — see [PRE-LAUNCH-SETUP.md](./PRE-LAUNCH-SETUP.md) steps 4–7
- [ ] Host provisioned, `deploy` user + Docker installed, `/opt/ads/*` created
- [ ] DNS records point at the host
- [ ] `PROD_HOSTNAME` (plain literal) set in `/opt/ads/production/.env` — `deploy.yml` substitutes it into the freshly-shipped `nginx.prod.conf` on every run (ADS-1312); certbot issuance done
- [ ] Per-env `.env` created (non-secret config) — compose/nginx/observability files are shipped by the first deploy, not hand-copied (ADS-1312)
- [ ] `OBSERVABILITY_ENABLED=true` set in `/opt/ads/production/.env` before the first production deploy, or the deploy will fail preflight (ADS-1307; override with `allow_blind_deploy` + a reason if truly needed)
- [ ] `GF_SECURITY_ADMIN_PASSWORD` set in `/opt/ads/production/.env` — the observability overlay refuses to start without it
- [ ] Alertmanager secret files written on the host under `/opt/ads/production/observability/alertmanager/secrets/` (`discord_webhook_url_critical`, `discord_webhook_url_warning`, `deadman_webhook_url`) **before** the first deploy. That directory doesn't exist until the first deploy ships `observability/`, so create it first: `mkdir -p /opt/ads/production/observability/alertmanager/secrets`. Then follow [observability-enable.md](../runbooks/observability-enable.md#4-wire-alertmanager-webhook-secrets); `deploy.yml` ships the directory but never creates or deletes these files
- [ ] `DB_PASSWORD` is the hex `POSTGRES_PASSWORD` from `pnpm secrets:generate` (URL-safe; `deploy-secrets.sh` rejects other characters, as it does for `REDIS_PASSWORD`)
- [ ] Host `.env` includes `RESEND_API_KEY` and `DEFAULT_FROM_EMAIL`; for push, also `PUSH_PROVIDER=fcm`, `FCM_PROJECT_ID` and single-line `FCM_SERVICE_ACCOUNT_JSON`
- [ ] Production reviewers configured — with a single maintainer, leave **Prevent self-review** off or nobody can approve
- [ ] First deploy: `make prod` (approve in the Actions UI); with staging, `make staging` first and verify end-to-end
- [ ] Certificate issued and edge gateway started — see "DNS & TLS" (after the first deploy: the gateway joins the network it creates)
- [ ] First `super_admin` created with `node dist/db/bootstrap-admin.js` — see "First super_admin" (without one nobody can verify rescues)
- [ ] Backups configured (`BACKUP_BUCKET`/`AWS_REGION` + host AWS credentials) — until then the nightly `backup.yml` run fails
