#!/usr/bin/env bash
# ADS-900: shared health-check loop for deploy.yml and rollback.yml. Both
# workflows previously hand-rolled their own "wait for service X to be
# healthy" loop against a running docker-compose stack; the copies had
# already drifted (different retry/interval constants, different error
# messages). This is the single source of truth for that loop.
#
# Usage:
#   scripts/wait-for-services.sh <compose-file> <retries> <interval-seconds> <service:port> [<service:port> ...]
#
# Each service is checked at http://localhost:<port>/health/simple, executed
# inside the named compose service's container via `docker compose exec`.
# Exits non-zero (and prints which service failed) if any service doesn't
# report healthy within retries * interval-seconds.
#
# Example:
#   scripts/wait-for-services.sh docker-compose.prod.yml 30 2 \
#     service-notifications:5001 service-auth:5002 service-gateway:4000
set -euo pipefail

if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <compose-file> <retries> <interval-seconds> <service:port> [<service:port> ...]" >&2
  exit 1
fi

COMPOSE_FILE="$1"
RETRIES="$2"
INTERVAL="$3"
shift 3

for pair in "$@"; do
  svc="${pair%%:*}"
  port="${pair##*:}"
  echo "Waiting for $svc (:$port/health/simple)..."
  healthy=false
  for _ in $(seq 1 "$RETRIES"); do
    if docker compose -f "$COMPOSE_FILE" exec -T "$svc" \
         curl -fsS "http://localhost:${port}/health/simple" > /dev/null 2>&1; then
      echo "$svc healthy."
      healthy=true
      break
    fi
    sleep "$INTERVAL"
  done
  if [ "$healthy" = "false" ]; then
    echo "ERROR: $svc failed health check after $((RETRIES * INTERVAL))s"
    exit 1
  fi
done
