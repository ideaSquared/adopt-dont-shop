#!/usr/bin/env bash
# Push an image to GHCR, retrying a refused push.
#
# The first push of an image whose package does not exist yet creates the
# package but is answered `denied`: the workflow's GITHUB_TOKEN is not granted
# access to the new package until a moment later. Each first deploy of a new
# service hit this (service-notifications, service-pets, service-rescue: each
# package's created_at matches its denied push to the second), and the next
# run pushed fine. Retrying in the same run gets past it.
#
# Usage: scripts/ghcr-push.sh <image-ref>
set -uo pipefail

ref="$1"
attempts=5
# Seconds before the first retry; each later retry waits one step longer
# (15s, 30s, 45s, 60s). Overridable only so the tests run instantly.
step="${GHCR_PUSH_RETRY_DELAY_SECONDS:-15}"

for ((i = 1; i <= attempts; i++)); do
  docker push "$ref" && exit 0
  if [ "$i" -lt "$attempts" ]; then
    echo "Push of $ref failed (attempt $i/$attempts); retrying in $((step * i))s" >&2
    sleep "$((step * i))"
  fi
done

echo "ERROR: push of $ref failed after $attempts attempts" >&2
exit 1
