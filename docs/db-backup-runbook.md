# Database Backup & Restore Runbook (ADS-443, ADS-811)

This runbook covers how the Adopt Don't Shop production PostgreSQL database is
backed up, how to restore it, and the drill cadence required to keep that
restore path trustworthy.

The two scripts that implement this runbook live under `scripts/`:

- [`scripts/snapshot-postgres.sh`](../scripts/snapshot-postgres.sh) —
  date-stamped `pg_dump` piped through `gzip -9`, uploaded to S3.
- [`scripts/restore-postgres.sh`](../scripts/restore-postgres.sh) — pulls a
  snapshot from S3 (or a local file) and replays it with `psql`, gated by a
  destructive-action confirmation.

> The old `service.backend/scripts/db-backup.sh` / `db-restore.sh` referenced
> by earlier revisions of this runbook **no longer exist** — that backend was
> deleted in the microservices migration. The live scripts above replace them.
> Note the format difference: the snapshot is a **plain-SQL** dump
> (`dump.sql.gz`), so restore uses `psql`, **not** `pg_restore`.

## Why this exists

Migration `05` notes that its rollback path is "not recoverable" — and several
later migrations are similarly forward-only. Without a known-good backup +
rehearsed restore, every prod schema change is a one-way door. This runbook
closes that gap.

## Recovery objectives (RTO / RPO)

| Target | Value | Basis |
| --- | --- | --- |
| **RPO** (max data loss) | **24 hours** | Daily 02:00 UTC snapshot; anything written since the last snapshot is lost on a full restore. |
| **RTO** (time to restore) | **≤ 2 hours** | Download dump from S3 + `psql` replay into a scratch DB + verify + repoint. Dominated by `psql` replay time, which scales with DB size. |

These are the targets for a logical-dump strategy. Tighter RPO (minutes) needs
streaming replication / PITR — out of scope here, tracked under ADS-443.

## What gets backed up

- **In scope**: the application database (schema + data) — the `database`
  service in `docker-compose.prod.yml`, named by `POSTGRES_DB`.
- **Out of scope (handled separately)**: object storage / uploads (see
  [`scripts/snapshot-uploads.sh`](../scripts/snapshot-uploads.sh) and the
  [snapshot policy](./operations/snapshot-policy.md)), Redis (transient
  queues + caches), application secrets (file-mounted Docker secrets, not in
  the DB), and `letsencrypt` TLS state (regenerable).

## Schedule

| Job | Cadence | Retention |
| --- | --- | --- |
| Nightly automated dump | Daily 02:00 UTC | 30 days off-site (S3 lifecycle) |
| Pre-migration manual dump | Before every prod migration | 30 days off-site |
| Restore drill | Quarterly (staging) | Drill log retained 1 year |

Nightly dumps run via the [`backup.yml`](../.github/workflows/backup.yml)
scheduled workflow (cron `0 2 * * *`), which SSHes to the prod host and runs
`snapshot-postgres.sh`. The S3 bucket's lifecycle rule sets the 30-day off-site
retention — **not** the script. A host cron entry is documented as an
alternative in the [snapshot policy](./operations/snapshot-policy.md).

## S3 layout

`snapshot-postgres.sh` writes to:

```
s3://${BACKUP_BUCKET}/postgres/$(date -u +%Y/%m/%d/%H%M%S)/dump.sql.gz
```

tagged `Class=tier1,Retention=30d`. To find the latest:

```bash
aws s3 ls "s3://${BACKUP_BUCKET}/postgres/" --recursive --region "$AWS_REGION" \
  | sort | tail -n1
```

## Required environment

Both scripts run `docker compose exec database …` against the prod stack, so
they need docker access to the production host.

Backup (`snapshot-postgres.sh`):

- `BACKUP_BUCKET` — S3 bucket (no `s3://` prefix).
- `AWS_REGION` — bucket region.
- `POSTGRES_USER`, `POSTGRES_DB` — superuser + database name (from `.env`).
- `COMPOSE_FILE` — optional, defaults to
  `/opt/adopt-dont-shop/docker-compose.prod.yml`.

Restore (`restore-postgres.sh`):

- `POSTGRES_USER` — superuser for `psql`.
- `TARGET_DB` — database to restore **into** (must already exist).
- Source — exactly one of `S3_KEY` (with `BACKUP_BUCKET` + `AWS_REGION`) or
  `DUMP_FILE` (a local `*.sql.gz`).
- `CONFIRM_RESTORE=I_UNDERSTAND` — required only if `TARGET_DB` equals the live
  `POSTGRES_DB` (the script refuses otherwise).

## Running a backup

