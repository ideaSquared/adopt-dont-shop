#!/usr/bin/env bash
# Daily NATS JetStream snapshot [ADS-1325]. Mirrors snapshot-uploads.sh:
# rsyncs the `nats_data` Docker volume (JetStream's file store — the event
# backbone and idempotency state everything publishes through) to S3 with
# daily prefixing. See docs/operations/snapshot-policy.md.
#
# Required env:
#   BACKUP_BUCKET   S3 bucket for snapshots
#   AWS_REGION      AWS region of the bucket
# Optional:
#   NATS_DATA_PATH  defaults to /var/lib/docker/volumes/nats_data/_data

set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET required}"
: "${AWS_REGION:?AWS_REGION required}"

NATS_DATA_PATH="${NATS_DATA_PATH:-/var/lib/docker/volumes/nats_data/_data}"

if [[ ! -d "$NATS_DATA_PATH" ]]; then
  echo "[snapshot-nats] ERROR: $NATS_DATA_PATH does not exist" >&2
  exit 1
fi

DAY="$(date -u +%Y/%m/%d)"
DEST="s3://${BACKUP_BUCKET}/nats/${DAY}/"

echo "[snapshot-nats] syncing ${NATS_DATA_PATH}/ -> ${DEST}"
aws s3 sync "$NATS_DATA_PATH/" "$DEST" \
  --region "$AWS_REGION" \
  --sse AES256 \
  --metadata "Class=tier2,Retention=14d"

echo "[snapshot-nats] done"
