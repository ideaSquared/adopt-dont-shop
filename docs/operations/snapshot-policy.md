# Volume Backup & Snapshot Policy [ADS-500, ADS-1239]

This document captures the snapshot policy for the production stack. The
production `docker-compose.prod.yml` declares three persistent stores; each
has its own RPO / RTO and backup mechanism.

## What gets backed up

| Volume / Store     | Source                                                                        | Recovery class          | Retention            |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------- | -------------------- |
| `postgres_data`    | `database` service (Postgres 16+PostGIS)                                      | Tier-1 (full)           | 30 days              |
| `uploads`          | Shared user-uploads volume (gateway writes, per-stack nginx serves read-only) | Tier-1 (full)           | 90 days              |
| `letsencrypt`      | nginx TLS state                                                               | Regenerable — no backup | N/A                  |
| Application images | GitHub Container Registry (GHCR)                                              | Immutable tags          | indefinite (per-tag) |

## Postgres — `pg_dump` to S3

Run `scripts/snapshot-postgres.sh` from a host that has docker access to the
production stack. The script:

1. Acquires a logical dump via `docker compose exec database pg_dump`
   (no downtime; consistent snapshot using `--serializable-deferrable`).
2. Compresses with `gzip -9`.
3. Uploads to `s3://${BACKUP_BUCKET}/postgres/$(date -u +%Y/%m/%d/%H%M%S)/dump.sql.gz`
   (one directory per snapshot — the HHMMSS suffix lets multiple daily runs
   coexist).
4. Sets S3 user-metadata `Class=tier1, Retention=30d` on the object. Lifecycle
   pruning must be configured on the `postgres/` prefix — S3 lifecycle rules
   cannot filter by user-metadata, so the metadata is descriptive only.

Runs automatically every night via the
[`backup.yml`](../../.github/workflows/backup.yml) scheduled workflow (cron
`0 2 * * *`), which SSHes to the prod host and runs the script — see
[db-backup-runbook.md](../db-backup-runbook.md) for the operational detail.
The host-cron snippet below is a documented alternative, not the live path.

### Cron snippet (alternative to the `backup.yml` automation above)

Daily at 02:00 UTC, hourly WAL is out of scope (see ADS-443 for streaming
replication / PITR design).

```cron
# /etc/cron.d/adopt-dont-shop-backup
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
BACKUP_BUCKET=adopt-dont-shop-prod-backups
AWS_REGION=eu-west-2

0 2 * * * deploy /opt/adopt-dont-shop/scripts/snapshot-postgres.sh >> /var/log/snapshot.log 2>&1
```

## Uploads — S3-native

Move the `uploads` volume to S3 with versioning enabled. While the volume
remains local-disk, the snapshot script `snapshot-uploads.sh` rsyncs to
`s3://${BACKUP_BUCKET}/uploads/$(date -u +%Y/%m/%d)/` daily.

Once the file-upload service is migrated to S3 directly (tracked separately),
this script becomes obsolete and the bucket itself is the system of record;
versioning + lifecycle policies replace daily snapshots.

Like the Postgres snapshot, this now runs automatically every night via the
`snapshot-uploads` job in [`backup.yml`](../../.github/workflows/backup.yml)
(ADS-1239, cron `0 2 * * *`) — previously this script was not wired into any
workflow. The host-cron snippet below remains a documented alternative.

### Cron snippet (alternative to the `backup.yml` automation above)

```cron
30 2 * * * deploy /opt/adopt-dont-shop/scripts/snapshot-uploads.sh >> /var/log/snapshot.log 2>&1
```

## letsencrypt — regenerable, no backup

certbot renews on demand; backing up the state directory adds no resilience
(rate-limit risk is low at our scale). If the volume is lost, the renewal
hook re-issues certs at next nginx restart.

## Restore procedure

See [docs/operations/restore.md](./restore.md) for the full runbook. The
short version:

```bash
# Postgres
gunzip -c dump.sql.gz | docker compose exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB"

# Uploads — the real host path is <project>_uploads (Compose prefixes the
# volume name with the project name, "production" for /opt/ads/production —
# see the snapshot-uploads job in backup.yml), not the bare "uploads" shown
# here for brevity.
aws s3 sync "s3://${BACKUP_BUCKET}/uploads/$(date -u +%Y/%m/%d)/" /var/lib/docker/volumes/production_uploads/_data/
```

## Verification

The mechanical "does the latest Postgres dump actually restore?" question is
now answered automatically, every night, by
[`backup-restore-drill.yml`](../../.github/workflows/backup-restore-drill.yml)
(ADS-1240) — it restores the newest snapshot into a scratch DB via
`scripts/restore-postgres.sh` and asserts it loaded data. See "Automated
nightly restore verification" in [db-backup-runbook.md](../db-backup-runbook.md)
for detail.

That automated job does not replace the fuller, human-run drill: a
**quarterly** restore drill against a **staging** environment — restoring,
repointing a real app, and measuring RTO — is still required to keep this
policy honest. Track outcomes in `docs/operations/restore-drills.md`. (This
cadence previously read "monthly" here, disagreeing with
[db-backup-runbook.md](../db-backup-runbook.md#quarterly-restore-drill-staging);
quarterly is now the single source of truth for the staging drill's cadence.)

## Related

- ADS-1239 — automate the uploads snapshot (this document's `backup.yml` job)
- ADS-1240 — automated nightly restore verification (this document's
  "Verification" section; detail in db-backup-runbook.md)
- ADS-443 — streaming replication / PITR (out of scope here)
- ADS-500 — volume backup automation (this document)
