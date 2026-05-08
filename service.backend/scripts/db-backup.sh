#!/usr/bin/env bash
#
# db-backup.sh — Date-stamped pg_dump for the AdoptDontShop database.
#
# Produces a gzipped custom-format dump that pg_restore can parallelise,
# named after the timestamp so successive backups don't overwrite each
# other. Designed to run from cron; emits a single line per run on stdout
# for log scraping.
#
# Required env (any one of these patterns):
#   - DATABASE_URL=postgresql://user:pass@host:5432/dbname
#   - or PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
#
# Optional env:
#   - BACKUP_DIR        Output directory (default: ./backups)
#   - BACKUP_RETENTION_DAYS  Files older than this are pruned (default: 14)
#
# Exits non-zero on any failure so a cron wrapper / monitor can alert.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[db-backup] pg_dump not found in PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/adopt-dont-shop-$TIMESTAMP.dump.gz"

echo "[db-backup] starting dump -> $DUMP_FILE"

# Custom format (-Fc) keeps schema + data together and is faster to restore
# than plain SQL. Pipe to gzip so we don't pay the disk cost twice.
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump --no-owner --no-acl -Fc "$DATABASE_URL" | gzip -9 > "$DUMP_FILE"
else
  pg_dump --no-owner --no-acl -Fc | gzip -9 > "$DUMP_FILE"
fi

SIZE_BYTES="$(stat -c '%s' "$DUMP_FILE" 2>/dev/null || stat -f '%z' "$DUMP_FILE")"
echo "[db-backup] wrote $DUMP_FILE ($SIZE_BYTES bytes)"

# Retention: prune anything older than RETENTION_DAYS. -mtime is a no-op for
# new files so this is safe to run on every backup. Off-site copies (S3 etc.)
# are managed separately — see docs/db-backup-runbook.md.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'adopt-dont-shop-*.dump.gz' \
  -mtime +"$RETENTION_DAYS" -print -delete \
  | sed 's/^/[db-backup] pruned /' || true

echo "[db-backup] done"
