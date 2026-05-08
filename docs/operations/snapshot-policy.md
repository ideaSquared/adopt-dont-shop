# Volume Backup & Snapshot Policy [ADS-500]

This document captures the snapshot policy for the production stack. The
production `docker-compose.prod.yml` declares three persistent stores; each
has its own RPO / RTO and backup mechanism.

## What gets backed up

| Volume / Store        | Source                                 | Recovery class | Retention |
|-----------------------|----------------------------------------|----------------|-----------|
| `postgres_data`       | `database` service (Postgres 16+PostGIS) | Tier-1 (full)  | 30 days   |
| `uploads`             | `service-backend` user uploads         | Tier-1 (full)  | 90 days   |
| `letsencrypt`         | nginx TLS state                        | Regenerable — no backup |  N/A     |
| Application images    | Docker registry (Docker Hub)           | Immutable tags | indefinite (per-tag) |

## Postgres — `pg_dump` to S3

Run `scripts/snapshot-postgres.sh` from a host that has docker access to the
production stack. The script:

1. Acquires a logical dump via `docker compose exec database pg_dump`
   (no downtime; consistent snapshot using `--serializable-deferrable`).
2. Compresses with `gzip -9`.
3. Uploads to `s3://${BACKUP_BUCKET}/postgres/$(date -u +%Y/%m/%d)/dump.sql.gz`.
4. Tags the object with `Class=tier1, Retention=30d` so the bucket lifecycle
   policy auto-prunes after 30 days.

### Cron snippet

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

### Cron snippet

```cron
30 2 * * * deploy /opt/adopt-dont-shop/scripts/snapshot-uploads.sh >> /var/log/snapshot.log 2>&1
```

## letsencrypt — regenerable, no backup

certbot renews on demand; backing up the state directory adds no resilience
(rate-limit risk is low at our scale). If the volume is lost, the renewal
hook re-issues certs at next nginx restart.

## Restore procedure

See `docs/operations/restore.md` (TODO — out of scope for ADS-500). The
short version:

```bash
# Postgres
gunzip -c dump.sql.gz | docker compose exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB"

# Uploads
aws s3 sync "s3://${BACKUP_BUCKET}/uploads/$(date -u +%Y/%m/%d)/" /var/lib/docker/volumes/uploads/_data/
```

## Verification

A monthly restore drill against a staging environment is required to keep
this policy honest. Track outcomes in `docs/operations/restore-drills.md`.

## Related

- ADS-443 — streaming replication / PITR (out of scope here)
- ADS-500 — volume backup automation (this document)
