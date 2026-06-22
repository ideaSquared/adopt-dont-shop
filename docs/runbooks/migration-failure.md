# Migration Failure

**Page severity:** `critical` for the affected service — the failing
service won't start until its migrations apply. The rest of the stack
keeps serving on the old binary (gateway + healthy services), so the
site is degraded, not down.

## Background — how migrations run

There is **no** dedicated `service-backend-migrate` init container.
Every schema-owning service migrates **its own** schema on every boot:
the entrypoint (`Dockerfile.service`) runs
`pnpm run --if-present db:migrate` before the long-running process
starts. Schema-owning services are `service-auth`, `service-pets`,
`service-rescue`, `service-applications`, `service-chat`,
`service-notifications`, `service-moderation`, `service-matching`,
`service-cms`, `service-audit`. The gateway owns no tables and
exits the migrate step as a no-op.

The runner is `node-pg-migrate` wrapped by `@adopt-dont-shop/db`
(`packages/db/src/migrate.ts`). Applied migrations are recorded in a
`pgmigrations` table inside each owning schema (not `SequelizeMeta`).
The runner takes a database-wide advisory lock around `pgmigrations`
and retries with linear backoff on contention, so multiple services
booting at once is expected and self-resolving — true failures are
either bad SQL or schema drift.

## Symptoms

- Deploy job's per-service health-check loop in
  `.github/workflows/deploy.yml` times out and exits non-zero.
- `docker compose ps` shows the affected service stuck in
  `restarting` (Docker keeps restarting a container that exits
  non-zero from its CMD).
- Service logs (`docker compose logs --no-color service-<name>`) show
  the node-pg-migrate runner output and an error line, after which
  the container exits.
- The gateway and unaffected services keep serving. The affected
  service's gRPC routes return upstream errors via the gateway —
  expect 5xx on the affected domain, not site-wide.

The good news: only the failing service is down. You have time to
triage without taking the rest of the site with it.

## Triage in 60 seconds

```bash
# 1. Which service is failing, and on which migration?
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --no-color --tail=200 \
  service-<name>   # e.g. service-pets

# 2. What's actually been applied in that service's schema?
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name, run_on FROM <schema>.pgmigrations ORDER BY id DESC LIMIT 10;'
# <schema> matches the owning service: auth, pets, rescue, applications,
# chat, notifications, moderation, matching, cms, audit.
```

The runner logs each migration name as it tries it. Note the filename
of the one that failed — you'll need it to decide recovery path.

## Diagnosis — choose ONE recovery path

### A. Migration code bug → fix forward

The failing migration has a logic error.

- The migration's row will **not** be in `pgmigrations` (the runner
  only writes it after `up()` returns).
- Re-running `db:migrate` on the next deploy will replay the whole
  `up()`.

```bash
# 1. Author the corrective migration on a branch, get it merged.
# 2. Wait for CI to build a new image tag for the affected service.
# 3. Re-deploy. Each service boots and runs its own migrations again.
```

The rest of the site continues to serve. No emergency action needed
beyond a fast PR review.

### B. Migration partially applied (multi-statement, no tx)

Some DDL landed, the rest failed. The migration's row is **not** in
`pgmigrations`, so a re-run will try to land the already-applied DDL
again and fail on "relation already exists" or similar.

```bash
# 1. Identify what landed.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
# ... inspect schema by hand: \d <schema>.<table>

# 2. Hand-revert the partial changes via psql so the migration's
#    up() can run cleanly from scratch.

# 3. Restart the service so its CMD re-runs db:migrate.
docker compose -f docker-compose.prod.yml restart service-<name>
```

This is the most dangerous path — make a backup first and have the
DBA on the line.

### C. Schema/data drift the migration didn't expect

A migration that assumed (for example) a column was nullable but
production has rows that violate the new constraint.

- The runner logs the violating row's constraint name.
- Decide: fix the data in production, or rewrite the migration with
  a backfill step that handles the existing rows.

Same recovery loop as path A — author the corrective migration, ship
a new image, the next boot re-runs the migration set.

### D. Lock contention (advisory or table-level)

If several services boot at the same time they race for the
database-wide advisory lock around `pgmigrations`. The runner retries
12× with linear backoff (250ms × attempt — see
`packages/db/src/migrate.ts`). True contention is rare in prod; if
you see the contention message, it usually means a stuck migration
elsewhere is holding the lock.

```bash
# Find sessions holding migration-related locks.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT pid, state, now()-query_start AS age, left(query, 100) AS q
   FROM pg_stat_activity
   WHERE datname=current_database() AND state <> 'idle'
   ORDER BY age DESC LIMIT 10;"

# Terminate the blocker if it's stuck.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT pg_terminate_backend(<pid>);"

# Restart the failing service so it retries.
docker compose -f docker-compose.prod.yml restart service-<name>
```

### E. Schema is ahead of binary

The migration applied successfully (it's in `pgmigrations`) but the
new binary won't start for an unrelated reason. The schema is now
ahead of the old binary that's still serving traffic via the gateway.

- The deploy contract is **forward-only** — you can't roll the
  migration back without a corrective migration.
- If `down()` is implemented and the change is recoverable, write a
  corrective migration; ship a new image; let `up()` apply it on the
  next boot.
- If `down()` would be destructive (drops columns / tables), **stop
  and call the DBA**. Restore from the pre-migration backup is
  sometimes the only safe option.

There is no `pnpm db:migrate:undo` script — the runner only runs
`up`. Rolling back a forward-only migration means writing a new
migration that performs the reverse change.

## Mitigation

The rest of the site is still serving. Don't break that:

- **Do not** force-restart the affected service in a loop expecting
  the migration to "just work" — each restart re-runs the failing
  migration and re-logs the error. Fix the cause first.
- **Do not** wipe the `pgmigrations` row for a partially-applied
  migration unless you've reverted the DDL it landed first —
  otherwise the next `up()` will trip over the existing schema.

If the affected service is in a hot user path (e.g. `service-auth`)
and the cause will take >15 min to fix, enable maintenance mode
per [`maintenance-mode.md`](./maintenance-mode.md).

## Verify

```bash
# 1. Migration applied cleanly.
docker compose -f docker-compose.prod.yml logs service-<name> \
  | tail -50

# 2. pgmigrations now contains the migration row.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name FROM <schema>.pgmigrations ORDER BY id DESC LIMIT 5;'

# 3. Service is healthy.
docker compose -f docker-compose.prod.yml ps service-<name>
curl -sf https://${PROD_HOSTNAME}/health/simple
# Spot-check a route the affected domain owns to confirm gRPC fan-out works.
```

## Capture

```bash
# The failing service's logs are your post-mortem.
docker compose -f docker-compose.prod.yml logs --no-color \
  service-<name> > /tmp/migration-incident-$(date +%s).log

# Note the backup filename you took before the deploy.
ls -lh /var/backups/adopt-dont-shop/ | tail
```

File a Linear follow-up linking the PR that introduced the bad
migration. If recovery used path B or E, schedule a restore drill
sooner than the next quarterly cycle.
