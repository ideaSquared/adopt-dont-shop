# Server setup (first time)

Step-by-step guide to prepare a new netcup VPS (audience: whoever sets up the host). This is the first of three guides; do them in order:

1. **Server setup** (this guide): the server, SSH, DNS and the GitHub secrets that let deploys reach it.
2. [Staging setup](./STAGING-SETUP.md): the staging site and the public landing page.
3. [Production setup](./PRODUCTION-SETUP.md): production, once staging works.

Read it top to bottom and do each step in order. You do not need any other document; links are for background only. When you finish, the server is hardened and ready for its first deploy, but serves nothing yet.

Every command block starts with a **Where:** line. There are four places, and the prompt tells you which window you are in:

| Where               | What it is                                                                           | Prompt looks like             |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------------- |
| **laptop terminal** | A terminal on your own computer (Git Bash on Windows), not logged in to the server   | your usual one, ending in `$` |
| **root SSH window** | A laptop terminal where you ran `ssh root@<vps-ip>` (step 3). Only used until step 7 | `root@<server-name>:~#`       |
| **netcup console**  | The server's browser console in the netcup Server Control Panel. Logs in without SSH | `root@<server-name>:~#`       |
| **website — …**     | A website, named on the line (netcup, GitHub, your DNS provider)                     | —                             |

If a command fails, first check the prompt: it is easy to type a server command into the laptop terminal or the other way round.

## Before you start

You need:

- A **netcup VPS** with at least 8 GB RAM. Staging alone fits in 8 GB; production plus staging needs 16 GB, and you can upgrade the plan later.
- Access to the **DNS** for `adoptdontshop.app`.
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

- Do not create `api`, `admin` or `rescue` yet. They point at production, which the [production setup](./PRODUCTION-SETUP.md) adds.
- Do not create AAAA (IPv6) records. With Docker's default settings, IPv6 visitors all look like one internal IP, which breaks the allowlist and the rate limits.

DNS takes time to spread, which is why this step comes early. The staging setup checks it before asking for a certificate.

## Step 10. GitHub: let deploys reach the server

**Where: website — GitHub, repository → Settings → Secrets and variables → Actions → Secrets.** Add:

| Secret                    | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| `NETCUP_HOST`             | `<vps-ip>`                                                         |
| `NETCUP_SSH_KEY`          | Set with the command below, straight from the key file             |
| `NETCUP_HOST_FINGERPRINT` | Set with the command below, using the `SHA256:…` value from step 8 |
| `GHCR_TOKEN`              | A classic personal access token with **only** `read:packages`      |

**Where: laptop terminal**, in the repository folder. Set the two SSH secrets with `gh` rather than pasting them into the website. Copy-paste easily breaks both: a private key that loses its `BEGIN`/`END` lines or line breaks fails with `ssh: no key found`, and a fingerprint with a missing `SHA256:` prefix or a stray space fails with `host key fingerprint mismatch`.

```bash
gh secret set NETCUP_SSH_KEY < ~/.ssh/ads-deploy       # the private key file, not ads-deploy.pub
gh secret set NETCUP_HOST_FINGERPRINT --body "SHA256:<rest of the value from step 8>"
```

**Where: website — GitHub, repository → Settings → Webhooks → Add webhook.** This posts deploy results to Discord through ideasquared-bot:

- **Payload URL:** `https://<ideasquared-bot worker host>/ads`
- **Content type:** `application/json`
- **Secret:** the bot's `GITHUB_WEBHOOK_SECRET_ADS`
- **Events:** "Let me select individual events", then tick **Deployment statuses**

**Where: website — GitHub, repository → Actions → Backup → ⋯ → Disable workflow.** The nightly backup only covers production, so it would fail every night until production is set up. The production setup turns it back on.

## Next

The server is ready. Continue with [STAGING-SETUP.md](./STAGING-SETUP.md).
