# Volume Backup & Snapshot Policy [ADS-500, ADS-1239]

Policy reference for what the production stack backs up, on what cadence, and with what retention (audience: operators + planners). The **restore and drill procedures** live in the authoritative [db-backup-runbook.md](../db-backup-runbook.md); this document is policy only.

The production `docker-compose.prod.yml` declares three persistent stores; each has its own RPO / RTO and backup mechanism.

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
4. Sets S3 user-metadata `Class=tier1, Retention=30d` on the object — a
   human-readable label only, since S3 lifecycle rules cannot filter by
   user-metadata. The `postgres/` prefix's actual 30-day retention is enforced
   by the bucket lifecycle rule described in
   ["Bucket immutability & lifecycle enforcement"](#bucket-immutability--lifecycle-enforcement)
   below, not by this metadata.

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

0 2 * * * deploy /opt/ads/production/scripts/snapshot-postgres.sh >> /var/log/snapshot.log 2>&1
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
30 2 * * * deploy /opt/ads/production/scripts/snapshot-uploads.sh >> /var/log/snapshot.log 2>&1
```

## Bucket immutability & lifecycle enforcement

Historically the `Retention=30d/90d` object metadata above was **descriptive
only** — there was no lifecycle rule, no versioning, and no Object Lock
anywhere, so the retention numbers in the table above were not actually
enforced, and the backup-writer credentials that live on the production host
could delete or overwrite any existing snapshot (ADS-1306).

`scripts/apply-backup-bucket-policy.sh` (run once by an operator, and again
after any retention change) now:

1. Enables S3 bucket versioning.
2. Applies a lifecycle rule per prefix — transition to `STANDARD_IA` then
   expire (current **and** noncurrent object versions) at the retention in
   the table above: `postgres/` 30d, `uploads/` 90d.
3. Optionally (`--enable-object-lock`) sets a default Object Lock retention,
   so even credentials with delete permission cannot remove a snapshot before
   the lock window expires. Object Lock can only be enabled on a bucket
   **created** with it — see the script's `--help` and
   [ADR 0007](../adr/0007-postgres-backups-pitr-restore.md) for the
   GOVERNANCE-vs-COMPLIANCE tradeoff.

Separately, the host's own AWS credentials (used by `backup.yml` to run the
snapshot scripts) are scoped to
[`backup-writer-iam-policy.json`](./backup-writer-iam-policy.json) —
`s3:PutObject` + `s3:ListBucket` only, no `s3:DeleteObject*` and no
`s3:PutBucketVersioning` / `s3:PutLifecycleConfiguration`. A compromised host
can still write junk snapshots, but cannot delete existing ones or weaken the
bucket protection above.

**What this does not do:** Object Lock is opt-in (`--enable-object-lock`) and
requires bucket recreation if the bucket predates this change — the script
detects and warns rather than silently no-op'ing. Point-in-time recovery
(PITR) is **not** implemented by this or any script in this repo; see
[ADR 0007](../adr/0007-postgres-backups-pitr-restore.md) for that separate,
still-open decision.

## letsencrypt — regenerable, no backup

certbot renews on demand; backing up the state directory adds no resilience
(rate-limit risk is low at our scale). If the volume is lost, the renewal
hook re-issues certs at next nginx restart.

## Restore & verification

The restore procedures (Postgres and uploads), the automated nightly restore
drill, and the quarterly staging drill are documented in the authoritative
[db-backup-runbook.md](../db-backup-runbook.md). This policy only fixes the
**cadence**: a quarterly restore drill against staging (restoring, repointing a
real app, and measuring RTO) is required to keep the policy honest, in addition
to the automated nightly `backup-restore-drill.yml` check. Quarterly is the
single source of truth for the staging drill's cadence; drill outcomes are
tracked in `docs/operations/restore-drills.md`.

## Related

- ADS-1239 — automate the uploads snapshot (this document's `backup.yml` job)
- ADS-1240 — automated nightly restore verification (this document's
  "Verification" section; detail in db-backup-runbook.md)
- ADS-1306 — bucket versioning, lifecycle enforcement, least-privilege IAM
  (this document's "Bucket immutability & lifecycle enforcement" section)
- ADS-443 — streaming replication / PITR (out of scope here)
- ADS-500 — volume backup automation (this document)
