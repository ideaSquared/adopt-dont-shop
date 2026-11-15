# Ops CLI: onboarding, access and break-glass

> **Audience:** the maintainer who administers `pnpm ops` access, and on-call when a break-glass alert fires.
> **Last reviewed:** 2026-11-08
> **Related alerts:** none (the alert posted to Discord by ideasquared-bot when an unlock is created is the alert). Design: [ADR 0016](../adr/0016-developer-ops-cli.md).

`pnpm ops …` runs allow-listed gRPC RPCs against dev, staging or production through `service-ops`. This runbook is the admin side: who gets access, how the pieces are provisioned, and what to do when something about it goes wrong. For the commands themselves, see [`packages/ops-cli/README.md`](../../packages/ops-cli/README.md).

How a call travels:

```
laptop: pnpm ops  ──HTTP──►  127.0.0.1:14101 / 14102 (SSH tunnel)  ──►  VPS 127.0.0.1:4101 / 4102  ──►  service-ops container :4100
dev:    pnpm ops  ──HTTP──►  127.0.0.1:4100 (compose publishes it directly)
```

| Environment | Host loopback port (VPS) | CLI reaches it via                             | GitHub team (`OPS_GITHUB_TEAM` in that host's `.env`) |
| ----------- | ------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| dev         | `127.0.0.1:4100`         | direct `http://127.0.0.1:4100`, no login       | none (`OPS_AUTH_MODE=local`)                          |
| staging     | `127.0.0.1:4101`         | `ssh -N -L 14101:127.0.0.1:4101 <user>@<host>` | `adoptdontshop`                                       |
| prod        | `127.0.0.1:4102`         | `ssh -N -L 14102:127.0.0.1:4102 <user>@<host>` | `adoptdontshop`                                       |

`service-ops` is never behind nginx or the edge gateway. If you ever see it in `nginx/` or `deploy/gateway/`, remove it.

## Preconditions

- You administer the GitHub organisation (to create the OAuth app and teams) and have SSH as `deploy` on the VPS (to add Unix users and edit `/opt/ads/<env>/.env`). See the shared list in [`runbooks/README.md`](./README.md#preconditions).
- The stack runs `service-ops`: its image ships with every deploy, and `docker compose -f docker-compose.<env>.yml ps service-ops` shows `healthy` once the host `.env` values below are set.

## One-time setup

### 1. Create the GitHub OAuth app (device flow)

1. GitHub → the organisation's Settings → Developer settings → OAuth Apps → **New OAuth App**. Name it `ads-ops`, set the homepage to the repo URL, and put any URL in the callback field (the device flow does not use it).
2. Open the app and tick **Enable Device Flow**. Save.
3. Copy the **Client ID**. There is no client secret to store: the device flow does not use one.
4. Access is membership of the `adoptdontshop` team in the organisation, for both staging and production.

### 2. Set the host `.env` values

The values are not secret. Write them in each host `.env` (staging and production are separate directories, and both use the `adoptdontshop` team):

```bash
ssh deploy@$PROD_HOST
cd /opt/ads/staging        # then repeat in /opt/ads/production
$EDITOR .env
```

```
OPS_GITHUB_CLIENT_ID=<client id from step 1>
OPS_GITHUB_ORG=ideaSquared
OPS_GITHUB_TEAM=adoptdontshop        # the ADS product team, in both /opt/ads/staging and /opt/ads/production
```

**Set these before the first deploy that includes `service-ops`.** In `github` auth mode the service refuses to boot without all three, and `deploy.yml` stops before `up -d` if any is missing from the host `.env`. A deploy that got past that check with bad values would leave `service-ops` crash-looping and fail the health gate.

To apply a change without a full deploy (recreates only `service-ops`):

```bash
docker compose -f docker-compose.staging.yml --env-file .env up -d service-ops
docker compose -f docker-compose.staging.yml ps service-ops
```

Expected: `Up (healthy)`.

### 3. Configure alerting (required for unlocks)

Break-glass unlocks are refused (`UNLOCKS_DISABLED`) until alerting is configured. This is deliberate: no alert channel, no unlock. Reads that do not touch PII work without it.

`service-ops` sends a signed alert to ideasquared-bot's `/alert` endpoint, which posts it to the project's `ads-github` Discord channel and pings @everyone. `ALERT_URL` is committed in the compose files; only the signing key is a secret.

1. In GitHub → Settings → Secrets and variables → Actions → add the repository secret `ALERT_SECRET` (or per environment under `staging` and `production`), with the same value as `ALERT_SECRET` on the ideasquared-bot Worker.
2. Redeploy (or dispatch `rollback.yml` to the current SHA). `deploy.yml` passes the secret as `SECRET_ALERT_SECRET`, and `scripts/deploy-secrets.sh` writes `/opt/ads/<env>/secrets/alert_secret`.
3. Verify: `ssh deploy@$PROD_HOST 'test -s /opt/ads/staging/secrets/alert_secret && echo configured || echo EMPTY'`. Then create a test unlock from staging and confirm the message arrives.

The secret is optional for the deploy itself: if it is unset the file is written empty and the deploy passes.

## Onboard a developer

1. **Grant access.** Add them to the `adoptdontshop` GitHub team, which covers staging and production. That is all the application needs. They can then run `pnpm ops login`.
2. **Give them a tunnel.** They need a way to reach the loopback port, which means a Unix user on the VPS that can forward ports and do nothing else. They must **not** be in the `docker` group (that is root-equivalent) and must not use the shared `deploy` key.

   ```bash
   # As root on the VPS. The Unix user is their GitHub login in lower case.
   LOGIN=Alice-GH                                   # their GitHub login
   NEWUSER=$(echo "$LOGIN" | tr '[:upper:]' '[:lower:]')
   adduser --disabled-password --gecos '' "$NEWUSER"
   install -d -m 700 -o "$NEWUSER" -g "$NEWUSER" "/home/$NEWUSER/.ssh"
   # Their public keys, which `eng setup` adds to their GitHub account (never a private key):
   curl -fsS "https://github.com/$LOGIN.keys" > "/home/$NEWUSER/.ssh/authorized_keys"
   test -s "/home/$NEWUSER/.ssh/authorized_keys" || echo "No keys on GitHub: ask them to run eng setup"
   chown "$NEWUSER:$NEWUSER" "/home/$NEWUSER/.ssh/authorized_keys" && chmod 600 "/home/$NEWUSER/.ssh/authorized_keys"
   id "$NEWUSER"            # must NOT list `docker` or `sudo`
   ```

3. **Restrict that user in sshd.** Add one `Match User` block per developer (or a `Match Group opstunnel` block and put the users in that group). Put it in a file that sorts after `00-hardening.conf`, because sshd keeps the first value it reads for each option and `Match` blocks must come last in a file:

   ```bash
   cat > /etc/ssh/sshd_config.d/60-ops-tunnel.conf <<'EOF'
   Match User alice
       PermitOpen 127.0.0.1:4101 127.0.0.1:4102
       AllowTcpForwarding local
       X11Forwarding no
       AllowAgentForwarding no
       PermitTTY no
       PermitTunnel no
       GatewayPorts no
       ForceCommand /usr/sbin/nologin
   EOF
   sshd -t && systemctl reload ssh
   ```

   Give staging-only developers `PermitOpen 127.0.0.1:4101` alone, so the SSH layer enforces the same boundary as the GitHub team. `ForceCommand /usr/sbin/nologin` stops a shell even if the key allows one, and `AllowTcpForwarding local` allows `ssh -L` but not `-R`.

4. **Check it from the developer's side**, and check what they cannot do:

   ```bash
   ssh -N -L 14101:127.0.0.1:4101 alice@$PROD_HOST &     # works, no prompt, stays open
   curl -fsS http://127.0.0.1:14101/health/ready          # service-ops answers
   ssh alice@$PROD_HOST                                   # must be refused: no shell
   ssh -N -L 15432:127.0.0.1:5432 alice@$PROD_HOST        # must be refused: PermitOpen
   ```

5. **Tell them how to connect**: open the tunnel, then `pnpm ops --env staging login` (it prints a code and a GitHub URL; `pnpm ops --help` lists the rest). The session lasts `OPS_SESSION_TTL_HOURS` (8 by default).

## Offboard a developer

Do all three. Removing only the GitHub team leaves a working tunnel, and removing only the SSH user leaves a valid session until it expires.

1. Remove them from the GitHub team(s). New logins are refused at once.
2. Remove the Unix user and the `Match User` block, then reload sshd:

   ```bash
   # As root on the VPS.
   pkill -KILL -u alice || true       # drop any open tunnel
   deluser --remove-home alice
   $EDITOR /etc/ssh/sshd_config.d/60-ops-tunnel.conf    # delete alice's Match block
   sshd -t && systemctl reload ssh
   ```

3. Cut off the session that is already open. A session token stays valid until it expires (at most `OPS_SESSION_TTL_HOURS`), and the GitHub team is only checked at login. Sessions live in `ops.sessions` (only a hash of the token is stored), so a restart does not end them; revoke them in the database, on each environment they used:

   ```sql
   UPDATE ops.sessions SET revoked_at = now()
   WHERE revoked_at IS NULL
     AND operator_id = (SELECT operator_id FROM ops.operators WHERE github_login = 'alice');
   UPDATE ops.unlocks SET revoked_at = now()
   WHERE revoked_at IS NULL AND expires_at > now()
     AND operator_id = (SELECT operator_id FROM ops.operators WHERE github_login = 'alice');
   ```

   (psql: see "Review the access log".) Then look for anything they did while in the window.

If their laptop was lost or stolen, treat it as compromised: do all three steps at once. The laptop never held the signing key, so no rotation is needed for this alone.

## Respond to an unlock alert

An alert from ideasquared-bot in the project's Discord channel means someone created a break-glass unlock. It names the operator, the environment, the subject (a user, rescue or application id, or `any`), the reason, the ticket and the expiry. While one person maintains the system the operator approves their own unlock, so the check is after the fact:

1. Is it expected? Match the operator to a person who should be working that ticket right now, and the ticket to a real issue (`ADS-123`).
2. Does the scope fit the ticket? A support case for one user should be scoped to `user:<id>`, not `any`.
3. If yes, do nothing; it expires by itself (30 minutes by default, 60 at most).
4. If no or unsure, **revoke it now** and ask the operator. The operator can revoke their own from the CLI (`pnpm ops --help` lists the unlock commands; the API is `DELETE /v1/unlocks`). If they are unreachable, revoke in the database. Revoking the unlock is enough; also revoke their sessions (the second statement under "Offboard") if you suspect the account itself:

   ```sql
   UPDATE ops.unlocks SET revoked_at = now()
   WHERE revoked_at IS NULL AND expires_at > now()
     AND operator_id = (SELECT operator_id FROM ops.operators WHERE github_login = '<login from the alert>');
   ```

5. Then read what was revealed (next section). If it was not them, treat it as a credential compromise: remove the person from the team, revoke their sessions, and open [`secret-rotation-emergency.md`](./secret-rotation-emergency.md) if there is any sign the `deploy` key or host was involved.

## Review the access log

Every call is recorded in `ops.access_log`. Each row's `hash` covers the previous row's hash and its own content, and the database rejects `UPDATE`, `DELETE` and `TRUNCATE` on the table, so history cannot be edited quietly. Unlocks are also in the audit service as `ops.actionTaken` events. Query from the host:

```bash
cd /opt/ads/production
docker compose -f docker-compose.prod.yml exec database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

```sql
-- Last 50 calls, newest first, with who made them. revealed_fields holds field NAMES, never values.
SELECT l.id, l.at, o.github_login, l.rpc, l.mode, l.outcome, l.error_code, l.unlock_id, l.revealed_fields
FROM ops.access_log l JOIN ops.operators o USING (operator_id)
ORDER BY l.id DESC LIMIT 50;

-- Everything one operator did.
SELECT l.* FROM ops.access_log l JOIN ops.operators o USING (operator_id)
WHERE o.github_login = 'alice' ORDER BY l.id DESC;

-- Every call that revealed something under an unlock, and the unlock's stated reason.
SELECT l.at, o.github_login, l.rpc, l.revealed_fields, u.subject_type, u.subject_id, u.reason, u.ticket
FROM ops.access_log l
JOIN ops.operators o USING (operator_id)
JOIN ops.unlocks u USING (unlock_id)
ORDER BY l.id DESC;
```

**Verify the hash chain.** The link check is plain SQL and returns no rows when every row points at its predecessor (the first row points at 64 zeros):

```sql
SELECT id FROM (
  SELECT id, prev_hash, lag(hash, 1, repeat('0', 64)) OVER (ORDER BY id) AS expected
  FROM ops.access_log
) t WHERE prev_hash <> expected;
```

Any id returned marks a row whose predecessor was removed or replaced. That check cannot see a row whose content was altered while its stored hash was left alone. For that, recompute each hash with `verifyChain` / `computeEntryHash` in [`services/ops/src/access-chain.ts`](../../services/ops/src/access-chain.ts): `hash = sha256(prev_hash + canonicalJson(entry))`, where `entry` is the row's `at` (ISO 8601, millisecond precision), `operatorId`, `rpc`, `kind`, `mode`, `outcome`, `errorCode`, `planId`, `unlockId`, `revealedFields` and `requestHash`. Gaps in `id` alone are not evidence of tampering (a rolled-back insert burns a sequence value).

A broken chain is a security incident: stop, preserve the table (`pg_dump -t ops.access_log`), and open [`secret-rotation-emergency.md`](./secret-rotation-emergency.md).

## Clean up demo rescues

`pnpm ops demo create-rescue` (dev and staging only) leaves real rows behind: a verified rescue, its pets and an active `demo-…@example.com` owner. Remove each with `pnpm ops demo delete-rescue <rescueId> -e staging` when testing is done. To find leftovers, list rescues in the admin app and look for the `Demo Rescue` name prefix or a `demo-…@example.com` email. `delete-rescue` refuses any rescue with a staff member who is not a `demo-…@example.com` account, so it cannot remove a real rescue by mistake.

`pnpm ops demo create-adopter` leaves an active `demo-…@example.com` adopter. Remove it with `pnpm ops demo delete-adopter <userId> -e staging`, which deactivates the account and refuses any non-demo address.

To fill an existing staging rescue with sample pets, use `pnpm ops demo create-pets <rescueId> -e staging --count 5`. Those pets carry a `demo` tag; `pnpm ops demo delete-pets <rescueId> -e staging` deletes only the tagged ones and never the rescue's real pets.

`pnpm ops demo create-application <rescueId>` likewise leaves a demo adopter and an application on one of that rescue's pets. Remove them with `pnpm ops demo delete-application <applicationId> --rescue-id <rescueId> -e staging`; it refuses any application whose adopter is not a `demo-…@example.com` account.

## The shared `eng ops ads` contract

Alongside `/v1` (what `pnpm ops` speaks), `service-ops` serves the shared `@ideasquared/ops` contract under
`/ops/v1` on the same loopback port, so `eng ops ads` can drive ADS like the other ideaSquared products. Through the
same SSH tunnel it is `http://127.0.0.1:14101/ops/v1/catalog` (staging) and `/ops/v1/invoke`; in dev,
`http://127.0.0.1:4100/ops/v1/...`. No port, binding or compose change.

- **Auth**: the caller sends their own `gh auth token` as `Authorization: Bearer <token>`; no `pnpm ops login`
  session. Access is the same check as the device flow: an active member of `OPS_GITHUB_ORG`/`OPS_GITHUB_TEAM` for
  that environment (read with the caller's own token, so the token needs `read:org`). Not on the team: 403. A token
  GitHub rejects: 401. In dev only (`OPS_AUTH_MODE=local`, which config refuses outside `NODE_ENV=development` and
  `OPS_ENV=dev`) any bearer token is accepted: a token that is a valid login name acts as that login, anything else
  as `local-dev`. The `x-ops-expected-env` header is not needed; the catalog reports its `environment`.
- **Same safeguards**: every call goes through the same invoke path as `/v1`: minted least-privilege principal,
  masking, dry-run, and the same access log and `ops.actionTaken` events, recorded against the caller's operator
  (their GitHub account id, same as `pnpm ops`).
- **Available**: every registry read (`<service>.<command>`, for example `pets.get`, `auth.admin-get-user`);
  previews of writes (the real dry run, nothing changes); and running a write, which previews first and then
  executes that plan, so a failed dry run stops it. Fields are the request message's scalar fields.
- **Not available**: unlocks (masked fields stay masked here even if you hold an unlock, and request fields annotated PII or SPECIAL, or unannotated free text, such as
  every `--search` and a write's `--reason`, are not offered), history, `whoami`, the `demo.*` flows, requests with nested or
  repeated fields (`notifications.broadcast`), and **every write in prod** (it needs `pnpm ops --confirm prod`). Use
  `pnpm ops` for those.
- One log line per call (`command`, `mode`, `outcome`, `durationMs`); no login, arguments or results are logged.

## If `service-ops` is down

`service-ops` is a developer tool. Nothing in the product depends on it, so an outage is not a user-facing incident, but a failed health check does fail a deploy (the health gate includes `service-ops:4100`), so you need to fix it to ship.

1. `docker compose -f docker-compose.<env>.yml ps service-ops` and `logs --tail 100 service-ops`.
2. **Crash loop with a config error**: the log names the variable. In `github` mode it refuses to boot without `OPS_GITHUB_CLIENT_ID`, `OPS_GITHUB_ORG` and `OPS_GITHUB_TEAM`; fix the host `.env` and run `up -d service-ops`. An empty `ALERT_SECRET` is not a boot error: it only disables unlocks.
3. **`/health/ready` failing on a dependency**: it checks the database, NATS and Redis like every other service. Follow [`5xx-spike.md`](./5xx-spike.md) and the runbook for the broken dependency.
4. **Migration failure** (schema `ops`): follow [`migration-failure.md`](./migration-failure.md); the owning service is `service-ops`.
5. **Blocked deploy that you cannot wait out**: roll back with [`deploy-rollback.md`](./deploy-rollback.md). To ship everything else while `service-ops` is broken, redeploy with `tag_overrides` pinning `SERVICE_OPS_TAG` to the last good SHA.
6. **You need production data and the tool is down**: do not take the signing key off the host. Use the documented emergency routes in the other runbooks, and write down what you did.

## Verify

- `docker compose -f docker-compose.<env>.yml ps service-ops` shows `healthy`.
- `curl -fsS http://127.0.0.1:4101/health/ready` on the VPS (staging) returns 200. From outside the host, nothing answers on `4101` or `4102`: `curl -m 3 http://<host-public-ip>:4101/` times out. If it answers, the port is published beyond loopback; fix the compose file at once.
- A developer in the team can `pnpm ops --env staging whoami` through a tunnel; a user outside the team gets `denied` at login.
