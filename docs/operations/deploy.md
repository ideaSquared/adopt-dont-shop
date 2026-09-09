# Production Deploy Runbook

Authoritative procedure for cutting a normal production/staging release (audience: operators). One-time server, DNS, cert and GitHub environment/secret provisioning lives in [DEPLOYMENT-PLAN.md](../infrastructure/DEPLOYMENT-PLAN.md); an in-progress deploy that has gone wrong (health-gate failure, incident rollback) is handled by [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md). This document is the happy-path release procedure.

## Prerequisites

- One-time provisioning complete — see [DEPLOYMENT-PLAN.md](../infrastructure/DEPLOYMENT-PLAN.md): server + Docker, DNS, TLS, and the six GitHub Actions repo secrets `deploy.yml` validates (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET`, `DB_PASSWORD`, `PRINCIPAL_SIGNING_KEY`).
- `GHCR_TOKEN` repository secret set to a PAT scoped **`read:packages` only** — the deploy and rollback workflows `docker pull` images with it (they FAIL fast on `write:packages`/`repo` scope). See [`docs/SECRETS-MANAGEMENT.md`](../SECRETS-MANAGEMENT.md#github-actions-repository-secrets). [ADS-671]
- `NATS_AUTH_TOKEN` repository secret set — required by both `deploy.yml` and `rollback.yml` to materialize `secrets/nats_auth_token` (ADS-1311).
- `SENTRY_AUTH_TOKEN` repository secret set (optional but recommended) — without it, frontend builds skip the sourcemap upload and log a loud warning; production stack traces in GlitchTip stay unsymbolicated (ADS-1319).
- `DISCORD_WEBHOOK_URL` repository secret set (optional) — `deploy.yml` posts to it on any job failure, reusing the same webhook Alertmanager already posts critical/warning alerts to. Skipped gracefully when unset (ADS-1324).
- `staging-vars` / `production-vars` GitHub Environments created (Settings → Environments → New environment), **no** required reviewers, each carrying environment variables `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_STATSIG_CLIENT_KEY` scoped to that target — otherwise the frontend build falls back to the single repository-level value for both environments (ADS-1318). See "Environment-scoped frontend build vars" below.
- `PROD_HOSTNAME` set as a plain key (not `${...}`) in `/opt/ads/production/.env`, e.g. `PROD_HOSTNAME=example.com` — `deploy.yml`/`rollback.yml` re-apply the `__PROD_HOSTNAME__` substitution into `nginx/nginx.prod.conf` from it on every run, now that the file is shipped fresh each time (ADS-1312).
- `gh` CLI authenticated (the `make` targets dispatch workflows through it).

## Environment-scoped frontend build vars (ADS-1318)

The frontend build step previously read `vars.VITE_API_BASE_URL` etc. with no `environment:` on the job, so staging and production images were baked with the **same** repository-level values — staging traffic and session replays landed in production Sentry/Statsig, and staging could point at the prod API.

`deploy.yml` now resolves these through a dedicated `resolve-frontend-vars` job scoped to an **unprotected** `<environment>-vars` GitHub Environment (`staging-vars` / `production-vars` — distinct from the approval-gated `staging`/`production`/`production-bypass` environments the `deploy` job itself pauses on). This lets the same variable name carry a different value per target without putting the production approval gate in front of the _build_ — reviewers still approve a fully built, signature-verified release, per the existing policy below.

Admin one-time setup: create `staging-vars` and `production-vars` environments with **no** required reviewers, and add environment variables under each:

| Variable                  | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL`       | Frontend API base URL for that environment |
| `VITE_WS_BASE_URL`        | Frontend WebSocket base URL                |
| `VITE_SENTRY_DSN`         | Sentry/GlitchTip DSN for that environment  |
| `VITE_STATSIG_CLIENT_KEY` | Statsig client key for that environment    |

Until both environments exist, `vars.*` falls back to the existing repository-level variable (unchanged behaviour) — nothing breaks if this is skipped, but staging and production keep sharing one value.

## Secret rotation

Rotate application secrets before the first production deploy and whenever one may be compromised. `pnpm validate:env` (`scripts/validate-env.ts`) enforces that five secrets — `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `UPLOAD_SIGNING_SECRET` — are present, ≥32 chars, not placeholders, and distinct:

```bash
NODE_ENV=production pnpm validate:env -- --env-file=.env.prod   # non-zero exit = fix before deploying
```

Note the two validators check **different** sets: the local `validate:env` script covers the five above (including `SESSION_SECRET`), while `deploy.yml`'s "Validate required deploy secrets" step gates on the six GitHub repo secrets listed under Prerequisites — which include `DB_PASSWORD` and `PRINCIPAL_SIGNING_KEY` (ADS-800) but **not** `SESSION_SECRET`. Provision both sets.

| Trigger                        | Action                                                                      |
| ------------------------------ | --------------------------------------------------------------------------- |
| Initial production launch      | Full rotation of all application secrets                                    |
| Quarterly (~every 90 days)     | Full rotation of all application secrets                                    |
| Suspected compromise           | Immediate rotation of affected secret(s); full rotation if scope is unclear |
| Team member off-boarding       | Rotate any secret the person had access to                                  |
| Staging value detected in prod | Immediate full rotation                                                     |

Full secret generation and provisioning steps: [DEPLOYMENT-PLAN.md](../infrastructure/DEPLOYMENT-PLAN.md).

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

| Dispatch                                                                      | Approval environment                                                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `environment=staging` (with or without skip flags)                            | `staging` — no approval                                                                                                       |
| `environment=production`, no skip flags                                       | `production`                                                                                                                  |
| `environment=production` + `skip_ci_check` and/or `skip_cosign_verify`        | `production-bypass`                                                                                                           |
| `backup.yml` / `backup-restore-drill.yml` (`schedule:` + `workflow_dispatch`) | `backups` — no approval (required for a schedule to ever complete unattended; see [snapshot-policy.md](./snapshot-policy.md)) |

Bypass runs route to the dedicated `production-bypass` environment so the
reviewer list sees at a glance that safety checks are being skipped. Any run
with a skip flag set must also provide the `bypass_reason` dispatch input —
the preflight job fails the run if it is empty — and every bypass (staging
included) is recorded in the run summary and as a GitHub issue labelled
`deploy-bypass-audit`.

The one-time configuration of the `production` / `production-bypass` reviewer environments is covered in [DEPLOYMENT-PLAN.md](../infrastructure/DEPLOYMENT-PLAN.md).

### Blind-deploy gate (ADS-1307, partial)

A production deploy also fails — before touching any container — when
`OBSERVABILITY_ENABLED` is not `true` in `/opt/ads/production/.env`: an
unmonitored release can fail silently with nobody paged. To proceed anyway,
re-dispatch with `allow_blind_deploy=true` **and** a `bypass_reason`; this is
audited exactly like `skip_ci_check`/`skip_cosign_verify` (same
`bypass_reason` requirement, same run-summary table, same
`deploy-bypass-audit` issue). Staging is unaffected. The rest of ADS-1307
(node-exporter, disk alerts, dead-man's-switch) is tracked separately.

## Release deploy

The deploy is dispatched through GitHub Actions, not run by hand on the host. `deploy.yml` builds every service/app image, tags it `ghcr.io/ideasquared/adopt-dont-shop/<image>:<git-sha>` (the full 40-char commit SHA), signs it with cosign, then SSHes to the host, writes `DEPLOY_SHA=<sha>` into `/opt/ads/<env>/.env`, and runs `docker compose -f docker-compose.prod.yml up -d`. There is no `:latest` tag — every deploy, staging or production, pins to an explicit `DEPLOY_SHA`, and nothing ever pulls `:latest` (ADS-1322).

Before `up -d`, the workflow also `scp`'s `docker-compose.prod.yml`, `docker-compose.staging.yml`, `docker-compose.observability.yml`, `docker-compose.glitchtip.yml`, the `nginx/` directory, and the `observability/` config tree to `/opt/ads/<env>/`, and the shared edge gateway's `deploy/gateway/*` to `/opt/ads/gateway/` — all previously hand-copied once at provisioning and never updated again (ADS-1312). The shared edge gateway is versioned but **not** restarted automatically (it fronts both environments); apply a shipped change with `cd /opt/ads/gateway && docker compose -f docker-compose.gateway.yml up -d`. Production also re-applies the `__PROD_HOSTNAME__` substitution into the freshly-shipped `nginx/nginx.prod.conf` on every deploy, from the `PROD_HOSTNAME` key in the host `.env` (see Prerequisites) — the file is no longer hand-edited once and left alone.

Every schema-owning service migrates **its own** schema on boot — the `Dockerfile.service` entrypoint runs `pnpm run --if-present db:migrate` before the long-running process starts (no separate migrate init container). The runner is `node-pg-migrate` wrapped by `@adopt-dont-shop/db` (`packages/db/src/migrate.ts`); applied migrations are recorded in a `pgmigrations` table in each owning schema, guarded by a database-wide advisory lock with linear backoff (12× × 250ms × attempt) so simultaneous service boots don't trample each other. [ADS-393]

**Preconditions:** `gh` authenticated; the release commit is on `main`; one-time provisioning done.

1. Dispatch the deploy:

   ```bash
   make staging                # deploy main to staging (auto, no approval)
   make prod                   # dispatch a production deploy (pauses for reviewer approval)
   ```

   Expected: `gh` prints the dispatched run URL. `make watch` streams it.

2. For a production run, approve it in the GitHub Actions UI when the `deploy` job pauses on the `production` environment. The build + cosign-verify jobs run first, so you approve a fully built, signature-verified release.

3. The workflow runs its own per-service health gate (`wait-for-services.sh`, polling `/health/ready` — DB pool/Redis/NATS, not just process liveness, ADS-1308) after `compose up`; a failed gate auto-rolls back to the last-known-good SHA (see [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md)). Wait for the run to go green.

**Verify** (SSH to the host, `cd /opt/ads/production`, `export PROD_HOSTNAME=…`):

```bash
docker compose -f docker-compose.prod.yml ps           # all healthy
# Each schema-owning service logs its own migration output on boot:
docker compose -f docker-compose.prod.yml logs service-auth | grep migration
curl -sf https://${PROD_HOSTNAME}/health/simple        # Expected: 200 (liveness)
docker compose -f docker-compose.prod.yml exec -T service-gateway \
  curl -sf http://localhost:4000/health/ready          # Expected: 200 (readiness — DB/Redis/NATS)
```

## When a service's migrations fail

If a service's `db:migrate` exits non-zero, its container exits
non-zero from CMD and Docker keeps restarting it. The deploy job's
per-service health-check loop in `.github/workflows/deploy.yml`
will then time out and exit non-zero. The gateway and the unaffected
services keep serving on their previous tags, so only the failing
domain is down.

Triage:

```bash
# Find the failing service and its migration error.
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --no-color --tail=200 service-<name>

# Inspect what's already applied vs. pending in that service's schema.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name, run_on FROM <schema>.pgmigrations ORDER BY id DESC LIMIT 10;'
```

Full recovery procedure: [`docs/runbooks/migration-failure.md`](../runbooks/migration-failure.md).
Summary of the four canonical paths:

1. **Migration code bug** — fix forward. Push the corrective
   migration on a follow-up PR; the next deploy boots a new image
   that re-runs the migration set.
2. **Migration partially applied (multi-statement, no transaction)** —
   the affected migration's row is NOT in `pgmigrations` (the runner
   only writes it after `up()` returns). Re-running `db:migrate`
   will retry the whole `up()`. If the migration is not idempotent,
   hand-revert what landed via psql before restarting the service.
3. **Migration succeeded but the binary won't boot for another
   reason** — the migration is in `pgmigrations`. Roll the affected
   service back per the next section; the schema is now ahead of
   the old binary.
4. **Advisory-lock contention** — the runner already retries 12×
   on the database-wide lock around `pgmigrations`, so this rarely
   surfaces. If it does, a stuck migration elsewhere is holding the
   lock; identify and clear it, then restart the failing service.

## Rollback

The sanctioned rollback is the `rollback.yml` workflow, dispatched via `make`:

```bash
make rollback env=production sha=<git-sha>   # re-deploys the whole stack at that SHA
```

It must be a full 40-char (or ≥7-char hex prefix) git SHA whose images already exist in GHCR — never a `:latest` or a `sha-`/`vX.Y.Z` tag. `deploy.yml` also auto-rolls back to the last-known-good SHA on a failed health/smoke gate and persists it in `/opt/ads/<env>/.env`. The step-by-step incident procedure (single-service `SERVICE_<NAME>_TAG` overrides, break-glass on the host, auto-rollback behaviour) lives in [runbooks/deploy-rollback.md](../runbooks/deploy-rollback.md).

`rollback.yml` is at parity with `deploy.yml` (ADS-1311): it ships the same compose/nginx/observability config before `up -d`, clears any `SERVICE_*_TAG`/`APP_*_TAG` overrides before rewriting `DEPLOY_SHA`, materializes `secrets/nats_auth_token` (and the rest of `secrets/*`), layers in the observability/GlitchTip overlays when enabled, and gates on all 11 services' `/health/ready` — not the gateway alone.

Break-glass single-service pin, on the host (`cd /opt/ads/production`) — not persisted, the next deploy overwrites `.env`:

```bash
# Pin one service to a known-good SHA (bare git SHA, not sha-/vX.Y.Z):
export SERVICE_PETS_TAG=<git-sha>
docker compose -f docker-compose.prod.yml pull service-pets
docker compose -f docker-compose.prod.yml up -d service-pets
```

There is **no `pnpm db:migrate:undo` script** — the runner is
`up`-only. If a migration introduced incompatible schema, you must
write a corrective migration that performs the reverse DDL, ship a
new image, and let the next boot apply it. Running a migration's
`down()` directly via `node-pg-migrate` from inside the container
is possible but bypasses the deploy pipeline; only do it with a DBA
on the line and a backup taken first. See
[`docs/runbooks/migration-failure.md`](../runbooks/migration-failure.md)
path E.

## Database TLS (ADS-540)

`docker-compose.prod.yml` defaults `DB_SSL_MODE=require`, which makes the
`pg` driver (`packages/db/src/client.ts`) open the link to Postgres over TLS.
Three modes are supported:

| `DB_SSL_MODE` | Behaviour                                                           |
| ------------- | ------------------------------------------------------------------- |
| `require`     | TLS, no certificate verification (default)                          |
| `verify-ca`   | TLS, verify CA chain                                                |
| `verify-full` | TLS, verify CA chain + hostname (recommended for managed providers) |

Every schema-owning service refuses to boot in production with
`DB_SSL_MODE=disable` unless `ALLOW_INSECURE_DB=true` is also set —
only safe on a fully trusted bridge such as the in-cluster docker
network on the same host.

### Managed Postgres (RDS / Neon / Supabase)

1. Download the provider's CA bundle (e.g. `rds-combined-ca-bundle.pem`).
2. Mount it into every schema-owning service container: add a
   `volumes:` entry to each `service-*` service in
   `docker-compose.prod.yml` that runs migrations or holds a pg pool
   (`service-auth`, `service-pets`, `service-rescue`,
   `service-applications`, `service-chat`, `service-notifications`,
   `service-moderation`, `service-matching`, `service-cms`,
   `service-audit`) pointing to a read-only path inside the container.
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

The Socket.IO per-user connection cap is enforced per gateway
instance, not globally. Multi-replica gateway deploys MUST configure
load-balancer stickiness on the `/socket.io` route so a given user's
sockets land on one gateway. With nginx in front, add `ip_hash;` to
the gateway upstream block; with AWS ALB, enable `lb_cookie`
stickiness on the target group.

See [`../adr/0013-socket-sticky-sessions.md`](../adr/0013-socket-sticky-sessions.md)
for the full rationale, alternatives considered, and the explicit LB
settings the ops team must apply.

## Known limitations

- nginx hostname substitution is manual (placeholder string). A future
  iteration could ship a `docker-entrypoint` that runs `envsubst` over a
  template, but that would change the compose volume mount.
- Each service runs its own migrations on boot. Multi-replica deploys
  rely on the database-wide advisory lock around `pgmigrations` (built
  into `@adopt-dont-shop/db`) to serialise concurrent boots — see
  `packages/db/src/migrate.ts` for the retry policy.
