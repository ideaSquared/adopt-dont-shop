# Emergency Secret Rotation

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none — you're here because a secret leaked (committed key,
> exposed token, compromised host) and must be rotated **now**, accepting the
> blast radius.

## Symptoms / trigger

- A signing key, DB password, or other secret has been exposed and must be
  invalidated immediately.
- You've decided the risk of leaving it live outweighs the disruption of
  rotating it.

## Blast radius — read before you rotate

Secrets are materialized as files under `/opt/ads/production/secrets/` by
`deploy.yml` and mounted read-only into containers at `/run/secrets/<name>`.
Each has a different, sometimes severe, blast radius:

| Secret (file)                                                             | What rotating it does                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `principal_signing_key` (`PRINCIPAL_SIGNING_KEY`)                         | The gateway signs the inter-service `Principal` token with it; every service verifies with the same key. Rotating it makes **in-flight gRPC calls carrying an old-signed principal fail signature verification** until every service has the new key. Requires a coordinated restart of the gateway **and** all services. |
| `jwt_secret` / `jwt_refresh_secret` (`JWT_SECRET` / `JWT_REFRESH_SECRET`) | Invalidates every issued access / refresh token → **all users are logged out** and must re-authenticate.                                                                                                                                                                                                                  |
| `encryption_key` (`ENCRYPTION_KEY`)                                       | AES-256-GCM key encrypting TOTP 2FA secrets at rest. **Rotating it makes existing encrypted data undecryptable** — do **not** rotate without a re-encryption plan. This is not a "just rotate it" secret.                                                                                                                 |
| `upload_signing_secret` (`UPLOAD_SIGNING_SECRET`)                         | Invalidates already-issued signed upload URLs.                                                                                                                                                                                                                                                                            |
| `db_password` (`DB_PASSWORD`, and `database_url`)                         | Must be changed **in Postgres and in the secret file together**, or services can't connect.                                                                                                                                                                                                                               |

If you can, rotate the **narrowest** secret that covers the exposure.

## Preconditions

- Prod SSH, `cd /opt/ads/production`, `docker compose -f docker-compose.prod.yml`.
- Access to update the **GitHub Actions repository secrets** (the source of
  truth `deploy.yml` re-materializes from) — a host-only edit is temporary.
- `pnpm secrets:generate` (or an equivalent CSPRNG) to mint replacement values.

## Procedure

The durable path is: update the GitHub secret, then redeploy so the host file is
re-materialized and containers restart with it. Under active compromise you can
edit the host file first for speed, but you **must** still update the GitHub
secret afterward or the next deploy reverts it.

1. **Generate the replacement** value (off the compromised channel):

   ```bash
   pnpm secrets:generate   # or: openssl rand -base64 48
   ```

2. **Break-glass (fastest) — rotate on the host now.** Overwrite the secret file
   and recreate the affected containers:

   ```bash
   cd /opt/ads/production
   printf '%s' '<new-value>' > secrets/<name>
   chmod 600 secrets/<name>
   ```

   Then recreate the services that read it. **For `principal_signing_key`, that
   is the gateway AND every service — recreate the whole stack so all of them
   load the new key together, or gRPC breaks between old/new holders:**

   ```bash
   # principal_signing_key: coordinated, whole-stack.
   docker compose -f docker-compose.prod.yml up -d --force-recreate
   # A single-service secret (e.g. upload_signing_secret on the gateway):
   # docker compose -f docker-compose.prod.yml up -d --force-recreate service-gateway
   ```

3. **Make it durable** — update the matching **GitHub Actions repository secret**
   to the same new value. Otherwise the next `deploy.yml` re-materializes the old
   value from GitHub and silently un-rotates you.

4. **`DB_PASSWORD` only** — the database itself must accept the new password
   before services use it. **DESTRUCTIVE ordering matters:** change it in
   Postgres, update both `secrets/db_password` and `secrets/database_url`, then
   recreate services. Do this with the DBA on the line:

   ```bash
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '<new>';"
   ```

## Verify

- Affected services are `Up (healthy)`:
  `docker compose -f docker-compose.prod.yml ps`.
- For a signing-key rotation, a live request round-trips end-to-end:
  `curl -sf https://${PROD_HOSTNAME}/health/simple` → 200, and a real
  authenticated call through the gateway succeeds (proves principal signing works
  across services).
- The GitHub secret now holds the new value (so the next deploy is consistent).
- No `bad_signature` / `signature mismatch` errors in gateway/service logs.

## Rollback

If a rotation broke the stack (e.g. only some services picked up a new
`principal_signing_key`), the fix is forward: re-run `up -d --force-recreate`
across the whole stack so every container loads the same current file. Reverting
to the leaked value is not an option — it's compromised.

## Escalate

`encryption_key` and `db_password` rotations are **DBA / security-lead**
decisions, not solo on-call actions — escalate before touching them. Escalate
immediately if a rotation logs everyone out unexpectedly, if gRPC calls keep
failing signature checks after a whole-stack recreate, or if you're unsure which
secret covers the exposure.

## Capture

- The exposure: what leaked, where, and when it was rotated.
- Which secret(s) rotated, which containers recreated, and the timeline.
- Confirm the GitHub secret was updated (link the audit entry).

## Related

- [`deploy-rollback.md`](./deploy-rollback.md) — how deploy re-materializes host
  secrets from GitHub.
- [`host-reboot.md`](./host-reboot.md) — why the secret files are kept on disk.
