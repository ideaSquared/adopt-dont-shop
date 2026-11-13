# Production setup

Step-by-step guide to launch production on the server that already runs staging (audience: whoever sets up the host). This is the third of three guides:

1. [Server setup](./SERVER-SETUP.md): finished.
2. [Staging setup](./STAGING-SETUP.md): finished, and staging works.
3. **Production setup** (this guide).

Read it top to bottom and do each step in order. Part 1 changes nothing visitors can see, so you can spread it over several days. Part 2 is the launch itself: the landing page is down from step 9 until step 12, so do Part 2 in one sitting (allow an hour). When you finish, the server runs:

| Address                                                         | What it shows                                     |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `adoptdontshop.app`, `www.`                                     | The production client (replaces the landing page) |
| `api.`, `admin.`, `rescue.`                                     | The production API, admin app and rescue app      |
| `staging.`, `staging-api.`, `staging-admin.`, `staging-rescue.` | Staging, unchanged                                |

Every command block starts with a **Where:** line:

| Where                 | What it is                                                                         | Prompt looks like             |
| --------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| **laptop terminal**   | A terminal on your own computer (Git Bash on Windows), not logged in to the server | your usual one, ending in `$` |
| **deploy SSH window** | A laptop terminal where you ran `ssh -i ~/.ssh/ads-deploy deploy@<vps-ip>`         | `deploy@<server-name>:~$`     |
| **netcup console**    | The server's browser console in the netcup Server Control Panel, logged in as root | `root@<server-name>:~#`       |
| **website — …**       | A website, named on the line (netcup, GitHub, Discord, your DNS provider)          | —                             |

## Before you start

You need:

- Staging working: every check in step 9 of the [staging setup](./STAGING-SETUP.md) passes.
- At least one other person to approve production deploys, or accept approving your own (step 3).
- **Two Discord webhooks** for alerts (Server Settings → Integrations → Webhooks): one for critical alerts, one for routine warnings. The same channel for both is fine.
- A **dead-man's-switch check** (for example on healthchecks.io) with a 5-minute period, and its ping URL. It alerts you if the alerting itself stops.

## Part 1. Prepare

### Step 1. Upgrade the server to 16 GB

Production plus staging needs 16 GB. Staging alone uses about 3–4 GB of the 8 GB, and production with its monitoring needs about 5–6.5 GB more.

**Where: website — netcup Server Control Panel.** Upgrade the plan to 16 GB RAM and restart the server when asked. The containers start again by themselves.

**Where: deploy SSH window.**

```bash
free -h    # "total" on the Mem: line shows about 15Gi
```

Then repeat the `curl` checks from step 9 of the staging setup.

### Step 2. DNS

**Where: website — your DNS provider.** Add **A records** for `api`, `admin` and `rescue`, pointing at `<vps-ip>`. Still no AAAA records.

### Step 3. GitHub environments

**Where: website — GitHub, repository → Settings → Environments.** Create three environments:

| Environment         | Settings                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `production`        | Tick **Required reviewers** and add the approvers. Tick **Prevent self-review** too, unless you are the only maintainer, or nobody can approve.                                  |
| `production-bypass` | Tick **Required reviewers** and add the small set allowed to approve a deploy that skips safety checks.                                                                          |
| `production-vars`   | No protection rules. Leave `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` unset, so the apps call their own address. Optionally add `VITE_SENTRY_DSN` and `VITE_STATSIG_CLIENT_KEY`. |

Click **Save protection rules** on each. An environment without saved reviewers does not stop anything.

### Step 4. Production secrets

Production must not share staging's secrets. You set a fresh set on **both** `production` and `production-bypass`: a deploy that skips safety checks runs in `production-bypass`, and an environment without its own secrets silently falls back to staging's repository secrets.

**Where: laptop terminal**, in the repository folder. This writes the seven values to a file in your home folder, uploads them to both environments, then deletes the file:

```bash
umask 077
node scripts/generate-secrets.mjs \
  | grep -E '^(JWT_SECRET|JWT_REFRESH_SECRET|ENCRYPTION_KEY|UPLOAD_SIGNING_SECRET|PRINCIPAL_SIGNING_KEY|NATS_AUTH_TOKEN|POSTGRES_PASSWORD)=' \
  | sed 's/^POSTGRES_PASSWORD=/DB_PASSWORD=/' > ~/ads-prod-secrets.env
grep -c = ~/ads-prod-secrets.env    # expected: 7
gh secret set -f ~/ads-prod-secrets.env --env production
gh secret set -f ~/ads-prod-secrets.env --env production-bypass
rm ~/ads-prod-secrets.env
```

Check: **website — GitHub, repository → Settings → Environments → production** lists seven environment secrets, and so does `production-bypass`.

Optional, on both environments:

