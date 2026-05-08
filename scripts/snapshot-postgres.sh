#!/usr/bin/env bash
# Daily Postgres snapshot — see docs/operations/snapshot-policy.md [ADS-500].
# Runs `pg_dump` against the production database container and uploads the
# compressed dump to S3. Designed to be invoked from cron on the prod host.
#
# Required env:
#   BACKUP_BUCKET   S3 bucket for snapshots (no s3:// prefix)
#   AWS_REGION      AWS region of the bucket
#   POSTGRES_USER   superuser for pg_dump (read from .env or systemd unit)
#   POSTGRES_DB     database name
# Optional:
#   COMPOSE_FILE    defaults to /opt/adopt-dont-shop/docker-compose.prod.yml

set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET required}"
: "${AWS_REGION:?AWS_REGION required}"
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"

COMPOSE_FILE="${COMPOSE_FILE:-/opt/adopt-dont-shop/docker-compose.prod.yml}"
TIMESTAMP="$(date -u +%Y/%m/%d/%H%M%S)"
S3_KEY="postgres/${TIMESTAMP}/dump.sql.gz"
TMPFILE="$(mktemp -t pg-dump-XXXXXX.sql.gz)"

cleanup() {
  rm -f "$TMPFILE"
}
trap cleanup EXIT

echo "[snapshot-postgres] dumping ${POSTGRES_DB} -> ${TMPFILE}"
docker compose -f "$COMPOSE_FILE" exec -T database \
  pg_dump --serializable-deferrable -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$TMPFILE"

DUMP_BYTES="$(stat -c%s "$TMPFILE")"
if [[ "$DUMP_BYTES" -lt 1024 ]]; then
  echo "[snapshot-postgres] ERROR: dump is suspiciously small (${DUMP_BYTES} bytes)" >&2
  exit 1
fi

echo "[snapshot-postgres] uploading ${DUMP_BYTES} bytes -> s3://${BACKUP_BUCKET}/${S3_KEY}"
aws s3 cp "$TMPFILE" "s3://${BACKUP_BUCKET}/${S3_KEY}" \
  --region "$AWS_REGION" \
  --metadata "Class=tier1,Retention=30d"

echo "[snapshot-postgres] done"
