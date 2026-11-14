#!/usr/bin/env bash
# Sends one operational alert through ideasquared-bot's POST /alert endpoint, which posts it to
# the project's github channel in Discord and pings @everyone.
#
# Usage: scripts/send-alert.sh <critical|warning> <title> [details] [source]
#
# Environment:
#   ALERT_URL     ideasquared-bot's /alert endpoint (not a secret)
#   ALERT_SECRET  HMAC key shared with ideasquared-bot; signs the request body
#
# Unconfigured (either variable empty) is a valid state: it skips quietly. A failed send never
# fails the caller and prints only the HTTP status, never the URL, the secret or the body.
set -uo pipefail

severity="${1:?usage: send-alert.sh <critical|warning> <title> [details] [source]}"
title="${2:?usage: send-alert.sh <critical|warning> <title> [details] [source]}"
details="${3:-}"
source_name="${4:-github-actions}"

if [ -z "${ALERT_URL:-}" ] || [ -z "${ALERT_SECRET:-}" ]; then
  echo "ALERT_URL or ALERT_SECRET not set - skipping alert."
  exit 0
fi

body=$(jq -cn \
  --arg severity "$severity" --arg title "$title" \
  --arg details "$details" --arg source "$source_name" \
  '{project: "ads", severity: $severity, title: $title[0:200],
    details: $details[0:1500], source: $source[0:100]}')

# The key goes in through the environment, not argv, so it never shows in a process listing.
signature=$(printf '%s' "$body" | node -e '
  const { createHmac } = require("node:crypto");
  let input = "";
  process.stdin.on("data", chunk => (input += chunk));
  process.stdin.on("end", () =>
    process.stdout.write(createHmac("sha256", process.env.ALERT_SECRET).update(input).digest("hex")));
')

status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ALERT_URL" \
  -H 'Content-Type: application/json' \
  -H "X-Alert-Signature-256: sha256=${signature}" \
  --data-binary "$body") || true

case "$status" in
  2??) ;;
  *) echo "::warning::Alert not sent (HTTP ${status:-000})." ;;
esac
exit 0