- `OPS_DISCORD_WEBHOOK_URL`: where the ops CLI posts break-glass alerts. Without it, the ops CLI refuses every break-glass unlock on production.

Optional, as repository secrets:

- `DISCORD_WEBHOOK_URL`: deploy failures and smoke-test results are posted here. You can reuse the critical alerts webhook.
- `SENTRY_AUTH_TOKEN`: uploads frontend sourcemaps so production stack traces are readable.

### Step 5. Ops CLI team

**Where: website — GitHub, the ideaSquared organisation → Teams.** Create a team called `ops-production`. Developers in this team can use the ops CLI on production. Production uses the same `ads-ops` OAuth app as staging.

### Step 6. Production settings file (`.env`)

**Where: deploy SSH window.** Paste this whole block. It writes the file with a new random Redis password and Grafana password:

```bash
umask 077
cat > /opt/ads/production/.env <<EOF
POSTGRES_USER=ads_prod
POSTGRES_DB=adopt_dont_shop_prod
REDIS_PASSWORD=$(openssl rand -hex 32)
CORS_ORIGIN=https://adoptdontshop.app,https://admin.adoptdontshop.app,https://rescue.adoptdontshop.app
FRONTEND_URL=https://adoptdontshop.app
RESCUE_FRONTEND_URL=https://rescue.adoptdontshop.app
PROD_HOSTNAME=adoptdontshop.app
EMAIL_PROVIDER=resend
RESEND_API_KEY=FILL_IN
DEFAULT_FROM_EMAIL=noreply@adoptdontshop.app
OPS_GITHUB_CLIENT_ID=FILL_IN
OPS_GITHUB_ORG=ideaSquared
OPS_GITHUB_TEAM=ops-production
OPS_SESSION_TTL_HOURS=8
OBSERVABILITY_ENABLED=true
GF_SECURITY_ADMIN_PASSWORD=$(openssl rand -hex 24)
EOF
```

