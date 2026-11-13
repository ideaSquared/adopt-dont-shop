# Staging setup

Step-by-step guide to put staging and the public landing page on the server (audience: whoever sets up the host). This is the second of three guides:

1. [Server setup](./SERVER-SETUP.md): must be finished first.
2. **Staging setup** (this guide).
3. [Production setup](./PRODUCTION-SETUP.md): once staging works.

Read it top to bottom and do each step in order. When you finish, the server runs:

| Address                                                         | What it shows                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `adoptdontshop.app`, `www.`                                     | The public landing page with the waiting list                 |
| `staging.`, `staging-api.`, `staging-admin.`, `staging-rescue.` | The staging site, only for allowlisted IPs or with a password |

Every command block starts with a **Where:** line:

| Where                 | What it is                                                                               | Prompt looks like             |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| **laptop terminal**   | A terminal on your own computer (Git Bash on Windows), not logged in to the server       | your usual one, ending in `$` |
| **deploy SSH window** | A laptop terminal where you ran `ssh -i ~/.ssh/ads-deploy deploy@<vps-ip>` (from step 4) | `deploy@<server-name>:~$`     |
| **website — …**       | A website, named on the line (GitHub, Resend)                                            | —                             |

## Before you start

You need:

- The [server setup](./SERVER-SETUP.md) finished, including the DNS records for `adoptdontshop.app`, `www` and the four `staging-*` names.
- A **Resend** account (resend.com) with `adoptdontshop.app` added as a sending domain, and an API key. Staging will not deploy without it.

## Step 1. Application secrets

**Where: laptop terminal**, in the repository folder. Generate the application secrets. This needs only Node; it does not need Docker or the server, and it writes no files, it only prints random values:

```bash
pnpm secrets:generate
# or, if pnpm is not set up:  node scripts/generate-secrets.mjs
```

Ignore its "Copy these into your .env file" header: these values go into GitHub, not into any `.env`. Use only the lines named in the table below; `SESSION_SECRET`, `REDIS_PASSWORD` and `GF_SECURITY_ADMIN_PASSWORD` are not needed here.

**Where: website — GitHub, repository → Settings → Secrets and variables → Actions → Secrets.** Add these as repository secrets:

| Secret                  | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| `JWT_SECRET`            | From `pnpm secrets:generate`                               |
| `JWT_REFRESH_SECRET`    | From `pnpm secrets:generate`                               |
| `ENCRYPTION_KEY`        | From `pnpm secrets:generate`                               |
| `UPLOAD_SIGNING_SECRET` | From `pnpm secrets:generate`                               |
| `DB_PASSWORD`           | The `POSTGRES_PASSWORD` value from `pnpm secrets:generate` |
| `PRINCIPAL_SIGNING_KEY` | From `pnpm secrets:generate`                               |
| `NATS_AUTH_TOKEN`       | From `pnpm secrets:generate`                               |

These are staging's values. Production gets its own set later, on its own GitHub environments, which take priority over these.

## Step 2. GitHub environments

**Where: website — GitHub, repository → Settings → Environments.**

- Create `staging` with no protection rules.
- Create `staging-vars` with no protection rules. Leave `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` unset, so the staging apps call their own address.

## Step 3. GitHub app for the ops CLI

**Where: website — GitHub, the ideaSquared organisation → Settings.** The staging deploy will not start without these values.

1. Settings → Developer settings → OAuth Apps → **New OAuth App**. Name it `ads-ops`, set the homepage to the repository URL, and put any URL in the callback field.
2. Open the app, tick **Enable Device Flow**, and save.
3. Copy the **Client ID**. You need it in step 4. There is no client secret. Production reuses the same app.
4. Create a team called `ops-staging` in the organisation. Developers in this team can use the ops CLI on staging.

Background: [ops-cli runbook](../runbooks/ops-cli.md).

## Step 4. Staging settings file (`.env`)

**Where: laptop terminal.** Log in as `deploy`. This window is now your **deploy SSH window**:

```bash
ssh -i ~/.ssh/ads-deploy deploy@<vps-ip>
```

**Where: deploy SSH window.** Paste this whole block. It creates a Docker network the gateway needs, then writes the file with a new random Redis password:

```bash
docker network create ads-prod-network

umask 077
cat > /opt/ads/staging/.env <<EOF
POSTGRES_USER=ads_staging
POSTGRES_DB=adopt_dont_shop_staging
REDIS_PASSWORD=$(openssl rand -hex 32)
CORS_ORIGIN=https://staging.adoptdontshop.app,https://staging-admin.adoptdontshop.app,https://staging-rescue.adoptdontshop.app
FRONTEND_URL=https://staging.adoptdontshop.app
RESCUE_FRONTEND_URL=https://staging-rescue.adoptdontshop.app
EMAIL_PROVIDER=resend
RESEND_API_KEY=FILL_IN
DEFAULT_FROM_EMAIL=noreply@adoptdontshop.app
OPS_GITHUB_CLIENT_ID=FILL_IN
OPS_GITHUB_ORG=ideaSquared
OPS_GITHUB_TEAM=ops-staging
OPS_SESSION_TTL_HOURS=8
EOF
```

