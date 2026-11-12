#!/usr/bin/env bash
# Keyless-sign an image with cosign, retrying a failed sign.
#
# Keyless signing fetches an OIDC token from the Actions token endpoint, which
# now and then answers with a non-JSON error body. cosign then fails with
# `fetching ambient OIDC credentials: invalid character 'u' looking for
# beginning of value`, and one flaky token fetch failed a whole deploy after
# five images had already signed. A retry a moment later succeeds.
#
# Usage: scripts/cosign-sign.sh <image-ref@digest>
set -uo pipefail

ref="$1"
attempts=5
# Seconds before the first retry; each later retry waits one step longer
# (10s, 20s, 30s, 40s). Overridable only so the tests run instantly.
step="${COSIGN_SIGN_RETRY_DELAY_SECONDS:-10}"

for ((i = 1; i <= attempts; i++)); do
  cosign sign --yes "$ref" && exit 0
  if [ "$i" -lt "$attempts" ]; then
    echo "Signing of $ref failed (attempt $i/$attempts); retrying in $((step * i))s" >&2
    sleep "$((step * i))"
  fi
done

echo "ERROR: signing of $ref failed after $attempts attempts" >&2
exit 1
