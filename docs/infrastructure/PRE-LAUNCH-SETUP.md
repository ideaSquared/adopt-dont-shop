# Pre-launch setup (netcup VPS)

Step-by-step guide to set up the server before launch (audience: whoever sets up the host). Read it top to bottom and do each step in order. You do not need any other document; links are for background only.

When you finish, the server runs:

| Address                                                         | What it shows                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `adoptdontshop.app`, `www.`                                     | The public landing page with the waiting list                 |
| `staging.`, `staging-api.`, `staging-admin.`, `staging-rescue.` | The staging site, only for allowlisted IPs or with a password |

Every command block starts with a **Where:** line. There are five places, and the prompt tells you which window you are in:

| Where                 | What it is                                                                                | Prompt looks like             |
| --------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| **laptop terminal**   | A terminal on your own computer (Git Bash on Windows), not logged in to the server        | your usual one, ending in `$` |
| **root SSH window**   | A laptop terminal where you ran `ssh root@<vps-ip>` (step 3). Only used until step 7      | `root@<server-name>:~#`       |
| **deploy SSH window** | A laptop terminal where you ran `ssh -i ~/.ssh/ads-deploy deploy@<vps-ip>` (from step 12) | `deploy@<server-name>:~$`     |
| **netcup console**    | The server's browser console in the netcup Server Control Panel. Logs in without SSH      | `root@<server-name>:~#`       |
| **website — …**       | A website, named on the line (netcup, GitHub, your DNS provider)                          | —                             |

If a command fails, first check the prompt: it is easy to type a server command into the laptop terminal or the other way round.

## Before you start

You need:

- A **netcup VPS** with at least 8 GB RAM.
- Access to the **DNS** for `adoptdontshop.app`.
- A **Resend** account (resend.com) with `adoptdontshop.app` added as a sending domain, and an API key. Staging will not deploy without it.
- Admin access to the **ideaSquared GitHub organisation** and the repository settings.
- The **GitHub CLI** on your laptop, logged in (`gh auth login`).

## Step 1. Make the deploy key

**Where: laptop terminal.** GitHub Actions uses this key to log in to the server.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ads-deploy -N '' -C ads-deploy
```

This makes two files:

- `~/.ssh/ads-deploy` is the **private** key. It goes into GitHub in step 10. Never put it on the server.
- `~/.ssh/ads-deploy.pub` is the **public** key. It goes on the server in step 5.

## Step 2. Install Ubuntu

**Where: website — netcup Server Control Panel (SCP).**

1. Install **Ubuntu 24.04** on the server. If the installer offers to add an SSH key, add your own. Otherwise netcup emails you a root password.
2. If you turn on netcup's firewall, allow TCP ports 22, 80 and 443.
3. Note the server's IPv4 address. This guide calls it `<vps-ip>`.

## Step 3. Log in as root

**Where: laptop terminal.**

```bash
ssh root@<vps-ip>
```

The prompt changes to `root@<server-name>:~#`. This window is now your **root SSH window**. Keep it open until step 7 tells you to close it.

## Step 4. Updates and firewall

**Where: root SSH window.**

```bash
apt-get update && apt-get -y upgrade
apt-get -y install unattended-upgrades ufw fail2ban apache2-utils
dpkg-reconfigure -f noninteractive unattended-upgrades
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

- If `apt-get` says `Could not get lock`, the server is still running its own first-boot updates. Wait a minute and run the line again.
- `Failed to query local AF_VSOCK CID` is a harmless warning. Ignore it.
- Check automatic updates are on: `cat /etc/apt/apt.conf.d/20auto-upgrades` shows two lines ending in `"1";`.

## Step 5. Docker and the deploy user

**Where: root SSH window.**

Install Docker, then create the `deploy` user and add it to the `docker` group. Docker must come first, because it creates that group.

```bash
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos '' deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Now give `deploy` the public key from step 1.

**Where: laptop terminal.** Open a second terminal window; keep the root SSH window open. Print the public key and copy the whole line (it starts with `ssh-ed25519`):

```bash
cat ~/.ssh/ads-deploy.pub
```

**Where: root SSH window** (switch back to it). Open the key file, paste the line (right-click), save with Ctrl+O then Enter, and exit with Ctrl+X:

```bash
nano /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
cat /home/deploy/.ssh/authorized_keys   # one line, starting with ssh-ed25519
```

If the file starts with `-----BEGIN OPENSSH PRIVATE KEY-----`, you pasted the private key. Delete it and paste the `.pub` line instead.

**Where: laptop terminal.** Check the key works:

```bash
ssh -i ~/.ssh/ads-deploy deploy@<vps-ip> docker ps
```

Expected: a header line starting `CONTAINER ID`. If it asks for a password, the key was not accepted: fix `authorized_keys` in the root window and try again. The root password never works for `deploy`. **Do not go on until this works.**

## Step 6. Swap and directories

