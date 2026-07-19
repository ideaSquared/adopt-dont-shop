# Restore Procedure [ADS-500]

Companion to [Volume Backup & Snapshot Policy](./snapshot-policy.md) — that
document says what gets backed up and when; this one is the actual restore
runbook an operator follows when a store needs to come back from a snapshot.

Scope: restoring `postgres_data` from a `pg_dump` produced by
`scripts/snapshot-postgres.sh`, and restoring the `uploads` volume from its
daily S3 sync. `letsencrypt` is intentionally excluded — see "letsencrypt"
in the snapshot policy doc, it regenerates on its own.

## Before you start

- Confirm you have the right dump. Snapshots are keyed by UTC date under
  `s3://${BACKUP_BUCKET}/postgres/YYYY/MM/DD/dump.sql.gz` (Postgres) and
  `s3://${BACKUP_BUCKET}/uploads/YYYY/MM/DD/` (uploads).
- Restoring Postgres from a full dump requires the target database to be
  empty (or you accept `pg_restore`/`psql` erroring on already-existing
  objects). For a same-environment disaster recovery this usually means
  restoring into a **fresh** database, not the live one.
- Have `$POSTGRES_USER` / `$POSTGRES_DB` / `$BACKUP_BUCKET` / `$AWS_REGION`
  available in your shell (the same names `snapshot-postgres.sh` and
  `snapshot-uploads.sh` use).

## Postgres restore

1. Download the target dump from S3:

   ```bash
   aws s3 cp "s3://${BACKUP_BUCKET}/postgres/2026/07/18/dump.sql.gz" ./dump.sql.gz
   ```

2. **Fresh environment / disaster recovery** — bring up an empty database
   container first (e.g. `docker compose up -d database` against a
   clean volume), then load the dump:

   ```bash
   gunzip -c dump.sql.gz | docker compose exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB"
   ```

3. **Point-in-time comparison / staging restore** (target already has data
   you don't want to keep) — drop and recreate the database first so the
   dump's `CREATE TABLE` statements don't collide with existing objects:

   ```bash
   docker compose exec -T database psql -U "$POSTGRES_USER" -d postgres \
     -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" \
     -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"
   gunzip -c dump.sql.gz | docker compose exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB"
   ```

4. Verify: each schema-owning service migrates on container start, but a
   restored dump already has its migration history — do **not** re-run
   `db:migrate` blindly. Instead sanity-check row counts and the most
   recent `updated_at` per service schema:

   ```bash
   docker compose exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB" \
     -c "select schemaname, count(*) from pg_tables group by 1 order by 1;"
   ```

5. Restart the services so connection pools pick up the restored data
   cleanly:

   ```bash
   docker compose restart service-auth service-pets service-rescue service-applications \
     service-notifications service-moderation service-matching service-cms service-audit service-chat
   ```

## Uploads restore

Sync the day's snapshot back onto the volume (adjust the date):

```bash
aws s3 sync "s3://${BACKUP_BUCKET}/uploads/2026/07/18/" /var/lib/docker/volumes/uploads/_data/
```

Once file uploads move to S3-native storage (see "Uploads — S3-native" in
the snapshot policy doc), this step becomes unnecessary — the bucket itself
is the system of record and there is nothing to sync back onto a volume.

## Rollback if the restore goes wrong

Both operations above only add/overwrite data — they don't delete the
pre-restore volume. If a restore attempt fails partway through Postgres,
recreate the container against the volume as it was (do **not** run
`docker compose down -v`, which destroys the volume you'd be rolling back
to) and re-attempt from step 2 with a fresh empty target instead.

## Verification

The snapshot policy doc's [Verification](./snapshot-policy.md#verification)
section requires a monthly restore drill against staging — run the steps
above there and record the outcome (date, duration, any deviations) so this
runbook stays honest.

## Related

- [Volume Backup & Snapshot Policy](./snapshot-policy.md) — what gets
  backed up, retention, and the snapshot scripts
- ADS-443 — streaming replication / PITR (not implemented; this runbook
  covers logical `pg_dump` restore only)
- ADS-500 — volume backup automation
