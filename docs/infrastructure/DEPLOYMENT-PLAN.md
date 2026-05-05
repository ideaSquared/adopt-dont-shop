# Deployment Plan — AdoptDontShop

## Overview

- All deployments ship from `main`
- Deploys triggered via `make` commands (backed by GitHub Actions + GitHub CLI)
- Docker images built in CI, tagged by git SHA, pushed to GHCR
- Server pulls pre-built images — no building on server
- Rollback = redeploy previous SHA, ~30 seconds

---

## Architecture

```
main branch
    │
    ├── make staging  ──► GitHub Actions ──► build images (:SHA) ──► push GHCR ──► SSH pull + up on /opt/ads/staging
    │
    └── make prod     ──► GitHub Actions ──► (approval gate) ──► SSH pull + up on /opt/ads/production
                                                                      (same images from GHCR)
```

Single CPX42 (Hetzner) hosts both environments:
- `/opt/ads/staging/` — staging stack (port 8080/8443 internally, SSL via shared certs)
- `/opt/ads/production/` — production stack (port 80/443)

---

## Files Created

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | Production stack — image-based, no build |
| `docker-compose.staging.yml` | Staging stack — separate DB, Redis, container names |
| `nginx/nginx.prod.conf` | Production nginx — SSL, subdomain routing |
| `nginx/nginx.staging.conf` | Staging nginx — SSL, staging subdomains |
| `nginx/snippets/ssl-params.conf` | Shared SSL cipher/protocol config |
| `.github/workflows/deploy.yml` | Build images + deploy workflow |
| `.github/workflows/rollback.yml` | Redeploy a specific SHA |
| `Makefile` | CLI commands for devs |

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
| `GHCR_TOKEN` | Personal Access Token with `read:packages` scope | Used by server to pull images. `GITHUB_TOKEN` is job-scoped and can't be forwarded to remote servers |

### Repository Settings

Repo: `ideaSquared/adopt-dont-shop`. All image refs use `ghcr.io/ideasquared/adopt-dont-shop/...`.

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

---

## Server Setup

### Directory structure

```
/opt/ads/
  staging/
    docker-compose.staging.yml    (copy from repo)
    nginx/                        (copy nginx/ dir from repo)
    .env                          (secrets — never in git)
    .last_sha
  production/
    docker-compose.prod.yml       (copy from repo)
    nginx/                        (copy nginx/ dir from repo)
    .env                          (secrets — never in git)
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
# Copy SSH key to deploy user

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create directories
mkdir -p /opt/ads/staging/nginx /opt/ads/production/nginx /opt/backups
chown -R deploy:deploy /opt/ads /opt/backups

# Copy compose + nginx files to each environment dir
# (or symlink from a single repo checkout)
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

Initial issuance (before nginx is running):
```bash
certbot certonly --standalone \
  -d adoptdontshop.com -d www.adoptdontshop.com \
  -d api.adoptdontshop.com -d admin.adoptdontshop.com \
  -d rescue.adoptdontshop.com \
  -d staging.adoptdontshop.com -d staging-api.adoptdontshop.com \
  -d staging-admin.adoptdontshop.com -d staging-rescue.adoptdontshop.com
```

Auto-renewal (after nginx is running, uses webroot):
```bash
# /etc/cron.d/certbot-renew
0 3 * * * deploy certbot renew --webroot -w /var/www/certbot --quiet --post-hook "docker compose -f /opt/ads/production/docker-compose.prod.yml exec nginx nginx -s reload"
```

---

## Database Backups

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
- [ ] Point DNS records
- [ ] Run certbot initial issuance
- [ ] Copy compose + nginx files to server
- [ ] Create `.env` files on server
- [ ] First deploy: `make staging`
- [ ] Verify staging works
- [ ] `make prod`
