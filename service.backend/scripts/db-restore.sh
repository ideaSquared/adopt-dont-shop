#!/usr/bin/env bash
#
# db-restore.sh — Restore a pg_dump into a target database.
#
# DESTRUCTIVE. This script will overwrite existing schema and data in the
# target database. Always restore into a scratch DB first, verify, then
# repoint the application — see docs/db-backup-runbook.md.
#
# Usage:
#   ./db-restore.sh path/to/backup.dump.gz
#   DATABASE_URL=postgresql://... ./db-restore.sh path/to/backup.dump.gz
#
# Required env (any one of these patterns):
#   - DATABASE_URL=postgresql://user:pass@host:5432/dbname
#   - or PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
#
# Optional env:
#   - CONFIRM_RESTORE=I_UNDERSTAND   Skips the interactive prompt for
#                                    automated drills.
#   - RESTORE_JOBS=N                 Parallel pg_restore workers (default 2).

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <backup-file.dump.gz>" >&2
  exit 64
fi

BACKUP_FILE="$1"
JOBS="${RESTORE_JOBS:-2}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[db-restore] backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "[db-restore] pg_restore not found in PATH" >&2
  exit 1
fi

TARGET_DESC="${DATABASE_URL:-${PGDATABASE:-<env>}}"
echo "[db-restore] WARNING: this will overwrite schema + data in: $TARGET_DESC"
echo "[db-restore] backup: $BACKUP_FILE"

if [ "${CONFIRM_RESTORE:-}" != "I_UNDERSTAND" ]; then
  read -r -p "[db-restore] type 'restore' to proceed: " REPLY
  if [ "$REPLY" != "restore" ]; then
    echo "[db-restore] aborted by user"
    exit 1
  fi
fi

echo "[db-restore] starting restore (jobs=$JOBS)"

# --clean drops objects before recreating; --if-exists silences harmless
# "object does not exist" errors for fresh targets. Use --no-owner /
# --no-acl so the dump can land in an environment with different roles.
if [ -n "${DATABASE_URL:-}" ]; then
  gunzip -c "$BACKUP_FILE" \
    | pg_restore --clean --if-exists --no-owner --no-acl \
        --jobs="$JOBS" --dbname="$DATABASE_URL"
else
  gunzip -c "$BACKUP_FILE" \
    | pg_restore --clean --if-exists --no-owner --no-acl \
        --jobs="$JOBS"
fi

echo "[db-restore] done"
