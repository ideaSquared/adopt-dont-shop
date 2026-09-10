#!/usr/bin/env bash
# ADS-1311: shared file-secret materialization for deploy.yml and
# rollback.yml. Both workflows previously hand-rolled this block on the
# remote host and had drifted (rollback.yml never wrote
# secrets/nats_auth_token). This is the single source of truth.
#
# Run on the deploy host, from the per-environment directory
# (/opt/ads/<env>), with the host .env already in the cwd. Writes the
# file-mounted Docker secrets consumed via `file: ./secrets/<name>` by
# docker-compose.prod.yml and docker-compose.staging.yml (see
# secrets/README.md for the required set).
#
# database_url / redis_url are composed from the rotating DB password (and
# NATS token) plus the non-rotating identifiers already in the host .env
# (POSTGRES_USER / POSTGRES_DB, and the REDIS_PASSWORD the redis container
# itself authenticates with) so the URLs always match what the
# database/redis containers use. redis_password is the same value, written
# separately because the redis container reads its own --requirepass from
# this file rather than from `environment:` (ADS-878).
#
# Usage (all via environment variables, never CLI args — these are secret
# values and must not appear in process listings):
#   SECRET_JWT_SECRET=... SECRET_JWT_REFRESH_SECRET=... \
#   SECRET_ENCRYPTION_KEY=... SECRET_UPLOAD_SIGNING_SECRET=... \
#   SECRET_DB_PASSWORD=... SECRET_PRINCIPAL_SIGNING_KEY=... \
#   SECRET_NATS_AUTH_TOKEN=... scripts/deploy-secrets.sh
set -euo pipefail

required_secret_vars="SECRET_JWT_SECRET SECRET_JWT_REFRESH_SECRET SECRET_ENCRYPTION_KEY SECRET_UPLOAD_SIGNING_SECRET SECRET_DB_PASSWORD SECRET_PRINCIPAL_SIGNING_KEY SECRET_NATS_AUTH_TOKEN"
missing=""
for var in $required_secret_vars; do
  if [ -z "${!var:-}" ]; then
    missing="$missing $var"
  fi
done
if [ -n "$missing" ]; then
  echo "ERROR: missing required secret env var(s):$missing" >&2
  exit 1
fi

read_env() {  # read a key from the host .env, quotes stripped; fails if absent
  local v
  v="$(grep -E "^$1=" .env | head -n1 | cut -d= -f2-)" || true
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  [ -n "$v" ] || { echo "ERROR: $1 missing from .env" >&2; exit 1; }
  printf '%s' "$v"
}

PG_USER="$(read_env POSTGRES_USER)"
PG_DB="$(read_env POSTGRES_DB)"
REDIS_PW="$(read_env REDIS_PASSWORD)"

mkdir -p secrets
chmod 700 secrets
printf '%s' "postgresql://${PG_USER}:${SECRET_DB_PASSWORD}@database:5432/${PG_DB}" > secrets/database_url
printf '%s' "redis://:${REDIS_PW}@redis:6379"      > secrets/redis_url
printf '%s' "$REDIS_PW"                             > secrets/redis_password
printf '%s' "$SECRET_JWT_SECRET"                    > secrets/jwt_secret
printf '%s' "$SECRET_JWT_REFRESH_SECRET"            > secrets/jwt_refresh_secret
printf '%s' "$SECRET_ENCRYPTION_KEY"                > secrets/encryption_key
printf '%s' "$SECRET_UPLOAD_SIGNING_SECRET"         > secrets/upload_signing_secret
printf '%s' "$SECRET_PRINCIPAL_SIGNING_KEY"         > secrets/principal_signing_key
printf '%s' "$SECRET_NATS_AUTH_TOKEN"               > secrets/nats_auth_token
printf '%s' "$SECRET_DB_PASSWORD"                   > secrets/db_password
chmod 600 secrets/*
echo "Materialized secrets/* from .env + provided secret values."
