# Migration Failure

**Page severity:** `critical` — `service-backend` will not start until
`service-backend-migrate` exits 0. Site is effectively down.

## Symptoms

- Deploy job's health-check loop in `.github/workflows/deploy.yml`
  times out and exits non-zero.
- `docker compose ps` shows `service-backend-migrate` as `exited (1)`
  and `service-backend` as not started (blocked by compose's
  `service_completed_successfully` dependency — see
  [`docs/operations/deploy.md`](../operations/deploy.md)).
- Old backend container is still running on the previous tag — **no
  traffic is shifted to the failed image**. Site stays up on the old
  release.

The good news: the deploy gate worked. The old binary is still
serving. You have time to triage; you do not need to mitigate user
impact first.

## Triage in 60 seconds

```bash
# 1. Read the failing migration name + error.
docker compose -f docker-compose.prod.yml logs --no-color \
  service-backend-migrate

# 2. What's actually been applied?
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 10;'
```

The failing migration is logged at the top of `service-backend-migrate`'s
output. Note its filename — you'll need it to decide recovery path.

## Diagnosis — choose ONE recovery path

These mirror the four documented modes in
[`docs/operations/deploy.md`](../operations/deploy.md#when-the-migration-init-container-fails).

### A. Migration code bug → fix forward

The failing migration has a logic error.

- The migration's row will **not** be in `SequelizeMeta` (sequelize-cli
  only writes it after `up()` returns).
- Re-running `db:migrate` will replay the whole `up()`.

```bash
# 1. Author the corrective migration on a branch, get it merged.
# 2. Wait for CI to build a new image tag.
# 3. Re-deploy with the new tag.
```

The site continues to serve on the old binary while you do this. No
emergency action needed beyond a fast PR review.

### B. Migration partially applied (multi-statement, no tx)

Some DDL landed, the rest failed. `SequelizeMeta` is still missing
the migration's row, so a re-run will try to land the already-applied
DDL again.

```bash
# 1. Identify what landed.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# ... inspect schema by hand: \d <table>

# 2. Hand-revert the partial changes via psql so the migration's
#    up() can run cleanly from scratch.

# 3. Re-run the migration init container.
docker compose -f docker-compose.prod.yml run --rm service-backend-migrate
```

This is the most dangerous path — make a backup first (see
[`docs/db-backup-runbook.md`](../db-backup-runbook.md#pre-migration-backup-checklist))
and have the DBA on the line.

### C. Lock contention (`could not obtain lock`)

A long-running query is holding the table. The migration exits on
`DB_LOCK_TIMEOUT_MS` (default 10s — see
`service.backend/src/sequelize.ts`).

```bash
# Find the blocker.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT pid, state, now()-query_start AS age, left(query, 100) AS q
   FROM pg_stat_activity
   WHERE datname=current_database() AND state <> 'idle'
   ORDER BY age DESC LIMIT 10;"

# Wait it out, or terminate it.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT pg_terminate_backend(<pid>);"

# Re-run the migration.
docker compose -f docker-compose.prod.yml run --rm service-backend-migrate
```

### D. Migration succeeded but health-check failed

`SequelizeMeta` **does** contain the migration. The schema is ahead
of the old binary that's still serving traffic. This is the "schema
is ahead of binary" failure mode.

```bash
# 1. Decide: forward-fix (deploy a new image that handles the new
#    schema) or back out (run the migration's down()).
docker compose -f docker-compose.prod.yml run --rm service-backend-migrate \
  npx sequelize-cli db:migrate:undo
```

If `down()` is a no-op or destructive, **stop and call the DBA**.
Backing out a forward-only schema change is a one-way door — restore
from the pre-migration backup is sometimes the only safe option.

## Mitigation

The old binary is still serving. Don't break that:

- **Do not** restart `service-backend` until the migration succeeds —
  compose will block startup on the failed init container, leaving
  you with zero replicas.
- **Do not** delete `service-backend-migrate`'s container before
  reading its logs — you lose the failure diagnostic.

If business pressure forces serving while the migration is being
authored, enable maintenance mode per
[`maintenance-mode.md`](./maintenance-mode.md) for write paths and
let reads continue on the old binary.

## Verify

```bash
# 1. Migration applied cleanly.
docker compose -f docker-compose.prod.yml logs service-backend-migrate \
  | tail -20

# 2. SequelizeMeta now contains the migration row.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 5;'

# 3. Backend starts and is healthy.
docker compose -f docker-compose.prod.yml up -d service-backend
curl -sf https://${PROD_HOSTNAME}/api/v1/ready | jq
```

## Capture

```bash
# The init container's logs are your post-mortem.
docker compose -f docker-compose.prod.yml logs --no-color \
  service-backend-migrate > /tmp/migration-incident-$(date +%s).log

# Note the backup filename you took before the deploy.
ls -lh /var/backups/adopt-dont-shop/ | tail
```

File a Linear follow-up linking the PR that introduced the bad
migration. If recovery used path B or D, schedule a restore drill
sooner than the next quarterly cycle.
