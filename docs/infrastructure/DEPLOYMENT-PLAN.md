# Deployment Plan — AdoptDontShop

## Overview

- All deployments ship from `main`
- Deploys triggered via `make` commands (backed by GitHub Actions + GitHub CLI)
- Docker images built in CI, tagged by git SHA, pushed to GHCR
- Server pulls pre-built images — no building on server
- Rollback = redeploy previous SHA, ~30 seconds
- Frontend uses same-origin API (empty `VITE_API_BASE_URL`) — nginx proxies `/api/` to backend

---

## Architecture

```
main branch
    │
    ├── make staging  ──► GitHub Actions ──► build images (:SHA) ──► push GHCR ──► SSH pull + up on /opt/ads/staging
    │
    └── make prod     ──► GitHub Actions ──► (approval gate) ──► SSH pull + up on /opt/ads/production
                                                                      (same images from GHCR)

Server layout (single CPX42):

  ┌─────────────────────────────────────────────────────────┐
  │  Gateway (nginx + certbot)                              │
  │  Binds :80 / :443, routes by server_name               │
  │  Joins both Docker networks                            │
  ├──────────────────────────┬──────────────────────────────┤
  │  ads-prod-network        │  ads-staging-network         │
  │  ├── backend             │  ├── backend                 │
  │  ├── client              │  ├── client                  │
  │  ├── admin               │  ├── admin                   │
  │  ├── rescue              │  ├── rescue                  │
  │  ├── database            │  ├── database                │
  │  └── redis               │  └── redis                   │
  └──────────────────────────┴──────────────────────────────┘
```

---

## Repo Files

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | Production stack — GHCR images, no nginx |
| `docker-compose.staging.yml` | Staging stack — same shape, isolated network |
| `deploy/gateway/docker-compose.gateway.yml` | Gateway nginx + certbot |
| `deploy/gateway/nginx.conf` | All-domain routing (prod + staging) |
| `deploy/gateway/snippets/ssl-params.conf` | TLS cipher config |
| `.github/workflows/deploy.yml` | Build → push → deploy workflow |
| `.github/workflows/rollback.yml` | Redeploy a previous SHA |
| `Makefile` | CLI commands (`make staging`, `make prod`, `make rollback`) |
| `service.backend/.sequelizerc` | Points sequelize-cli to dist/ in prod |
| `service.backend/sequelize-config.js` | DB connection config for migrations |

---

## GitHub Setup

### Environments (Settings → Environments)

| Environment | Protection |
|---|---|
| `staging` | None — deploys immediately |
| `production` | Required reviewer — manual approval |

### Secrets (Settings → Secrets → Actions)

| Secret | Value | Notes |
|---|---|---|
| `HETZNER_HOST` | Server IP | |
| `HETZNER_SSH_KEY` | Private key for `deploy` user | |
| `GHCR_TOKEN` | PAT with `read:packages` + `write:packages` | Used on server to pull images |

### Repository

Repo: `ideaSquared/adopt-dont-shop`. Images: `ghcr.io/ideasquared/adopt-dont-shop/...`

---

## Daily Dev Workflow

```bash
# 1. Work in a branch, PR and merge to main

# 2. Ship to staging
make staging

# 3. Test staging

# 4. Ship to prod (approval prompt in GitHub Actions UI)
make prod

# 5. Something broken — rollback
git log --oneline -5
make rollback env=production sha=abc1234
```

**Local dev** is unchanged — `docker-compose.yml` with its own nginx handles `*.localhost` routing.

---

## Server Setup

### Directory structure

```
/opt/ads/
  gateway/
    docker-compose.gateway.yml
    nginx.conf
    snippets/ssl-params.conf
  staging/
    docker-compose.staging.yml
    .env
    .last_sha
  production/
    docker-compose.prod.yml
    .env
    .last_sha
/opt/backups/
  prod_YYYYMMDD_HHMM.sql.gz
```

### Initial server setup

