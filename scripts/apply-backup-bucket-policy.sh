#!/usr/bin/env bash
# S3 backup bucket hardening (ADS-1306 / ADR 0007 Phase 1).
#
# The backup writer credentials live on the single production host
# (scripts/snapshot-postgres.sh, snapshot-uploads.sh, snapshot-nats.sh run
# there), so a host compromise or one wrong `aws s3 rm` can delete every
# restore point today: `Retention=30d/90d` is S3 *user-metadata* only
# (docs/operations/snapshot-policy.md), not an enforced lifecycle rule, and
# nothing prevents deletion or overwrite of an existing snapshot.
#
# This script enables bucket versioning, applies a lifecycle rule per prefix
# (transition to cheaper storage, then expire — current AND noncurrent
# versions — at the retention documented in snapshot-policy.md), and
# optionally sets a default Object Lock retention so the host's writer
# credentials (PutObject/ListBucket only — see
# docs/operations/backup-writer-iam-policy.json) cannot delete or overwrite a
# snapshot for the lock window even with `s3:DeleteObject*` permission.
#
# Idempotent: every AWS call here (`put-bucket-versioning`,
# `put-bucket-lifecycle-configuration`, `put-object-lock-configuration`)
# REPLACES the bucket's full configuration rather than diffing it, so running
# this script twice in a row leaves the bucket in the same state as running
# it once.
#
# Usage:
#   scripts/apply-backup-bucket-policy.sh --bucket NAME --region REGION [options]
#
# Required (flag, or the matching env var):
#   --bucket NAME              (or BACKUP_BUCKET)
#   --region REGION            (or AWS_REGION)
#
# Optional:
#   --dry-run                  Print the lifecycle JSON and the AWS CLI calls
#                               that would run; makes no AWS API calls.
#   --enable-object-lock       Also set a default Object Lock retention.
#                               NOTE: Object Lock can only be enabled on a
#                               bucket that was CREATED with Object Lock
#                               support (`--object-lock-enabled-for-bucket`)
#                               — it cannot be retrofitted onto an existing
#                               bucket. This script detects that case and
#                               warns instead of failing silently.
#   --object-lock-mode MODE    GOVERNANCE (default, overridable by privileged
#                               roles) or COMPLIANCE (truly immutable — cannot
#                               be shortened or removed by anyone, including
#                               root, for the retention window; see ADR 0007
#                               "Object Lock is hard to undo").
#   --object-lock-days N       Default retention in days (default: 30).
#   -h, --help                 Print this usage and exit 0.
#
# Retention mirrors docs/operations/snapshot-policy.md:
#   postgres/  Tier-1 full,  30 days — Standard-IA at 7d,  expire at 30d
#   uploads/   Tier-1 full,  90 days — Standard-IA at 30d, expire at 90d
#   nats/      Tier-2 (event backbone/idempotency state), 14 days —
#              Standard-IA at 7d, expire at 14d
# redis_data is intentionally NOT covered — see snapshot-policy.md.

set -euo pipefail

DRY_RUN=false
ENABLE_OBJECT_LOCK=false
OBJECT_LOCK_MODE="GOVERNANCE"
OBJECT_LOCK_DAYS=30
BUCKET="${BACKUP_BUCKET:-}"
REGION="${AWS_REGION:-}"

usage() {
  sed -n '2,49p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      BUCKET="$2"; shift 2 ;;
    --region)
      REGION="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --enable-object-lock)
      ENABLE_OBJECT_LOCK=true; shift ;;
    --object-lock-mode)
      OBJECT_LOCK_MODE="$2"; shift 2 ;;
    --object-lock-days)
      OBJECT_LOCK_DAYS="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "[apply-backup-bucket-policy] ERROR: unknown argument: $1" >&2
      usage >&2
      exit 1 ;;
  esac
done

: "${BUCKET:?--bucket (or BACKUP_BUCKET) required}"
: "${REGION:?--region (or AWS_REGION) required}"

if [[ "$OBJECT_LOCK_MODE" != "GOVERNANCE" && "$OBJECT_LOCK_MODE" != "COMPLIANCE" ]]; then
  echo "[apply-backup-bucket-policy] ERROR: --object-lock-mode must be GOVERNANCE or COMPLIANCE (got: $OBJECT_LOCK_MODE)" >&2
  exit 1
fi

