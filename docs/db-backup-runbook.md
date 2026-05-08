# Database Backup & Restore Runbook (ADS-443)

This runbook covers how the Adopt Don't Shop production PostgreSQL database is
backed up, how to restore it, and the drill cadence required to keep that
restore path trustworthy.

The two scripts that implement this runbook live alongside the backend:

- `service.backend/scripts/db-backup.sh` — date-stamped, gzipped `pg_dump`.
- `service.backend/scripts/db-restore.sh` — interactive `pg_restore` with a
  destructive-action confirmation gate.

## Why this exists

Migration `05` notes that its rollback path is "not recoverable" — and several
later migrations are similarly forward-only. Without a known-good backup +
rehearsed restore, every prod schema change is a one-way door. This runbook
closes that gap.

## What gets backed up

- **In scope**: the application database (schema + data) referenced by
  `DATABASE_URL` / `PROD_DB_NAME`.
- **Out of scope (handled separately)**: object storage (uploads), Redis
  (transient queues + caches), application secrets (managed in the secrets
  store, not the DB).

## Schedule

| Job                      | Cadence       | Retention         |
| ------------------------ | ------------- | ----------------- |
| Nightly automated dump   | Daily 02:00 UTC | 14 days local + 30 days off-site |
| Pre-migration manual dump | Before every prod migration | 30 days off-site |
| Restore drill            | Quarterly     | Drill log retained 1 year |

Nightly dumps are produced by running `db-backup.sh` from a scheduled job
(cron / Kubernetes CronJob). The default local retention is 14 days; the
off-site copy in object storage uses a longer lifecycle policy.

## Required environment variables

Both scripts authenticate using either:

- `DATABASE_URL=postgresql://user:pass@host:5432/dbname`, **or**
- The standard libpq vars: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
  `PGDATABASE`.

Backup-only:

- `BACKUP_DIR` — output directory (default `./backups`).
- `BACKUP_RETENTION_DAYS` — local prune horizon (default `14`).

Restore-only:

- `CONFIRM_RESTORE=I_UNDERSTAND` — skips the interactive prompt for drills.
- `RESTORE_JOBS` — parallel `pg_restore` workers (default `2`).

## Running a backup

```bash
# Local
DATABASE_URL=postgresql://app:pw@db.internal:5432/adopt_prod \
BACKUP_DIR=/var/backups/adopt-dont-shop \
./service.backend/scripts/db-backup.sh
```

Successful output looks like:

```
[db-backup] starting dump -> /var/backups/adopt-dont-shop/adopt-dont-shop-20260508T020000Z.dump.gz
[db-backup] wrote /var/backups/adopt-dont-shop/adopt-dont-shop-20260508T020000Z.dump.gz (84231244 bytes)
[db-backup] done
```

After every successful local dump, copy the file to the off-site bucket
(e.g. `aws s3 cp ... s3://adopt-dont-shop-backups/`). Object storage retention
is set by the bucket's lifecycle rule, **not** by this script.

## Pre-migration backup checklist

Before running any production migration:

1. Verify last nightly backup completed (check job logs / monitoring).
2. Run an ad-hoc backup with the migration tag in the filename:
   ```bash
   BACKUP_DIR=/var/backups/adopt-dont-shop ./db-backup.sh
   ```
3. Confirm the new file exists and is non-zero in size.
4. Copy the file off-site.
5. Note the backup filename in the migration change ticket.
6. Only then run `npm run db:migrate`.

If the migration fails or produces unexpected results, restore from the
ad-hoc backup using the procedure below before any further writes occur.

## Restoring

`db-restore.sh` is **destructive**: it drops and recreates objects in the
target database. Restore into a scratch DB first, verify, then repoint the
application.

```bash
# 1. Provision a scratch DB
createdb adopt_restore_check

# 2. Restore into it
DATABASE_URL=postgresql://app:pw@db.internal:5432/adopt_restore_check \
./service.backend/scripts/db-restore.sh /var/backups/adopt-dont-shop/adopt-dont-shop-20260508T020000Z.dump.gz

# Type 'restore' at the prompt, or set CONFIRM_RESTORE=I_UNDERSTAND for
# unattended drills.

# 3. Verify row counts on critical tables
psql "$DATABASE_URL" -c 'select count(*) from users; select count(*) from rescues;'

# 4. Repoint the application by updating its DATABASE_URL secret and
#    restarting, only after verification passes.
```

For an in-place restore (after a migration disaster), make sure the app is
stopped first; otherwise concurrent writes will collide with the restore.

## Quarterly restore drill

Pick a date each quarter to exercise the full path end-to-end:

1. Pick a backup at random from the last 30 days.
2. Provision a scratch DB.
3. Run `db-restore.sh` with `CONFIRM_RESTORE=I_UNDERSTAND`.
4. Run a smoke-test query set (row counts on `users`, `rescues`, `pets`,
   `applications`, `audit_logs`).
5. Record:
   - Backup file used.
   - Restore wall-clock time.
   - Any errors encountered + remediation.
6. File the drill log in the ops channel; archive it for at least one year.

A drill that fails to complete cleanly is itself the highest-priority finding
— fix the failure before the next scheduled migration.

## Troubleshooting

- **`pg_dump: error: connection to server`** — check `DATABASE_URL` /
  `PGHOST` etc. The script does not retry; cron should.
- **`pg_restore: error: could not execute query`** — almost always a role /
  extension mismatch. The scripts pass `--no-owner --no-acl` to minimise
  this; if it still fires, ensure the target DB has the same extensions
  (`pg_trgm`, `citext`, `postgis`) installed.
- **Backup file is suspiciously small** — verify the source DSN points at
  the right database. The script reports the byte count on stdout; alert
  if it drops below the expected floor for two consecutive nights.