**Where: root SSH window.**

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
mkdir -p /opt/ads/{gateway,production,staging}
chown -R deploy:deploy /opt/ads
```

The swap gives headroom for memory spikes. `/opt/ads` holds everything the deploys write.

## Step 7. Lock down SSH

**Where: root SSH window.** Turn off password logins and root login over SSH, and make the server present only its ED25519 host key:

```bash
printf 'PasswordAuthentication no\nPermitRootLogin no\nKbdInteractiveAuthentication no\nHostKeyAlgorithms ssh-ed25519\n' > /etc/ssh/sshd_config.d/00-hardening.conf
sshd -t && sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin|kbdinteractiveauthentication|hostkeyalgorithms) '
```

Expected: three lines ending in `no`, and `hostkeyalgorithms ssh-ed25519`.

The server also has ECDSA and RSA host keys, and the SSH client the deploy uses may pick one of those. The deploy checks the host key against the ED25519 fingerprint you record in step 8, so if the server can offer another key type the deploy fails with `host key fingerprint mismatch`. `HostKeyAlgorithms` stops that. (A `HostKey` line would not: `HostKey` lines from every config file add up, and netcup's image lists the RSA key.)

Then apply it:

```bash
systemctl reload ssh
```

**Where: laptop terminal.** Keep the root SSH window open. Check `deploy` still logs in:

```bash
ssh -i ~/.ssh/ads-deploy deploy@<vps-ip> docker ps
```

When that works, close the root SSH window (type `exit`). You will not use it again.

From now on:

- Server commands run in the **deploy SSH window**: `ssh -i ~/.ssh/ads-deploy deploy@<vps-ip>` from the laptop terminal.
- Root can only log in through the **netcup console**, with the root password. Use it for system admin such as `apt` or `ufw`.
- `deploy` is in the `docker` group, which gives full control of the server. Protect the private key.

## Step 8. Record the server's fingerprint

**Where: netcup console.** In the SCP, open the server's browser console, log in as `root` with the root password, and run:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub | awk '{print $2}'
```

Copy the `SHA256:…` value. It becomes `NETCUP_HOST_FINGERPRINT` in step 10. Read it here, not over the network: GitHub uses it to make sure it is talking to your server. netcup's setup email also lists the host key fingerprints; use the **ED25519** `SHA256:` one, never the MD5, ECDSA or RSA ones.

Then check that the fingerprint your laptop showed the first time you connected matches this value.

**Where: laptop terminal.** Check the server now offers only that key:

```bash
ssh-keyscan <vps-ip> 2>/dev/null | ssh-keygen -lf -
```

Expected: one line ending in `(ED25519)`, with the same `SHA256:…` value.

If your netcup plan has snapshots, take one now.

## Step 9. DNS

**Where: website — your DNS provider.** Create **A records only**, all pointing at `<vps-ip>`:

`adoptdontshop.app`, `www`, `staging`, `staging-api`, `staging-admin`, `staging-rescue`

- Do not create `api`, `admin` or `rescue` yet. They point at production, which is not running.
- Do not create AAAA (IPv6) records. With Docker's default settings, IPv6 visitors all look like one internal IP, which breaks the allowlist and the rate limits.

DNS takes time to spread, which is why this step comes early. Step 14 checks it.

## Step 10. GitHub secrets and settings

**Where: laptop terminal**, in the repository folder. Generate the application secrets. This needs only Node; it does not need Docker or the server, and it writes no files, it only prints random values:

```bash
pnpm secrets:generate
# or, if pnpm is not set up:  node scripts/generate-secrets.mjs
```

Ignore its "Copy these into your .env file" header: these values go into GitHub, not into any `.env`. Use only the lines named in the table below; `SESSION_SECRET`, `REDIS_PASSWORD` and `GF_SECURITY_ADMIN_PASSWORD` are not needed here.

**Where: website — GitHub, repository → Settings → Secrets and variables → Actions → Secrets.** Add:

| Secret                    | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| `NETCUP_HOST`             | `<vps-ip>`                                                         |
| `NETCUP_SSH_KEY`          | Set with the command below, straight from the key file             |
| `NETCUP_HOST_FINGERPRINT` | Set with the command below, using the `SHA256:…` value from step 8 |
| `GHCR_TOKEN`              | A classic personal access token with **only** `read:packages`      |
| `JWT_SECRET`              | From `pnpm secrets:generate`                                       |
| `JWT_REFRESH_SECRET`      | From `pnpm secrets:generate`                                       |
| `ENCRYPTION_KEY`          | From `pnpm secrets:generate`                                       |
| `UPLOAD_SIGNING_SECRET`   | From `pnpm secrets:generate`                                       |
| `DB_PASSWORD`             | The `POSTGRES_PASSWORD` value from `pnpm secrets:generate`         |
| `PRINCIPAL_SIGNING_KEY`   | From `pnpm secrets:generate`                                       |
| `NATS_AUTH_TOKEN`         | From `pnpm secrets:generate`                                       |

