# Per-Service Hotfix and Rollback

> ADS-824 — replaces the all-or-nothing `DEPLOY_SHA` model with per-service
> image tag overrides so a single-service hotfix does not force a full-stack
> redeploy, and rollback of one service does not require re-deploying the
> other thirteen.

## Image tag format

Every image pushed by `.github/workflows/deploy.yml` (and validated by
`docker.yml`) is tagged with the **full 40-character git SHA** of the commit
that built it:

```
ghcr.io/ideasquared/adopt-dont-shop/<image-name>:<git-sha>
```

For example:

```
ghcr.io/ideasquared/adopt-dont-shop/service-auth:a3f9c1d2e4b5...
```

`docker.yml` also confirms this: the matrix build step tags the local image as
`$IMAGE_PREFIX/$image:${{ github.sha }}` and the deploy workflow pushes that
same tag to GHCR. Production deploys additionally push `:latest` for the same
digest. The SHA tag is always present and always refers to an immutable image
digest.

## How the override system works

Every service image line in `docker-compose.prod.yml` and
`docker-compose.staging.yml` uses the pattern:

```yaml
image: ghcr.io/ideasquared/adopt-dont-shop/<service>:${SERVICE_AUTH_TAG:-${DEPLOY_SHA:?DEPLOY_SHA must be set to a specific git SHA}}
```

- If `SERVICE_AUTH_TAG` (or the relevant `SERVICE_*_TAG` / `APP_*_TAG`
  variable) is set in the environment or `.env`, that tag is used for that
  service and that service only.
- If the per-service variable is unset, the image falls back to `DEPLOY_SHA`,
  which must always be present.
- All other services continue to use `DEPLOY_SHA`.

This means a normal full-stack deploy (no overrides) behaves exactly as before:
set `DEPLOY_SHA` and all 14 images resolve to the same SHA.

## Hotfix flow — deploy one service at a new SHA

**Scenario:** a critical bug is found in `service-auth`. A fix has been
committed to a branch, built, and pushed by `docker.yml` as
`ghcr.io/ideasquared/adopt-dont-shop/service-auth:<hotfix-sha>`. You do not
want to wait for a full-stack build at that SHA.

1. Confirm the hotfix image exists in GHCR:
   ```
   docker buildx imagetools inspect \
     ghcr.io/ideasquared/adopt-dont-shop/service-auth:<hotfix-sha>
   ```

2. Dispatch the deploy workflow via GitHub Actions UI or CLI:
   - **Environment:** `production` (or `staging` for pre-validation)
   - **tag_overrides:** `SERVICE_AUTH_TAG=<hotfix-sha>`

   Via CLI:
   ```bash
   gh workflow run deploy.yml \
     -f environment=production \
     -f tag_overrides="SERVICE_AUTH_TAG=<hotfix-sha>"
   ```

3. The workflow:
   - Validates the key/value format (key must match `^(SERVICE|APP)_[A-Z_]+_TAG$`,
     value must match `^[A-Za-z0-9._-]+$`).
   - Appends `SERVICE_AUTH_TAG=<hotfix-sha>` to the `.env` on the host.
   - Runs `docker compose up -d`, which recreates **only** `service-auth`
     (compose detects the changed image reference).
   - Runs the full per-service health check loop and the ADS-813 smoke check.

4. Confirm via the workflow log that only `service-auth` was recreated and that
   all health checks passed.

## Rollback flow — revert one service to a previous known-good tag

**Scenario:** the hotfix made things worse. You need `service-auth` back on the
previous known-good SHA.

Find the previous SHA from:
- `.last_sha` on the deploy host (`cat /opt/ads/production/.last_sha`)
- The workflow run log for the last successful deploy
- `git log --oneline main` — the SHA tag matches the git commit SHA

Dispatch the deploy workflow again with the previous SHA as the override:

```bash
gh workflow run deploy.yml \
  -f environment=production \
  -f tag_overrides="SERVICE_AUTH_TAG=<previous-good-sha>"
```

The workflow replaces the `.env` entry for `SERVICE_AUTH_TAG` and recreates
only `service-auth` at the old tag.

To revert the override entirely (return `service-auth` to the fleet-wide
`DEPLOY_SHA`), dispatch without a `tag_overrides` for that key, then remove
the line manually from `.env` on the host, or deploy again without the override
so `DEPLOY_SHA` takes effect.

## Schema migration caveat

Each service runs `pnpm db:migrate --if-present` on container boot
(see the `Dockerfile.service` entrypoint). This means:

- When you **hotfix-deploy** a new image, the new image's pending migrations run
  against the live database before the service starts accepting traffic.
- When you **rollback** to an older image, the database schema is **ahead** of
  what the old binary expects. If the forward migration added a column the old
  code does not know about, that is usually safe (additive migrations). If the
  forward migration removed a column the old code still reads, or added a
  `NOT NULL` constraint the old code does not populate, rollback will cause
  errors.

**Before rolling back an image that ran migrations**, be aware that there is
**no `pnpm db:migrate:undo` script** — the shared runner in
`packages/db/src/migrate.ts` only runs migrations forward. If the forward
migration is incompatible with the older binary, you cannot simply "undo" it
on the deploy host. The options are:

1. Write a corrective forward migration that restores the shape the older
   binary needs, ship it as a new hotfix release, and roll forward.
2. Manually revert the schema change via psql on the deploy host, then flip
   the `pgmigrations` row so the migration can be re-applied later.

See [`docs/runbooks/deploy-rollback.md`](../runbooks/deploy-rollback.md)
("Backward-compatible migration only" section) and
[`docs/runbooks/migration-failure.md`](../runbooks/migration-failure.md)
for detailed recovery paths.

## Available per-service tag variables

| Variable | Compose service | Internal port |
|---|---|---|
| `SERVICE_GATEWAY_TAG` | `service-gateway` | 4000 |
| `SERVICE_AUTH_TAG` | `service-auth` | 5002 |
| `SERVICE_NOTIFICATIONS_TAG` | `service-notifications` | 5001 |
| `SERVICE_PETS_TAG` | `service-pets` | 5003 |
| `SERVICE_RESCUE_TAG` | `service-rescue` | 5004 |
| `SERVICE_APPLICATIONS_TAG` | `service-applications` | 5005 |
| `SERVICE_CHAT_TAG` | `service-chat` | 5006 |
| `SERVICE_MODERATION_TAG` | `service-moderation` | 5007 |
| `SERVICE_MATCHING_TAG` | `service-matching` | 5008 |
| `SERVICE_AUDIT_TAG` | `service-audit` | 5009 |
| `SERVICE_CMS_TAG` | `service-cms` | 5010 |
| `APP_CLIENT_TAG` | `app-client` | 8080 |
| `APP_ADMIN_TAG` | `app-admin` | 8080 |
| `APP_RESCUE_TAG` | `app-rescue` | 8080 |

Multiple overrides can be passed as a comma-separated list:

```
SERVICE_AUTH_TAG=<sha1>,SERVICE_PETS_TAG=<sha2>
```
