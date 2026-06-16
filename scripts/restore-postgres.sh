#!/usr/bin/env bash
# Restore a Postgres snapshot produced by scripts/snapshot-postgres.sh [ADS-811].
# Pulls a gzipped plain-SQL dump from S3 (or reads a local file) and replays it
# into the target database via `psql`. The snapshot is a plain `pg_dump | gzip`
# dump (dump.sql.gz), so the restore is `gunzip | psql` — NOT pg_restore.
#
# DESTRUCTIVE: replaying a dump into a database that already has objects will
# error or duplicate. Restore into a SCRATCH database first, verify, then
# repoint the app (see docs/db-backup-runbook.md). The script refuses to run
# against the live POSTGRES_DB unless CONFIRM_RESTORE=I_UNDERSTAND is set.
#
# Required env:
#   POSTGRES_USER   superuser for psql
#   TARGET_DB       database to restore INTO (must already exist; create it first)
# Source — exactly one of:
#   S3_KEY          object key under the bucket, e.g. postgres/2026/06/16/120000/dump.sql.gz
#                   (requires BACKUP_BUCKET + AWS_REGION)
#   DUMP_FILE       path to a local *.sql.gz dump
# Required with S3_KEY:
#   BACKUP_BUCKET   S3 bucket holding snapshots (no s3:// prefix)
#   AWS_REGION      AWS region of the bucket
# Optional:
#   COMPOSE_FILE    defaults to /opt/adopt-dont-shop/docker-compose.prod.yml
#   POSTGRES_DB     the LIVE database; restoring into it requires CONFIRM_RESTORE
#   CONFIRM_RESTORE set to I_UNDERSTAND to allow restoring into POSTGRES_DB

set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${TARGET_DB:?TARGET_DB required (restore into a scratch DB, not the live one)}"

COMPOSE_FILE="${COMPOSE_FILE:-/opt/adopt-dont-shop/docker-compose.prod.yml}"

# Guard: refuse to overwrite the live DB without explicit confirmation.
if [[ -n "${POSTGRES_DB:-}" && "$TARGET_DB" == "$POSTGRES_DB" ]]; then
  if [[ "${CONFIRM_RESTORE:-}" != "I_UNDERSTAND" ]]; then
    echo "[restore-postgres] REFUSING: TARGET_DB equals the live POSTGRES_DB ($POSTGRES_DB)." >&2
    echo "[restore-postgres] Restore into a scratch DB, or set CONFIRM_RESTORE=I_UNDERSTAND." >&2
    exit 1
  fi
  echo "[restore-postgres] WARNING: restoring into the LIVE database $POSTGRES_DB (confirmed)."
fi

# Resolve the dump to a local temp file.
TMPFILE=""
cleanup() {
  [[ -n "$TMPFILE" ]] && rm -f "$TMPFILE"
}
trap cleanup EXIT

if [[ -n "${DUMP_FILE:-}" ]]; then
  [[ -f "$DUMP_FILE" ]] || { echo "[restore-postgres] ERROR: $DUMP_FILE not found" >&2; exit 1; }
  SRC="$DUMP_FILE"
  echo "[restore-postgres] using local dump $SRC"
elif [[ -n "${S3_KEY:-}" ]]; then
  : "${BACKUP_BUCKET:?BACKUP_BUCKET required when using S3_KEY}"
  : "${AWS_REGION:?AWS_REGION required when using S3_KEY}"
  TMPFILE="$(mktemp -t pg-restore-XXXXXX.sql.gz)"
  SRC="$TMPFILE"
  echo "[restore-postgres] downloading s3://${BACKUP_BUCKET}/${S3_KEY} -> ${SRC}"
  aws s3 cp "s3://${BACKUP_BUCKET}/${S3_KEY}" "$SRC" --region "$AWS_REGION"
else
  echo "[restore-postgres] ERROR: set DUMP_FILE or S3_KEY" >&2
  exit 1
fi

DUMP_BYTES="$(stat -c%s "$SRC")"
if [[ "$DUMP_BYTES" -lt 1024 ]]; then
  echo "[restore-postgres] ERROR: dump is suspiciously small (${DUMP_BYTES} bytes)" >&2
  exit 1
fi

echo "[restore-postgres] restoring ${DUMP_BYTES} bytes into ${TARGET_DB}"
# ON_ERROR_STOP makes psql exit non-zero on the first failed statement so a
# partial/corrupt restore is caught instead of silently continuing.
gunzip -c "$SRC" \
  | docker compose -f "$COMPOSE_FILE" exec -T database \
      psql --set ON_ERROR_STOP=on -U "$POSTGRES_USER" -d "$TARGET_DB"

echo "[restore-postgres] done — verify row counts before repointing the app"