```bash
# On the prod host
BACKUP_BUCKET=adopt-dont-shop-prod-backups \
AWS_REGION=eu-west-2 \
POSTGRES_USER=app POSTGRES_DB=adopt_prod \
./scripts/snapshot-postgres.sh
```

Successful output looks like:

```
[snapshot-postgres] dumping adopt_prod -> /tmp/pg-dump-XXXXXX.sql.gz
[snapshot-postgres] uploading 84231244 bytes -> s3://adopt-dont-shop-prod-backups/postgres/2026/06/16/020000/dump.sql.gz
[snapshot-postgres] done
```

The script aborts if the dump is under 1 KiB (a cheap guard against an empty /
failed dump being uploaded).

## Pre-migration backup checklist

Before running any production migration:

1. Verify the last nightly backup completed (check the `backup.yml` run / S3).
2. Run an ad-hoc backup:
   ```bash
   ./scripts/snapshot-postgres.sh
   ```
3. Confirm the new object exists and is non-trivial in size (`aws s3 ls`).
4. Note the S3 key in the migration change ticket.
5. Only then trigger the migration (each service migrates its own schema on
   container start).

If the migration fails or produces unexpected results, restore from the
ad-hoc backup using the procedure below before any further writes occur.

## Restoring

Restore into a **scratch DB** first, verify, then repoint the application.

```bash
# 1. Provision a scratch DB inside the prod stack's Postgres
docker compose -f /opt/adopt-dont-shop/docker-compose.prod.yml exec -T database \
  createdb -U "$POSTGRES_USER" adopt_restore_check

# 2. Restore the chosen snapshot into it
POSTGRES_USER=app \
TARGET_DB=adopt_restore_check \
BACKUP_BUCKET=adopt-dont-shop-prod-backups \
AWS_REGION=eu-west-2 \
S3_KEY=postgres/2026/06/16/020000/dump.sql.gz \
./scripts/restore-postgres.sh

# 3. Verify row counts on critical tables (schemas are per-service)
docker compose -f /opt/adopt-dont-shop/docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d adopt_restore_check -c \
  'select count(*) from auth.users; select count(*) from rescue.rescues; select count(*) from pets.pets;'

# 4. Repoint the app only after verification passes: update the
#    database_url secret / POSTGRES_DB and restart, or promote the scratch DB.
```

For an in-place restore after a migration disaster, **stop the writing
services first** (otherwise concurrent writes collide with the restore), then
run with `TARGET_DB=$POSTGRES_DB CONFIRM_RESTORE=I_UNDERSTAND`.

## Quarterly restore drill (staging)

A backup you have never restored is a backup you do not have. We **cannot**
prove the path against production live — instead we rehearse it in **staging**
each quarter:

1. Pick a snapshot at random from the last 30 days of production backups.
2. On the **staging** host, provision a scratch DB in the staging Postgres:
   ```bash
   docker compose -f /opt/adopt-dont-shop/docker-compose.staging.yml exec -T database \
     createdb -U "$POSTGRES_USER" adopt_drill_$(date +%Y%m%d)
   ```
3. Restore the production snapshot into it with `restore-postgres.sh`
   (`COMPOSE_FILE=…docker-compose.staging.yml`, `S3_KEY=<the chosen key>`,
   `TARGET_DB=adopt_drill_…`). No `CONFIRM_RESTORE` needed — the target is a
   scratch DB.
4. Run the smoke-test query set (row counts on `auth.users`,
   `rescue.rescues`, `pets.pets`, `applications.applications`,
   `audit.audit_events`).
5. Record:
   - Snapshot S3 key used.
   - Restore wall-clock time (this is your measured RTO — compare to the 2h
     target above).
   - Any errors encountered + remediation.
6. File the drill log in the ops channel; archive it for at least one year
   (e.g. `docs/operations/restore-drills.md`).

A drill that fails to complete cleanly is itself the highest-priority finding
— fix the failure before the next scheduled migration.

> "Restore tested against the live production environment" is intentionally out
> of scope: there is no spare production environment to restore into safely.
> The staging drill above is the substitute and must run quarterly.

## Troubleshooting

- **`pg_dump: error: connection to server`** — the prod stack isn't up, or the
  `database` container name / compose file is wrong. Check
  `docker compose -f $COMPOSE_FILE ps database`.
- **`psql: … ON_ERROR_STOP`** — the restore hit a failing statement and
  stopped (by design). Almost always a role / extension mismatch: ensure the
  target DB has the same extensions (`pg_trgm`, `citext`, `postgis`) and that
  the per-service schemas exist. A scratch DB created fresh in the same
  Postgres instance inherits the cluster's extensions.
- **Dump is suspiciously small** — both scripts abort below 1 KiB. Verify the
  source `POSTGRES_DB` is correct and the dump actually contains data.
