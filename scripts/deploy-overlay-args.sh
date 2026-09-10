#!/usr/bin/env bash
# ADS-1311/ADS-1041: shared optional-overlay resolver for deploy.yml and
# rollback.yml. Both workflows layer in the self-hosted observability
# (Prometheus/Loki/Tempo/Grafana/Alertmanager) and GlitchTip error-tracking
# stacks the same way; this was previously only in deploy.yml, so a rollback
# silently dropped the overlay and any dashboards/alerts tied to the rolled-
# back stack went dark. This is the single source of truth for both.
#
# Run on the deploy host, from the per-environment directory
# (/opt/ads/<env>), with the host .env already in the cwd. Prints the
# `-f <compose-file>` args to append to `docker compose` on stdout — enabled
# per-host in .env (OBSERVABILITY_ENABLED=true / GLITCHTIP_ENABLED=true). Off
# by default. When enabling, the overlay compose file(s) + ./observability/
# config tree must already be present on the host (deploy.yml now scp's
# both — see docs/runbooks/observability-enable.md).
#
# Usage:
#   OVERLAY_ARGS="$(scripts/deploy-overlay-args.sh)"
#   docker compose -f "$COMPOSE_FILE" $OVERLAY_ARGS --env-file .env up -d
set -euo pipefail

# Tolerant boolean read from the host .env: accepts KEY=true, KEY="true",
# surrounding quotes, trailing whitespace, or an inline `# comment` — the
# same coercions docker-compose applies — so the flag and the overlay can't
# disagree.
env_flag_true() {
  local v
  v="$(grep -E "^$1=" .env 2>/dev/null | head -n1 | cut -d= -f2-)" || true
  v="${v%%#*}"                                        # strip inline comment
  v="$(printf '%s' "$v" | tr -d '[:space:]')"         # strip whitespace
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"   # strip quotes
  [ "$v" = "true" ]
}

OVERLAY_ARGS=""
if env_flag_true OBSERVABILITY_ENABLED; then
  OVERLAY_ARGS="$OVERLAY_ARGS -f docker-compose.observability.yml"
  echo "Observability stack ENABLED (metrics/logs/traces/alerting)." >&2
fi
if env_flag_true GLITCHTIP_ENABLED; then
  OVERLAY_ARGS="$OVERLAY_ARGS -f docker-compose.glitchtip.yml"
  echo "GlitchTip error tracking ENABLED." >&2
fi

printf '%s' "$OVERLAY_ARGS"
