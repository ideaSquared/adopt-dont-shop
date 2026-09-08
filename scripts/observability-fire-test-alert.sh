#!/usr/bin/env bash
# Fire a synthetic alert straight at Alertmanager's HTTP API to prove the
# full pipeline (Alertmanager routing -> receiver -> Discord) end to end,
# without waiting for a real Prometheus rule to fire (ADS-1307c). See
# docs/runbooks/observability-enable.md §7.
#
# Usage:
#   scripts/observability-fire-test-alert.sh [warning|critical]
#
# Env:
#   ALERTMANAGER_URL   Alertmanager base URL. Defaults to the SSH-tunnel
#                       address from observability-enable.md §5
#                       (http://localhost:9093).
set -euo pipefail

SEVERITY="${1:-warning}"
if [[ "$SEVERITY" != "warning" && "$SEVERITY" != "critical" ]]; then
  echo "usage: $0 [warning|critical]" >&2
  exit 1
fi

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
ALERTNAME="ObservabilityFireTest"

now() { date -u +%Y-%m-%dT%H:%M:%S.000Z; }
ends_at() {
  # GNU date (Linux) vs BSD date (macOS) — try both.
  date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null \
    || date -u -v+5M +%Y-%m-%dT%H:%M:%S.000Z
}

PAYLOAD=$(cat <<EOF
[
  {
    "labels": {
      "alertname": "${ALERTNAME}",
      "severity": "${SEVERITY}",
      "job": "observability-fire-test"
    },
    "annotations": {
      "summary": "Synthetic test alert — safe to ignore",
      "description": "Fired by scripts/observability-fire-test-alert.sh to prove the Alertmanager -> Discord pipeline is wired up end to end. No action needed."
    },
    "startsAt": "$(now)",
    "endsAt": "$(ends_at)"
  }
]
EOF
)

echo "Posting a synthetic '${SEVERITY}' alert (${ALERTNAME}) to ${ALERTMANAGER_URL}..."
curl -fsS -X POST "${ALERTMANAGER_URL}/api/v2/alerts" \
  -H 'Content-Type: application/json' \
  -d "${PAYLOAD}"
echo
echo "Posted. Now confirm the pipeline end to end:"
echo "  1. ${ALERTMANAGER_URL} (or its SSH tunnel) -> Alerts -> ${ALERTNAME} should show as firing within a few seconds."
echo "  2. Within ~$([ "$SEVERITY" = critical ] && echo 10 || echo 30) seconds (this severity's group_wait), the"
echo "     '$([ "$SEVERITY" = critical ] && echo critical-pager || echo warning-chat)' Discord channel should receive a message"
echo "     titled '[FIRING:1] ${ALERTNAME}'."
echo "  3. It self-resolves in ~5 minutes (endsAt above); a '[RESOLVED]' message confirms send_resolved is working too."
echo
echo "No message arrived? Check the receiver's webhook secret file exists and Alertmanager reloaded it — see"
echo "docs/runbooks/observability-enable.md §4."
