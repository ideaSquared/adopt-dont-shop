# Production Deploy Runbook

Companion to `docker-compose.prod.yml` and `nginx/nginx.prod.conf`. Covers
the operator-side steps that the compose file alone doesn't capture.

## Prerequisites

- Production host with Docker Engine ≥ 24 and Docker Compose v2.
- TLS cert + key mounted at `nginx/ssl/fullchain.pem` and `nginx/ssl/privkey.pem`,
  or a working letsencrypt volume populated by certbot.
- All `${VAR:?}` env vars in `docker-compose.prod.yml` set in `.env`.
- `GHCR_TOKEN` repository secret set to a PAT scoped **`read:packages` only** — used by the deploy and rollback workflows to `docker pull` images on the server. See [`docs/SECRETS-MANAGEMENT.md`](../SECRETS-MANAGEMENT.md#github-actions-repository-secrets). [ADS-671]

## One-time setup

1. Replace `__PROD_HOSTNAME__` in `nginx/nginx.prod.conf` with your real hostname
   (e.g. `adoptdontshop.example`). nginx does not expand env vars in
   `server_name`, so this is a build-time substitution. A simple `sed` works:

   ```bash
   sed -i.bak "s/__PROD_HOSTNAME__/${PROD_HOSTNAME}/g" nginx/nginx.prod.conf
   ```

2. Provision DNS A/AAAA records for `${PROD_HOSTNAME}`,
   `api.${PROD_HOSTNAME}`, `admin.${PROD_HOSTNAME}`, `rescue.${PROD_HOSTNAME}`
   pointing at the host.

## Pre-launch secret rotation

Run this section **before the first production deploy** and whenever a secret may
have been compromised.

### 1. Generate fresh production secrets

```bash
npm run secrets:generate
```

Copy the output into your production `.env` (or secrets manager). Each run produces
cryptographically random values — **do not re-use values from staging or development**.

The six application secrets that must be rotated for every new environment:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signs long-lived refresh tokens |
| `SESSION_SECRET` | Encrypts server-side sessions |
| `CSRF_SECRET` | Signs CSRF tokens |
| `ENCRYPTION_KEY` | AES-256-GCM key for PII fields (must be 64 hex chars / 32 bytes) |
| `UPLOAD_SIGNING_SECRET` | Signs upload URLs |

Regenerate `POSTGRES_PASSWORD` and `REDIS_PASSWORD` too if they carried over from a
development or staging environment.

### 2. Verify secrets are valid and distinct

`validate-env.ts` enforces that all six secrets are present, at least 32 characters
long, not a placeholder (`CHANGE_THIS…`), and distinct from each other. Run it against
your production env file before deploying:

```bash
# Validate a named file
NODE_ENV=production npm run validate:env -- --env-file=.env.prod

# Or with secrets already in the environment (CI)
NODE_ENV=production npm run validate:env
```

A non-zero exit means at least one secret is missing, too short, uses a placeholder
value, or is duplicated across secrets — fix it before proceeding.

### 3. Confirm staging values are not reused

`validate-env.ts` already rejects known placeholder patterns. For an extra check,
verify that no production secret shares a value with your staging env file:

```bash
# Any output here means a secret is shared between staging and prod — must fix.
comm -12 \
  <(grep -E '^(JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET|CSRF_SECRET|ENCRYPTION_KEY|UPLOAD_SIGNING_SECRET)=' .env.staging | sort) \
  <(grep -E '^(JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET|CSRF_SECRET|ENCRYPTION_KEY|UPLOAD_SIGNING_SECRET)=' .env.prod    | sort)
```

Expected output: (empty — no shared values).

### 4. Log the rotation

Record the rotation date, who performed it, and the reason in your secrets manager
or secured ops log. At minimum: `date`, `rotated_by`, `reason`.

### Rotation cadence

| Trigger | Action |
|---|---|
| Initial production launch | Full rotation of all six application secrets |
| Quarterly (~every 90 days) | Full rotation of all six application secrets |
| Suspected compromise | Immediate rotation of affected secret(s); full rotation if scope is unclear |
| Team member off-boarding | Rotate any secret the person had access to |
| Staging value detected in prod | Immediate full rotation |

## Image signing & verification

Images published by `.github/workflows/deploy.yml` are cosign-signed
(keyless OIDC) and verified before the deploy job runs. A deploy whose
images cannot be verified against this repo's `main`-branch identity
will FAIL at the `verify-images` job, before any container reaches the
host. See [`docs/security/image-signing.md`](../security/image-signing.md)
for the trust model, the manual verification command, and the documented
emergency-bypass procedure.

## Production approval gate

All `production` runs of `.github/workflows/deploy.yml` pause for reviewer
approval before the `deploy` job touches the host (the build/verify jobs run
first, so reviewers approve a fully built and signature-verified release).
Staging deploys stay automatic. [ADS-826]

The deploy job's `environment:` is resolved by the workflow's `preflight` job:

| Dispatch | Approval environment |
|---|---|
| `environment=staging` (with or without skip flags) | `staging` — no approval |
| `environment=production`, no skip flags | `production` |
| `environment=production` + `skip_ci_check` and/or `skip_cosign_verify` | `production-bypass` |

Bypass runs route to the dedicated `production-bypass` environment so the
reviewer list sees at a glance that safety checks are being skipped. Any run
with a skip flag set must also provide the `bypass_reason` dispatch input —
the preflight job fails the run if it is empty — and every bypass (staging
included) is recorded in the run summary and as a GitHub issue labelled
`deploy-bypass-audit`.

### One-time admin setup

Configure required reviewers once per repository (repo admin):

1. Go to **Settings → Environments**.
2. Click **New environment** (or open it if it already exists from a past
   run), name it exactly `production`, and click **Configure environment**.
3. Tick **Required reviewers** and add the people/teams allowed to approve
   production deploys (up to six entries).
4. Tick **Prevent self-review** so the person who dispatched the deploy
   cannot approve their own run.
5. Click **Save protection rules**.
6. Repeat steps 2-5 for a second environment named exactly
   `production-bypass`. Keep its reviewer list to the small set of people
   allowed to sign off on safety-check bypasses.

Note: environments that have not been configured do not block anything —
GitHub auto-creates an unprotected environment the first time a workflow
references it, and an unprotected environment deploys without approval. The
workflow change therefore merges safely before this setup is done; the gate
only takes effect once required reviewers are saved.

## Release deploy

The `service-backend-migrate` init container runs `npm run db:migrate`
(custom Umzug runner) once before `service-backend` starts. Compose's
`service_completed_successfully` dependency gates the backend on a clean
migration. [ADS-393]

```bash
# Pull immutable image tags (sha-prefixed or vX.Y.Z) — never :latest in
# production deploys. See ADS-396 for the rationale.
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Verify:

```bash
docker compose -f docker-compose.prod.yml ps           # all healthy
docker compose -f docker-compose.prod.yml logs service-backend-migrate
curl -sf https://${PROD_HOSTNAME}/health
```

## When the migration init container fails

If `service-backend-migrate` exits non-zero, the `service-backend` service
will not start (compose's `service_completed_successfully` dependency
blocks it). The deploy job's health-check loop in
`.github/workflows/deploy.yml` will then time out and exit non-zero,
leaving the previous backend container still running on `:latest` /
the old SHA. No traffic is shifted to the failed image.

Triage:

```bash
# Read the migration runner's logs — the failing migration is named at the top.
docker compose -f docker-compose.prod.yml logs --no-color service-backend-migrate

# Inspect what's already applied vs. pending.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name FROM "SequelizeMeta" ORDER BY name;'
```

Recovery paths:

1. **Migration code bug** — fix forward. Push the corrective migration on
   a follow-up PR; the next deploy re-runs all pending migrations
   including the new fix.
2. **Migration partially applied (multi-statement, no transaction)** —
   the affected migration's row is NOT in `SequelizeMeta` because
   the Umzug runner only writes it after `up()` returns successfully.
   Re-running `db:migrate` will retry the whole `up()`. If the migration
   is not idempotent, hand-revert what landed via psql before re-running.
3. **Migration succeeded but health check failed** — the migration is
   in `SequelizeMeta`. Roll the application image back per the next
   section; the schema is now ahead of the binary, which is the failure
   mode the schema-audit runbook covers.
4. **Lock contention** (`could not obtain lock`) — usually a long-running
   query holding the table. The migration will exit on
   `DB_LOCK_TIMEOUT_MS` (default 10s). Identify the offending session and
   either let it finish or terminate it, then re-deploy.

The migration runner is single-instance; if multi-replica deploys are
introduced later, wrap the `up()` body in a Postgres advisory lock —
tracked in ADS-393's follow-up.

## Rollback

Because release.yml emits immutable `:sha-<long>` and `:vX.Y.Z` tags, rollback
is deterministic: pick the previous known-good tag and re-deploy. [ADS-396]

```bash
export IMAGE_TAG=v1.2.3   # previous good release
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

If a migration introduced incompatible schema, run the corresponding `down`
migration before rolling back the application image:

```bash
docker compose -f docker-compose.prod.yml run --rm service-backend-migrate \
  npm run db:migrate:undo
```

## Database TLS (ADS-540)

`docker-compose.prod.yml` defaults `DB_SSL_MODE=require`, which makes the
Sequelize/`pg` driver open the link to Postgres over TLS. Three modes are
supported:

| `DB_SSL_MODE` | Behaviour |
|---------------|-----------|
| `require`     | TLS, no certificate verification (default) |
| `verify-ca`   | TLS, verify CA chain |
| `verify-full` | TLS, verify CA chain + hostname (recommended for managed providers) |

The backend refuses to boot in production with `DB_SSL_MODE=disable` unless
`ALLOW_INSECURE_DB=true` is also set — only safe on a fully trusted bridge
such as the in-cluster docker network on the same host.

### Managed Postgres (RDS / Neon / Supabase)

1. Download the provider's CA bundle (e.g. `rds-combined-ca-bundle.pem`).
2. Mount it into the backend container: add a `volumes:` entry to the
   `service-backend` / `service-backend-migrate` services pointing to a
   read-only path inside the container.
3. Set the env vars in `.env`:
   ```
   DB_SSL_MODE=verify-full
   DB_SSL_ROOT_CERT=/etc/ssl/certs/rds-combined-ca-bundle.pem
   ```

Boot logs print `sslMode=<mode>` so the effective setting is observable
without exec'ing into the container.

## Data at rest

See [`docs/security/data-protection.md`](../security/data-protection.md) for
the full breakdown: which PII columns use application-layer encryption
(passwords, 2FA secrets, tokens) vs which rely on the database provider's
storage-layer encryption (`email`, `phone`, addresses, DOB, free-text
profile fields). Verify your production provider has at-rest encryption
enabled before going live. [ADS-665]

## Backup / snapshot

See [`snapshot-policy.md`](./snapshot-policy.md). [ADS-500]

## WebSocket sticky sessions (ADS-678)

The Socket.IO per-user connection cap is enforced per backend instance,
not globally. Multi-replica deploys MUST configure load-balancer
stickiness on the `/socket.io` route so a given user's sockets land on
one backend. With nginx in front, add `ip_hash;` to the backend
upstream block; with AWS ALB, enable `lb_cookie` stickiness on the
target group.

See [`../architecture/adr-socket-sticky-sessions.md`](../architecture/adr-socket-sticky-sessions.md)
for the full rationale, alternatives considered, and the explicit LB
settings the ops team must apply.

## Known limitations

- nginx hostname substitution is manual (placeholder string). A future
  iteration could ship a `docker-entrypoint` that runs `envsubst` over a
  template, but that would change the compose volume mount.
- `service-backend-migrate` runs single-instance. Multi-replica deploys must
  wrap migrations in a Postgres advisory lock — tracked in ADS-393's
  follow-up.
