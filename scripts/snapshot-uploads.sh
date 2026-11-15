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

# One prefix per run (not per day): a bucket lock refuses to overwrite a locked object, so a
# second run on the same day must not write to the same keys.
RUN="$(date -u +%Y/%m/%d/%H%M%S)"
DEST="s3://${BACKUP_BUCKET}/uploads/${RUN}/"

# SSE-S3 (--sse AES256) is AWS-only; S3-compatible stores such as Cloudflare R2 reject the header
# and encrypt at rest themselves. backup.yml sets AWS_ENDPOINT_URL only for those.
SSE_ARGS=(--sse AES256)
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then SSE_ARGS=(); fi

echo "[snapshot-uploads] syncing ${UPLOADS_PATH}/ -> ${DEST}"
aws s3 sync "$UPLOADS_PATH/" "$DEST" \
  --region "$AWS_REGION" \
  ${SSE_ARGS[@]+"${SSE_ARGS[@]}"} \
  --metadata "Class=tier1,Retention=90d"

echo "[snapshot-uploads] done"