if ! [[ "$OBJECT_LOCK_DAYS" =~ ^[0-9]+$ ]] || [[ "$OBJECT_LOCK_DAYS" -lt 1 ]]; then
  echo "[apply-backup-bucket-policy] ERROR: --object-lock-days must be a positive integer (got: $OBJECT_LOCK_DAYS)" >&2
  exit 1
fi

run() {
  # Prints the command always; only executes it when not --dry-run.
  echo "+ $*"
  if [[ "$DRY_RUN" != "true" ]]; then
    "$@"
  fi
}

lifecycle_json() {
  cat <<JSON
{
  "Rules": [
    {
      "ID": "postgres-snapshots",
      "Filter": { "Prefix": "postgres/" },
      "Status": "Enabled",
      "Transitions": [{ "Days": 7, "StorageClass": "STANDARD_IA" }],
      "Expiration": { "Days": 30 },
      "NoncurrentVersionTransitions": [{ "NoncurrentDays": 7, "StorageClass": "STANDARD_IA" }],
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    },
    {
      "ID": "uploads-snapshots",
      "Filter": { "Prefix": "uploads/" },
      "Status": "Enabled",
      "Transitions": [{ "Days": 30, "StorageClass": "STANDARD_IA" }],
      "Expiration": { "Days": 90 },
      "NoncurrentVersionTransitions": [{ "NoncurrentDays": 30, "StorageClass": "STANDARD_IA" }],
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
    },
    {
      "ID": "nats-snapshots",
      "Filter": { "Prefix": "nats/" },
      "Status": "Enabled",
      "Transitions": [{ "Days": 7, "StorageClass": "STANDARD_IA" }],
      "Expiration": { "Days": 14 },
      "NoncurrentVersionTransitions": [{ "NoncurrentDays": 7, "StorageClass": "STANDARD_IA" }],
      "NoncurrentVersionExpiration": { "NoncurrentDays": 14 }
    }
  ]
}
JSON
}

echo "[apply-backup-bucket-policy] bucket=${BUCKET} region=${REGION} dry-run=${DRY_RUN}"

echo "[apply-backup-bucket-policy] enabling bucket versioning (required for lifecycle noncurrent-version rules and for Object Lock)"
run aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --versioning-configuration Status=Enabled

LIFECYCLE_FILE="$(mktemp -t backup-bucket-lifecycle-XXXXXX.json)"
trap 'rm -f "$LIFECYCLE_FILE"' EXIT
lifecycle_json > "$LIFECYCLE_FILE"

echo "[apply-backup-bucket-policy] lifecycle configuration:"
cat "$LIFECYCLE_FILE"

echo "[apply-backup-bucket-policy] applying lifecycle rule (postgres/ 30d, uploads/ 90d, nats/ 14d)"
run aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --lifecycle-configuration "file://${LIFECYCLE_FILE}"

if [[ "$ENABLE_OBJECT_LOCK" == "true" ]]; then
  echo "[apply-backup-bucket-policy] checking whether the bucket supports Object Lock (must have been created with it enabled)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "+ aws s3api get-object-lock-configuration --bucket $BUCKET --region $REGION"
    echo "[apply-backup-bucket-policy] --dry-run: skipping the support check and the put-object-lock-configuration call below."
  elif ! aws s3api get-object-lock-configuration --bucket "$BUCKET" --region "$REGION" >/dev/null 2>&1; then
    echo "[apply-backup-bucket-policy] WARNING: bucket '$BUCKET' does not support Object Lock (it must be enabled at bucket creation with --object-lock-enabled-for-bucket and cannot be retrofitted). Skipping Object Lock; versioning + lifecycle above are still applied." >&2
    ENABLE_OBJECT_LOCK=false
  fi

  if [[ "$ENABLE_OBJECT_LOCK" == "true" ]]; then
    echo "[apply-backup-bucket-policy] setting default Object Lock retention: mode=${OBJECT_LOCK_MODE} days=${OBJECT_LOCK_DAYS}"
    run aws s3api put-object-lock-configuration \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --object-lock-configuration "{\"ObjectLockEnabled\":\"Enabled\",\"Rule\":{\"DefaultRetention\":{\"Mode\":\"${OBJECT_LOCK_MODE}\",\"Days\":${OBJECT_LOCK_DAYS}}}}"
  fi
else
  echo "[apply-backup-bucket-policy] --enable-object-lock not set — versioning + lifecycle only. See docs/adr/0007-postgres-backups-pitr-restore.md for the Object Lock tradeoffs."
fi

echo "[apply-backup-bucket-policy] done"
