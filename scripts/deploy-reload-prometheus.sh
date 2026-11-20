#!/usr/bin/env bash
# Reload Prometheus after a deploy or rollback brings the stack up.
#
# Prometheus reads its config and alert rules (prometheus.yml and
# infra/prometheus/rules/, both bind-mounted) only at start and on reload.
# `docker compose up -d` leaves an unchanged prometheus container running, so
# rules or config shipped by this deploy would otherwise never take effect.
# SIGHUP makes it re-read both. Afterwards, check that some rule groups
# loaded: Prometheus keeps running on a bad rules file, it just drops it.
#
# A missing reload or rule set is reported as a warning, not a failure: the
# app deploy is fine either way, and failing it would trigger a rollback.
#
# Usage (on the deploy host, from /opt/ads/<env>):
#   scripts/deploy-reload-prometheus.sh "$COMPOSE_FILE" "$OVERLAY_ARGS"
set -uo pipefail

compose_file="$1"
overlay_args="${2:-}"

case "$overlay_args" in
  *docker-compose.observability.yml*) ;;
  *) exit 0 ;;
esac

# shellcheck disable=SC2086
compose() { docker compose -f "$compose_file" $overlay_args --env-file .env "$@"; }

if ! compose kill -s SIGHUP prometheus; then
  echo "::warning::Could not send SIGHUP to prometheus; new alert rules or config are not active until it restarts."
  exit 0
fi

# Give Prometheus a moment to finish the reload before asking what it loaded.
sleep "${RELOAD_SETTLE_SECONDS:-5}"

rules="$(compose exec -T prometheus wget -qO- http://localhost:9090/api/v1/rules 2>/dev/null)"
case "$rules" in
  *'"groups":[]'* | '')
    echo "::warning::Prometheus has no alert rule groups loaded after the reload. Check infra/prometheus/rules on the host and the prometheus logs."
    ;;
  *)
    echo "Prometheus reloaded; alert rule groups are loaded."
    ;;
esac
