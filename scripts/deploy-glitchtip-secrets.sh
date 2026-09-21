#!/usr/bin/env bash
# ADS-1342: file-secret materialization for the opt-in GlitchTip overlay
# (docker-compose.glitchtip.yml). Only invoked from deploy.yml when
# GLITCHTIP_ENABLED=true (scripts/deploy-overlay-args.sh) — a deploy with
# GlitchTip off must never fail on a host .env var the operator never set.
#
# Like RESEND_API_KEY/FCM_SERVICE_ACCOUNT_JSON, these values aren't rotated
# per-deploy via the GitHub Actions secret store the way JWT_SECRET etc. are
# (see scripts/deploy-secrets.sh) — they're host-.env-only, so read straight
# from .env here.
#
# Run on the deploy host, from the per-environment directory (/opt/ads/<env>),
# with the host .env already in the cwd and secrets/ already created by
# scripts/deploy-secrets.sh (which must run first).
set -euo pipefail

read_env() {  # read a key from the host .env, quotes stripped; fails if absent
  local v
  v="$(grep -E "^$1=" .env | head -n1 | cut -d= -f2-)" || true
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  [ -n "$v" ] || { echo "ERROR: $1 missing from .env" >&2; exit 1; }
  printf '%s' "$v"
}

# Assign to a variable first (not inline in `printf`'s argument list) — under
# `set -e`, a bare `VAR="$(cmd)"` assignment fails when `cmd` does, but a
# command substitution embedded in another command's arguments does not: the
# outer command's own exit status is what `set -e` sees, and `printf` exits 0
# even when it's handed an empty string.
DB_PASSWORD="$(read_env GLITCHTIP_DB_PASSWORD)"
SECRET_KEY="$(read_env GLITCHTIP_SECRET_KEY)"
REDIS_PASSWORD="$(read_env GLITCHTIP_REDIS_PASSWORD)"
printf '%s' "$DB_PASSWORD"    > secrets/glitchtip_db_password
printf '%s' "$SECRET_KEY"     > secrets/glitchtip_secret_key
printf '%s' "$REDIS_PASSWORD" > secrets/glitchtip_redis_password
chmod 600 secrets/glitchtip_db_password secrets/glitchtip_secret_key secrets/glitchtip_redis_password
echo "Materialized secrets/glitchtip_* from .env."
