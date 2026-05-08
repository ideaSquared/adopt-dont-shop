#!/usr/bin/env bash
# Daily uploads snapshot — see docs/operations/snapshot-policy.md [ADS-500].
# rsyncs the `uploads` Docker volume to S3 with daily prefixing. Becomes
# obsolete once file-upload.service.ts uses S3 as the system of record.
#
# Required env:
#   BACKUP_BUCKET   S3 bucket for snapshots
#   AWS_REGION      AWS region of the bucket
# Optional:
#   UPLOADS_PATH    defaults to /var/lib/docker/volumes/uploads/_data

set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET required}"
: "${AWS_REGION:?AWS_REGION required}"

UPLOADS_PATH="${UPLOADS_PATH:-/var/lib/docker/volumes/uploads/_data}"

if [[ ! -d "$UPLOADS_PATH" ]]; then
  echo "[snapshot-uploads] ERROR: $UPLOADS_PATH does not exist" >&2
  exit 1
fi

DAY="$(date -u +%Y/%m/%d)"
DEST="s3://${BACKUP_BUCKET}/uploads/${DAY}/"

echo "[snapshot-uploads] syncing ${UPLOADS_PATH}/ -> ${DEST}"
aws s3 sync "$UPLOADS_PATH/" "$DEST" \
  --region "$AWS_REGION" \
  --metadata "Class=tier1,Retention=90d"

echo "[snapshot-uploads] done"