```bash
# As root:
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy
# Copy SSH public key to deploy user's authorized_keys

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create directories
mkdir -p /opt/ads/{gateway/snippets,staging,production} /opt/backups
chown -R deploy:deploy /opt/ads /opt/backups

# Copy files from repo to server:
# - deploy/gateway/* → /opt/ads/gateway/
# - docker-compose.prod.yml → /opt/ads/production/
# - docker-compose.staging.yml → /opt/ads/staging/

# Start gateway first (creates external networks on first docker compose up)
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml up -d
```

### Env files

Each environment needs `/opt/ads/<env>/.env`:

```env
POSTGRES_USER=ads_prod
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=adopt_dont_shop_prod
REDIS_PASSWORD=<generated>
JWT_SECRET=<generated-64-hex>
JWT_REFRESH_SECRET=<generated-64-hex>
SESSION_SECRET=<generated-64-hex>
CSRF_SECRET=<generated-64-hex>
ENCRYPTION_KEY=<generated-64-hex>
API_URL=https://api.adoptdontshop.com
FRONTEND_URL=https://adoptdontshop.com
CORS_ORIGIN=https://adoptdontshop.com,https://admin.adoptdontshop.com,https://rescue.adoptdontshop.com
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@adoptdontshop.com
DEPLOY_SHA=latest
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## SSL & DNS

### DNS records → CPX42 IP

**Production:** `adoptdontshop.com`, `www`, `api`, `admin`, `rescue`
**Staging:** `staging.adoptdontshop.com`, `staging-api`, `staging-admin`, `staging-rescue`

### Certificates

Initial issuance (stop gateway first, or use DNS challenge):
```bash
certbot certonly --standalone \
  -d adoptdontshop.com -d www.adoptdontshop.com \
  -d api.adoptdontshop.com -d admin.adoptdontshop.com \
  -d rescue.adoptdontshop.com \
  -d staging.adoptdontshop.com -d staging-api.adoptdontshop.com \
  -d staging-admin.adoptdontshop.com -d staging-rescue.adoptdontshop.com
```

Auto-renewal handled by certbot container in gateway stack (renews every 12h via webroot).

---

## Database

### Migrations

- `sequelize-cli` is in production dependencies
- `.sequelizerc` points to `dist/migrations/` when `NODE_ENV=production`
- Deploy workflow runs `npm run migrate` after health check passes

### First deploy — baseline

Migration `00-baseline` uses `sync({ force: true })` — **destructive**. For first prod deploy, create the SequelizeMeta table and mark baseline as already run:

```sql
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) PRIMARY KEY);
INSERT INTO "SequelizeMeta" VALUES ('00-baseline.js');
```

Then `npm run migrate` will only run migrations 01+.

### Backups

```bash
#!/bin/bash
# /opt/ads/backup.sh
DATE=$(date +%Y%m%d_%H%M)
source /opt/ads/production/.env
docker compose -f /opt/ads/production/docker-compose.prod.yml exec -T database \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > /opt/backups/prod_$DATE.sql.gz
find /opt/backups -name "prod_*.sql.gz" -mtime +7 -delete
```

```bash
chmod +x /opt/ads/backup.sh
echo "0 2 * * * deploy /opt/ads/backup.sh" >> /etc/crontab
```

---

## Pre-Flight Checklist

- [ ] Verify repo is `ideaSquared/adopt-dont-shop` on GitHub
- [ ] Create GitHub environments: `staging`, `production` (with reviewer gate)
- [ ] Add secrets: `HETZNER_HOST`, `HETZNER_SSH_KEY`, `GHCR_TOKEN`
- [ ] Create PAT with `read:packages` + `write:packages` scope for GHCR_TOKEN
- [ ] Provision Hetzner CPX42, run server setup
- [ ] Point DNS records to server IP
- [ ] Run certbot initial issuance (standalone, before gateway starts)
- [ ] Copy files to server (gateway, compose, etc.)
- [ ] Create `.env` files on server for both environments
- [ ] Start gateway: `cd /opt/ads/gateway && docker compose up -d`
- [ ] Start prod stack: `cd /opt/ads/production && docker compose up -d` (uses `:latest` tag initially)
- [ ] Seed SequelizeMeta with baseline migration
- [ ] Run remaining migrations: `docker compose exec -T service-backend npm run migrate`
- [ ] First deploy via workflow: `make staging`
- [ ] Verify staging works end-to-end
- [ ] `make prod`
