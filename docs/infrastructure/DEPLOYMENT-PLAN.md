# Deployment Plan — one-time provisioning

One-time setup to stand up a new Adopt Don't Shop environment: server, DNS, TLS, and the GitHub environments/secrets the deploy workflows need (audience: whoever bootstraps a host). The recurring release procedure is [operations/deploy.md](../operations/deploy.md); an in-progress deploy gone wrong is [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).

## Model

- All deploys ship from `main`, dispatched via `make` (GitHub Actions + `gh`).
- CI builds each service/app image, tags it by full git SHA, pushes to GHCR.
- The host pulls pre-built images — nothing is built on the server.
- Rollback = redeploy a previous SHA (`make rollback`).
- Frontend uses same-origin API (empty `VITE_API_BASE_URL`); nginx proxies `/api/` to the gateway.

## Architecture

A single host (any x86-64 Linux VPS with Docker — the `HETZNER_*` secret names are historical) runs a shared gateway stack (nginx + certbot on :80/:443) plus one full application stack per environment on its own Docker network. Staging is optional: a production-only host runs just the production stack and the gateway without its staging overlay.

TLS terminates at the gateway only. Each stack's own nginx is plain HTTP on the internal Docker network (it serves `/uploads/` from the uploads volume) and publishes no host port; nothing else is reachable from outside except SSH.

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
| `deploy/gateway/docker-compose.gateway.yml`                         | Shared edge gateway nginx + certbot (joins the prod network)              |
| `deploy/gateway/docker-compose.gateway.staging.yml`                 | Overlay for hosts that also run staging (joins the staging network)       |
| `deploy/gateway/nginx.conf`                                         | All-domain routing (prod + staging)                                       |
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

| Secret                         | Value                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HETZNER_HOST`                 | Server IP / hostname                                                                                                                                                                                |
| `HETZNER_HOST_FINGERPRINT`     | SSH host key fingerprint (pinned, ADS-670)                                                                                                                                                          |
| `HETZNER_SSH_KEY`              | Private key for the `deploy` user                                                                                                                                                                   |
| `GHCR_TOKEN`                   | PAT scoped **`read:packages` only** — pulls images on the host. Both `deploy.yml` and `rollback.yml` FAIL the run if it carries `write:packages`, `delete:packages`, or `repo` scope (ADS-671).     |
| `BACKUP_BUCKET` / `AWS_REGION` | Repo **variables** (not secrets) for the nightly backup workflow                                                                                                                                    |
| `DISCORD_WEBHOOK_URL`          | Optional. `deploy.yml` posts to it on any job failure (ADS-1324) — reuse the same webhook `observability/alertmanager/secrets/discord_webhook_url` uses on the host. Skipped gracefully when unset. |

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
                docker-compose.glitchtip.yml, nginx/, observability/, scripts/,
                .env, .last_sha, secrets/
  production/   docker-compose.prod.yml, docker-compose.observability.yml,
                docker-compose.glitchtip.yml, nginx/, observability/, scripts/,
                .env, .last_sha, secrets/
```

`.last_sha` and `secrets/*` are written by the deploy workflow; do not hand-edit them. **ADS-1312**: everything else listed above is now `scp`'d fresh by `deploy.yml`/`rollback.yml` on every run (see "Repo files"), so it no longer needs a manual copy — only `.env` and the initial directory skeleton are hand-provisioned.

### Initial server setup

Run as root on a fresh Ubuntu 24.04 VPS. Order matters: harden first, and start the edge gateway only after the first deploy (it joins the Docker network that deploy creates) and after the certificate exists (nginx will not start without it).

```bash
# 1. Updates, automatic security patches, firewall (SSH + HTTP/S only).
apt-get update && apt-get -y upgrade
apt-get -y install unattended-upgrades ufw fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

Docker publishes container ports around ufw, so the firewall above is not what keeps the databases private — the compose files are: only the gateway publishes ports (80/443), and the observability/GlitchTip UIs bind `127.0.0.1` only (reach them over an SSH tunnel). Do not add a `ports:` mapping to any other service.

```bash
# 2. Deploy user (key-only SSH) and Docker.
adduser --disabled-password --gecos '' deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Paste the PUBLIC half of the key whose private half is the HETZNER_SSH_KEY secret:
nano /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
curl -fsSL https://get.docker.com | sh

# 3. SSH: keys only, no root login. Check you can log in as `deploy` with
#    your own key in a second terminal BEFORE closing this session.
printf 'PasswordAuthentication no\nPermitRootLogin no\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/99-hardening.conf
systemctl reload ssh