**Where: laptop terminal**, in the repository folder. Set the two SSH secrets with `gh` rather than pasting them into the website. Copy-paste easily breaks both: a private key that loses its `BEGIN`/`END` lines or line breaks fails with `ssh: no key found`, and a fingerprint with a missing `SHA256:` prefix or a stray space fails with `host key fingerprint mismatch`.

```bash
gh secret set NETCUP_SSH_KEY < ~/.ssh/ads-deploy       # the private key file, not ads-deploy.pub
gh secret set NETCUP_HOST_FINGERPRINT --body "SHA256:<rest of the value from step 8>"
```

**Where: website — GitHub, repository → Settings → Environments.**

- Create `staging` with no protection rules.
- Create `staging-vars` with no protection rules. Leave `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` unset, so the staging apps call their own address.

**Where: website — GitHub, repository → Settings → Webhooks → Add webhook.** This posts deploy results to Discord through ideasquared-bot:

- **Payload URL:** `https://<ideasquared-bot worker host>/ads`
- **Content type:** `application/json`
- **Secret:** the bot's `GITHUB_WEBHOOK_SECRET_ADS`
- **Events:** "Let me select individual events", then tick **Deployment statuses**

**Where: website — GitHub, repository → Actions → Backup → ⋯ → Disable workflow.** The nightly backup only covers production, so it would fail every night until launch.

## Step 11. GitHub app for the ops CLI

**Where: website — GitHub, the ideaSquared organisation → Settings.** The staging deploy will not start without these values.

1. Settings → Developer settings → OAuth Apps → **New OAuth App**. Name it `ads-ops`, set the homepage to the repository URL, and put any URL in the callback field.
2. Open the app, tick **Enable Device Flow**, and save.
3. Copy the **Client ID**. You need it in step 12. There is no client secret.
4. Create a team called `ops-staging` in the organisation. Developers in this team can use the ops CLI on staging.

Background: [ops-cli runbook](../runbooks/ops-cli.md).

## Step 12. Staging settings file (`.env`)

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

Open the file and replace the two `FILL_IN` values: the Resend API key, and the Client ID from step 11. Save with Ctrl+O then Enter, and exit with Ctrl+X:

```bash
nano /opt/ads/staging/.env
```

Check:

```bash
grep -c FILL_IN /opt/ads/staging/.env   # expected: 0
ls -l /opt/ads/staging/.env             # expected: -rw------- ... deploy deploy
```

## Step 13. First staging deploy

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

## Step 14. TLS certificate

**Where: laptop terminal.** Check DNS from step 9 has spread. This must print `<vps-ip>`:

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

## Step 15. Who can see staging

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

## Step 16. Start the gateway

**Where: deploy SSH window.**

```bash
cd /opt/ads/gateway
docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml up -d
```

## Step 17. Check it works

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
```

Setup is done.

## Afterwards

- **Redeploy staging:** the `gh workflow run` command from step 13 (or `make staging`, where `make` is installed) deploys the latest `main`.
- **Change who can see staging:** edit the files from step 15, then reload: `cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml exec nginx nginx -s reload`.
- **Gateway config changes** arrive with every deploy and go live within 12 hours, or straight away with the reload above. A change to the gateway's compose file needs step 16 again.
- **Check which IP nginx sees for you:** `docker logs ads_gateway --tail 20`.

### Switching on the waiting list

The signup form in `deploy/gateway/landing/index.html` is hidden until an email provider is chosen. The comment above the form lists the three changes: set the provider's form URL, unhide the form, and add the provider's origin to `form-action` in the apex vhost's CSP. Use the provider's double opt-in so consent is recorded.

### At launch

1. Switch the apex to the production client: in `deploy/gateway/nginx.conf`, comment out `include /etc/nginx/snippets/apex-landing.conf;` and uncomment `include /etc/nginx/snippets/apex-production.conf;` (include exactly one; `node scripts/check-csp-headers.mjs` fails if both or neither are active). Remove the `landing/` mount from `docker-compose.gateway.yml`.
2. Remove the network you created in step 12, so the production stack can create its own. Docker Compose refuses to adopt a network it did not create. The landing page is down until step 4 of this list:

   ```bash
   cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.staging.yml down
   docker network rm ads-prod-network
   ```

3. Follow the production setup in [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md): `/opt/ads/production/.env`, the production GitHub environments and reviewers, `make prod`, and the pre-flight checklist.
4. Expand the certificate with `api.`, `admin.` and `rescue.` (see "DNS & TLS" in DEPLOYMENT-PLAN.md), start the gateway again as in step 16, and re-enable the backup workflow.
5. Check the RAM: production plus staging on one host needs 16 GB (see "Sizing" in DEPLOYMENT-PLAN.md).
