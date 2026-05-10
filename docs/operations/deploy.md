# Production Deploy Runbook

Companion to `docker-compose.prod.yml` and `nginx/nginx.prod.conf`. Covers
the operator-side steps that the compose file alone doesn't capture.

## Prerequisites

- Production host with Docker Engine ≥ 24 and Docker Compose v2.
- TLS cert + key mounted at `nginx/ssl/fullchain.pem` and `nginx/ssl/privkey.pem`,
  or a working letsencrypt volume populated by certbot.
- All `${VAR:?}` env vars in `docker-compose.prod.yml` set in `.env`.

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

## Release deploy

The `service-backend-migrate` init container runs `sequelize-cli db:migrate`
once before `service-backend` starts. Compose's
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
   sequelize-cli only writes it after `up()` returns successfully.
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
  npx sequelize-cli db:migrate:undo
```

## Backup / snapshot

See [`snapshot-policy.md`](./snapshot-policy.md). [ADS-500]

## Known limitations

- nginx hostname substitution is manual (placeholder string). A future
  iteration could ship a `docker-entrypoint` that runs `envsubst` over a
  template, but that would change the compose volume mount.
- `service-backend-migrate` runs single-instance. Multi-replica deploys must
  wrap migrations in a Postgres advisory lock — tracked in ADS-393's
  follow-up.