The gateway always joins `ads-prod-network`, which the production stack normally creates. Until production exists, you create it by hand; the production setup removes it again.

Open the file and replace the two `FILL_IN` values: the Resend API key, and the Client ID from step 3. Save with Ctrl+O then Enter, and exit with Ctrl+X:

```bash
nano /opt/ads/staging/.env
```

Check:

```bash
grep -c FILL_IN /opt/ads/staging/.env   # expected: 0
ls -l /opt/ads/staging/.env             # expected: -rw------- ... deploy deploy
```

## Step 5. First staging deploy

The deploy only runs for a commit on `main` whose CI has passed, including **Production Image Smoke** (about 25 minutes after a merge).

**Where: laptop terminal**, in the repository folder:

```bash
gh workflow run deploy.yml -f environment=staging
```

Wait about 10 seconds for the run to appear, then follow it:

```bash
gh run watch $(gh run list --workflow=deploy.yml -L 1 --json databaseId -q '.[0].databaseId')
```

These are what `make staging` and `make watch` run; Git Bash on Windows has no `make`. Without the GitHub CLI, use **website — GitHub, repository → Actions → Deploy → Run workflow**, pick `staging`, and watch the run there.

Wait until it finishes. It pulls the images, writes `/opt/ads/staging/`, starts every service, waits for them to report healthy, and copies the gateway files to `/opt/ads/gateway/`.

## Step 6. TLS certificate

**Where: laptop terminal.** Check the DNS records from the server setup have spread. This must print `<vps-ip>`:

```bash
dig +short staging.adoptdontshop.app
```

**Where: deploy SSH window.** Get the certificate. Nothing is on port 80 yet, so certbot runs its own temporary web server. Put an email address you read in place of `<your email>`; expiry warnings go there.

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml run --rm --no-deps -p 80:80 \
  --entrypoint certbot certbot certonly --standalone \
  -d adoptdontshop.app -d www.adoptdontshop.app \
  -d staging.adoptdontshop.app -d staging-api.adoptdontshop.app \
  -d staging-admin.adoptdontshop.app -d staging-rescue.adoptdontshop.app \
  --email <your email> --agree-tos --no-eff-email
```

Keep `adoptdontshop.app` as the first `-d`: the gateway looks for the certificate under that name.

## Step 7. Who can see staging

**Where: laptop terminal.** Find your IP address:

```bash
curl -4 -s https://ifconfig.me
```

**Where: deploy SSH window.** Allow your IP, and create a password for everyone else. People on an allowed IP go straight in; anyone else gets a password prompt.

```bash
install -d -m 755 /opt/ads/gateway/staging-access
cd /opt/ads/gateway/staging-access
echo 'allow <your IP>;' > team.allow     # one `allow` line per IP
htpasswd -B -c htpasswd <first-user>     # asks for a password; drop -c for each further user
chmod 644 htpasswd *.allow
```

Never allow a private or Docker range (`10.`, `172.16`–`172.31.`, `192.168.`).

## Step 8. Start the gateway

**Where: deploy SSH window.**

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml up -d
```

## Step 9. Check it works

**Where: laptop terminal.**

```bash
curl -sI https://adoptdontshop.app | head -1                                 # HTTP/2 200
curl -sI https://staging.adoptdontshop.app | head -1                         # 200 from your IP, otherwise 401
curl -sI -u <user>:<password> https://staging.adoptdontshop.app | head -1    # HTTP/2 200
```

Then open `https://staging.adoptdontshop.app` in a browser.

**Where: deploy SSH window.** After a few minutes, check memory:

```bash
free -h
docker stats --no-stream
vmstat 1 5    # the si/so columns should be 0 after the first line
```

Some swap in use is fine as long as `si`/`so` stay at 0: that is left over from start-up, not ongoing pressure.

Staging is done. When you are ready to launch, continue with [PRODUCTION-SETUP.md](./PRODUCTION-SETUP.md).

## Afterwards

- **Redeploy staging:** the `gh workflow run` command from step 5 (or `make staging`, where `make` is installed) deploys the latest `main`.
- **Change who can see staging:** edit the files from step 7, then reload: `cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml exec nginx nginx -s reload`.
- **Gateway config changes** arrive with every deploy and go live within 12 hours, or straight away with the reload above. A change to the gateway's compose file needs step 8 again.
- **Check which IP nginx sees for you:** `docker logs ads_gateway --tail 20`.

### Switching on the waiting list

The signup form in `deploy/gateway/landing/index.html` is hidden until an email provider is chosen. The comment above the form lists the three changes: set the provider's form URL, unhide the form, and add the provider's origin to `form-action` in the apex vhost's CSP. Use the provider's double opt-in so consent is recorded.
