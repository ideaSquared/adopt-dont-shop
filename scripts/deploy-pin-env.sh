#!/usr/bin/env bash
# Shared image-pin writer for deploy.yml (deploy + auto-rollback) and
# rollback.yml. Rewrites the host .env so the stack runs exactly <sha>, plus
# any per-service overrides given in TAG_OVERRIDES — and nothing else.
#
# Replaces three hand-rolled copies that had two bugs between them:
#   - `sed -i "s/^DEPLOY_SHA=.*/.../" .env || echo ... >> .env` never appends,
#     because sed exits 0 when nothing matches. A fresh host .env has no
#     DEPLOY_SHA line, so the very first deploy failed compose's
#     `${DEPLOY_SHA:?}` guard.
#   - deploy.yml only ever added SERVICE_*_TAG / APP_*_TAG lines, so an
#     override from one deploy silently pinned that service on every later
#     deploy.
#
# Every input is validated before .env is touched, and the new file replaces
# the old one atomically, so a rejected run leaves .env exactly as it was.
# Images are tagged by full 40-char git SHA only (deploy.yml), so the SHA and
# every override value must be one — anything else could never be pulled and
# could not be signature-verified.
#
# Run on the deploy host from /opt/ads/<env>. Usage:
#   TAG_OVERRIDES='SERVICE_AUTH_TAG=<sha>,APP_ADMIN_TAG=<sha>' \
#     scripts/deploy-pin-env.sh <40-char-sha>
set -euo pipefail

SHA_RE='^[0-9a-f]{40}$'
KEY_RE='^(SERVICE|APP)_[A-Z_]+_TAG$'

sha="${1:-}"
if ! [[ "$sha" =~ $SHA_RE ]]; then
  echo "ERROR: deploy SHA must be a full 40-char lowercase git SHA, got '$sha'" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: no .env in $(pwd)" >&2
  exit 1
fi

overrides=()
while IFS= read -r pair; do
  pair="$(printf '%s' "$pair" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [ -z "$pair" ] && continue
  key="${pair%%=*}"
  value="${pair#*=}"
  if [ "$key" = "$pair" ] || ! [[ "$key" =~ $KEY_RE ]]; then
    echo "ERROR: invalid tag override '$pair' (key must match $KEY_RE)" >&2
    exit 1
  fi
  if ! [[ "$value" =~ $SHA_RE ]]; then
    echo "ERROR: invalid tag override value for $key: must be a full 40-char lowercase git SHA" >&2
    exit 1
  fi
  overrides+=("$key=$value")
done < <(printf '%s\n' "${TAG_OVERRIDES:-}" | tr ',' '\n')

tmp="$(mktemp .env.XXXXXX)"
trap 'rm -f "$tmp"' EXIT
# Keep the original file's permissions on the replacement.
chmod --reference=.env "$tmp"

# Drop every existing override, rewrite DEPLOY_SHA in place (or append it on a
# first deploy), and normalise a missing trailing newline so appended lines
# never glue onto the last key.
awk -v sha="$sha" '
  /^(SERVICE|APP)_[A-Z_]+_TAG=/ { next }
  /^DEPLOY_SHA=/ { print "DEPLOY_SHA=" sha; found = 1; next }
  { print }
  END { if (!found) print "DEPLOY_SHA=" sha }
' .env > "$tmp"

for line in "${overrides[@]+"${overrides[@]}"}"; do
  printf '%s\n' "$line" >> "$tmp"
  echo "Tag override applied: $line"
done

mv "$tmp" .env
trap - EXIT
echo "Pinned DEPLOY_SHA=$sha in .env."