Open the file and replace the two `FILL_IN` values: the Resend API key (you can reuse staging's, or make a separate one in Resend), and the `ads-ops` Client ID (the same one as in `/opt/ads/staging/.env`). Save with Ctrl+O then Enter, and exit with Ctrl+X:

```bash
nano /opt/ads/production/.env
```

Check:

```bash
grep -c FILL_IN /opt/ads/production/.env   # expected: 0
ls -l /opt/ads/production/.env             # expected: -rw------- ... deploy deploy
```

What the keys do:

- `PROD_HOSTNAME` must match the hostnames in `deploy/gateway/nginx.conf`. Every deploy writes it into the production stack's nginx config.
- `OBSERVABILITY_ENABLED=true` starts monitoring and alerting. Production deploys refuse to run without it.
- `GF_SECURITY_ADMIN_PASSWORD` is the Grafana admin password. Read it from this file when you need it.
- Push notifications stay off. To turn them on later, add `PUSH_PROVIDER=fcm`, `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_JSON` (one line).

### Step 7. Alerting secrets

Alertmanager will not start unless all three files exist, so write them before the first deploy.

**Where: deploy SSH window.** Put the two Discord webhook URLs and the dead-man's-switch ping URL from "Before you start" into the three `printf` lines:

```bash
mkdir -p /opt/ads/production/observability/alertmanager/secrets
cd /opt/ads/production/observability/alertmanager/secrets
printf '%s' '<critical Discord webhook URL>' > discord_webhook_url_critical
printf '%s' '<warning Discord webhook URL>'  > discord_webhook_url_warning
printf '%s' '<dead-man ping URL>'            > deadman_webhook_url
chmod 600 discord_webhook_url_critical discord_webhook_url_warning deadman_webhook_url
cd ~
```

Background: [observability-enable.md](../runbooks/observability-enable.md).

### Step 8. Switch the apex to production in the repository

**Where: laptop terminal**, on a new branch off `main`. Make two changes and open a pull request:

1. In `deploy/gateway/nginx.conf`, comment out `include /etc/nginx/snippets/apex-landing.conf;` and uncomment `include /etc/nginx/snippets/apex-production.conf;`. Include exactly one; `node scripts/check-csp-headers.mjs` fails if both or neither are active.
2. In `deploy/gateway/docker-compose.gateway.yml`, remove the `./landing:/usr/share/nginx/landing:ro` volume line and the comment above it.

Get the pull request reviewed, but **merge it only when you are ready to do Part 2**. Every deploy, staging ones included, ships the gateway config, and the gateway picks it up within 12 hours. Merged too early, the apex would point at a production site that does not exist yet.

After merging, wait for CI on `main` to pass, including **Production Image Smoke** (about 25 minutes). The deploy refuses a commit whose CI has not passed.

## Part 2. Launch

From step 9 to step 12, the landing page and staging are both down.

### Step 9. Stop the gateway and remove the hand-made network

The production stack creates `ads-prod-network` itself, and Docker Compose refuses to use a network it did not create. Remove the one you made in the staging setup.

**Where: deploy SSH window.**

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml down
docker network rm ads-prod-network
```

### Step 10. First production deploy

**Where: laptop terminal**, in the repository folder:

```bash
gh workflow run deploy.yml -f environment=production
```

Wait about 10 seconds, then follow it:

```bash
gh run watch $(gh run list --workflow=deploy.yml -L 1 --json databaseId -q '.[0].databaseId')
```

**Where: website — GitHub, repository → Actions → the running Deploy.** The run stops at the `production` environment: click **Review deployments**, tick `production`, and approve. (`make prod` runs the same `gh` commands.)

Wait until it finishes. It starts every production service, waits for them to report healthy, and copies the new gateway files from step 8 to `/opt/ads/gateway/`.

### Step 11. Add the production names to the certificate

**Where: laptop terminal.** Check DNS from step 2 has spread. This must print `<vps-ip>`:

```bash
dig +short api.adoptdontshop.app
```

**Where: deploy SSH window.** The gateway is still stopped, so certbot can use port 80 again. List every name, production and staging, with `adoptdontshop.app` first:

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml run --rm --no-deps -p 80:80 \
  --entrypoint certbot certbot certonly --standalone --expand \
  -d adoptdontshop.app -d www.adoptdontshop.app \
  -d api.adoptdontshop.app -d admin.adoptdontshop.app -d rescue.adoptdontshop.app \
  -d staging.adoptdontshop.app -d staging-api.adoptdontshop.app \
  -d staging-admin.adoptdontshop.app -d staging-rescue.adoptdontshop.app \
  --agree-tos --no-eff-email
```

### Step 12. Start the gateway

**Where: deploy SSH window.**

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml up -d
```

The site is back up.

### Step 13. Check it works

**Where: laptop terminal.**

```bash
curl -sI https://adoptdontshop.app | head -1           # HTTP/2 200
curl -sI https://admin.adoptdontshop.app | head -1     # HTTP/2 200
curl -sI https://rescue.adoptdontshop.app | head -1    # HTTP/2 200
curl -sI https://staging.adoptdontshop.app | head -1   # 200 from your IP, otherwise 401
```

Then open `https://adoptdontshop.app` in a browser. It shows the production client, not the landing page.

### Step 14. First admin account

A new production stack has no users, so nobody can verify the first rescues. Create one super admin.

**Where: deploy SSH window.** Put your own email and name in the last line. The password is typed at the prompt, never on the command line:

```bash
cd /opt/ads/production
read -rsp 'Admin password: ' ADMIN_PW; echo
printf '%s' "$ADMIN_PW" | docker compose -f docker-compose.prod.yml exec -T service-auth \
  node dist/db/bootstrap-admin.js --password-stdin \
  --email <your email> --first-name <first name> --last-name <last name>
unset ADMIN_PW
```

The password needs at least 8 characters. The command refuses if a super admin already exists. Sign in at `https://admin.adoptdontshop.app` to check.

### Step 15. Check memory

**Where: deploy SSH window.** After a few minutes:

```bash
free -h                     # "available" should be well above 1 GiB
docker stats --no-stream    # no container near its limit
vmstat 1 5                  # si/so 0 after the first line
```

**Where: netcup console.** Check nothing was killed for lack of memory:

```bash
dmesg | grep -i oom    # no output is good
```

If `si`/`so` stay above 0 or anything was killed, see "Sizing" in [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md#sizing).

### Step 16. Backups

The nightly backup has been disabled since the server setup. It needs an S3 bucket before it can run.

1. Set up the bucket, the `backups` GitHub environment, the `BACKUP_BUCKET` and `AWS_REGION` repository variables, and the server's AWS credentials, as in [db-backup-runbook.md](../db-backup-runbook.md).
2. **Where: website — GitHub, repository → Actions → Backup → ⋯ → Enable workflow.**
3. **Where: laptop terminal.** Run it once now and check it passes:

   ```bash
   gh workflow run backup.yml
   ```

Production is live.

## Afterwards

- **Release to production:** `gh workflow run deploy.yml -f environment=production` (or `make prod`), then approve it. Deploy to staging first and check it there. The full release procedure is [operations/deploy.md](../operations/deploy.md).
- **Roll back:** `make rollback`, or see [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).
- **Grafana:** bound to the server's loopback only; reach it over an SSH tunnel. See [observability-enable.md](../runbooks/observability-enable.md).
- **Certificates** renew by themselves. The `TlsCertificateExpiringSoon` alert fires if renewal stops; see [runbooks/tls-cert-renewal.md](../runbooks/tls-cert-renewal.md).
