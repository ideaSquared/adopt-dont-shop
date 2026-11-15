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

# One prefix per run (not per day): a bucket lock refuses to overwrite a locked object, so a
# second run on the same day must not write to the same keys.
RUN="$(date -u +%Y/%m/%d/%H%M%S)"
DEST="s3://${BACKUP_BUCKET}/nats/${RUN}/"

# SSE-S3 (--sse AES256) is AWS-only; S3-compatible stores such as Cloudflare R2 reject the header
# and encrypt at rest themselves. backup.yml sets AWS_ENDPOINT_URL only for those.
SSE_ARGS=(--sse AES256)
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then SSE_ARGS=(); fi

echo "[snapshot-nats] syncing ${NATS_DATA_PATH}/ -> ${DEST}"
aws s3 sync "$NATS_DATA_PATH/" "$DEST" \
  --region "$AWS_REGION" \
  ${SSE_ARGS[@]+"${SSE_ARGS[@]}"} \
  --metadata "Class=tier2,Retention=14d"

echo "[snapshot-nats] done"