# 4. Swap — headroom for memory spikes (ClamAV signature reloads) on an 8–12 GB box.
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 5. Directory skeleton.
mkdir -p /opt/ads/{gateway,production}   # add staging only if you run it
chown -R deploy:deploy /opt/ads
```

`deploy` is in the `docker` group, which is root-equivalent on the host — protect `HETZNER_SSH_KEY` accordingly. Record the host key fingerprint for the `HETZNER_HOST_FINGERPRINT` secret (from your machine): `ssh-keyscan -t ed25519 <host> | ssh-keygen -lf - | awk '{print $2}'`.

Then: write `/opt/ads/production/.env` (next section), run the first deploy (`make prod`), issue the certificate and start the gateway (see "DNS & TLS").

### Host `.env` (non-secret config)

Application secrets come from GitHub (above) as `secrets/*` files. The host `/opt/ads/<env>/.env` carries only non-secret config; `DEPLOY_SHA` is written by the deploy workflow on each run:

```env
POSTGRES_USER=ads_prod
POSTGRES_DB=adopt_dont_shop_prod
REDIS_PASSWORD=<generated, e.g. openssl rand -hex 32>
# Literal values only — write out each origin in full.
CORS_ORIGIN=https://adoptdontshop.app,https://admin.adoptdontshop.app,https://rescue.adoptdontshop.app
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
FCM_PROJECT_ID=<Firebase project id>
# The service-account JSON on ONE line (the deploy reads a single line):
#   jq -c . service-account.json
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# DEPLOY_SHA is set to a specific git SHA by deploy.yml — there is NO :latest fallback.
# Optional observability toggles (off by default): OBSERVABILITY_ENABLED, GLITCHTIP_ENABLED, LOKI_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
# Production deploys FAIL preflight when OBSERVABILITY_ENABLED isn't `true`
# unless the operator dispatches with allow_blind_deploy=true (ADS-1307).
```

## DNS & TLS

Point A/AAAA records at the host. `nginx/nginx.prod.conf` uses a `__PROD_HOSTNAME__` placeholder (nginx does not expand env vars in `server_name`). **ADS-1312**: this file is now shipped fresh by `deploy.yml`/`rollback.yml` on every run, so the previous one-time hand `sed` would be silently overwritten by the next deploy — the substitution is now re-applied automatically on every run, driven by the `PROD_HOSTNAME` key in `/opt/ads/production/.env` (see above). Set that key once; there is no longer a manual `sed` step.

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

From then on the `certbot` container renews via the webroot every 12h and nginx reloads itself every 12h to serve the renewed certificate. `TlsCertificateExpiringSoon` (observability overlay) alerts if renewal stops working — see [runbooks/tls-cert-renewal.md](../runbooks/tls-cert-renewal.md).

## Database migrations

Each service owns its migrations under `services/<name>/src/migrations/` and applies its own schema on container start (entrypoint runs `pnpm run --if-present db:migrate`). There is no `00-baseline` migration and no `SequelizeMeta` table — those belonged to the deleted monolith. On first boot each service creates its own `pgmigrations` bookkeeping table (inside its schema) automatically and runs `001+` forward. Nothing to seed by hand. The deploy workflow's health gate waits for each service to come up before passing.

Backups are automated by `.github/workflows/backup.yml` (nightly `0 2 * * *`) — see [db-backup-runbook.md](../db-backup-runbook.md); no host cron is required.

## Pre-flight checklist

- [ ] Repo confirmed as `ideaSquared/adopt-dont-shop`
- [ ] GitHub environments created: `staging`, `production`, `production-bypass` (reviewers + prevent self-review on the latter two)
- [ ] `staging-vars` / `production-vars` environments created, **no** required reviewers, each with `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_STATSIG_CLIENT_KEY` set to that target's values (ADS-1318)
- [ ] Infra secrets added: `HETZNER_HOST`, `HETZNER_HOST_FINGERPRINT`, `HETZNER_SSH_KEY`, `GHCR_TOKEN` (**`read:packages` only**); repo variables `BACKUP_BUCKET`, `AWS_REGION`; optional `DISCORD_WEBHOOK_URL` secret for deploy failure notifications (ADS-1324)
- [ ] Seven application secrets added: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `DB_PASSWORD`, `PRINCIPAL_SIGNING_KEY`, `NATS_AUTH_TOKEN`; optional build-time `SENTRY_AUTH_TOKEN` (ADS-1319)
- [ ] Host hardened (updates, ufw 22/80/443, key-only SSH, no root login, swap) — see "Initial server setup"
- [ ] Host provisioned, `deploy` user + Docker installed, `/opt/ads/*` created
- [ ] DNS records point at the host
- [ ] `PROD_HOSTNAME` (plain literal) set in `/opt/ads/production/.env` — `deploy.yml` substitutes it into the freshly-shipped `nginx.prod.conf` on every run (ADS-1312); certbot issuance done
- [ ] Per-env `.env` created (non-secret config) — compose/nginx/observability files are shipped by the first deploy, not hand-copied (ADS-1312)
- [ ] `OBSERVABILITY_ENABLED=true` set in `/opt/ads/production/.env` before the first production deploy, or the deploy will fail preflight (ADS-1307; override with `allow_blind_deploy` + a reason if truly needed)
- [ ] Host `.env` includes `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `FCM_PROJECT_ID` and single-line `FCM_SERVICE_ACCOUNT_JSON`
- [ ] Production reviewers configured — with a single maintainer, leave **Prevent self-review** off or nobody can approve
- [ ] First deploy: `make prod` (approve in the Actions UI); with staging, `make staging` first and verify end-to-end
- [ ] Certificate issued and edge gateway started — see "DNS & TLS" (after the first deploy: the gateway joins the network it creates)
- [ ] Backups configured (`BACKUP_BUCKET`/`AWS_REGION` + host AWS credentials) — until then the nightly `backup.yml` run fails
