#!/usr/bin/env bash
# Production smoke test: boots the real production stack laid out the way a
# deploy lays it out on a host, then checks it end to end through the TLS
# edge. Run by the `prod-image-smoke` job in .github/workflows/docker.yml and
# locally with `pnpm smoke:prod`.
#
# What runs:
#   - the 14 images from docker-bake.hcl, under docker-compose.prod.yml as
#     shipped, plus docker-compose.ci-smoke.yml (test-only: swaps the email
#     provider and nothing else);
#   - the per-stack nginx and the shared edge gateway (deploy/gateway) with a
#     self-signed certificate for the production hostnames;
#   - throwaway secrets written by the same scripts/deploy-secrets.sh a
#     deploy runs, and the same scripts/wait-for-services.sh health gate.
#
# Not covered: the GitHub Actions deploy itself (SSH, image signing), the
# real domain and Let's Encrypt, real Resend/FCM credentials, and the
# observability/GlitchTip overlays.
#
# Usage: scripts/smoke-prod.sh [--no-build] [--keep]
#   --no-build  use images already tagged :$SMOKE_TAG (CI builds them first)
#   --keep      leave the stack running afterwards and print how to stop it
# Env: SMOKE_TAG (default: smoke), SMOKE_HTTPS_PORT (default: 8443).
# Needs Docker with Compose v2.24+ and buildx, openssl, curl, ~6-8 GB free RAM.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG="${SMOKE_TAG:-smoke}"
HTTPS_PORT="${SMOKE_HTTPS_PORT:-8443}"
# Must match the hostnames in deploy/gateway/nginx.conf.
DOMAIN="adoptdontshop.app"

BUILD=true
KEEP=false
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=false ;;
    --keep) KEEP=true ;;
    *) echo "Unknown option: $arg (expected --no-build or --keep)" >&2; exit 2 ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }

# This test reuses the real project, container, network and volume names (so
# it boots exactly what a deploy boots), and its teardown runs `down -v`. On a
# deploy host — or next to a leftover --keep run — that would recreate and
# then delete the live stack and its database. Refuse before touching
# anything; the teardown trap is only installed after this check.
existing="$(
  docker ps -a --format '{{.Names}}' | grep -E '^(ads_prod_.*|ads_gateway|ads_certbot)$' || true
  docker network ls --format '{{.Name}}' | grep -x 'ads-prod-network' || true
  docker volume ls --format '{{.Name}}' | grep -E '^(production|gateway)_' || true
)"
if [ -n "$existing" ]; then
  echo "Refusing to run: these Docker resources already exist on this daemon:" >&2
  echo "$existing" >&2
  echo "Never run the smoke test on a deploy host. If they are from an earlier --keep run, stop that stack first (the commands were printed when it finished)." >&2
  exit 1
fi

# Same directory names as the host (/opt/ads/production, /opt/ads/gateway), so
# compose derives the same project, volume and network names a deploy does.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ads-smoke.XXXXXX")"
PROD="$WORK/production"
GATEWAY="$WORK/gateway"
mkdir -p "$PROD/scripts" "$GATEWAY" "$WORK/cert"

prod() {
  (cd "$PROD" && docker compose -f docker-compose.prod.yml -f docker-compose.ci-smoke.yml --env-file .env "$@")
}
gateway() {
  (cd "$GATEWAY" && docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.smoke.yml "$@")
}

finish() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    log "Smoke test FAILED — container state and logs"
    prod ps -a || true
    prod logs --no-color --tail=80 || true
    gateway logs --no-color --tail=80 || true
  fi
  if [ "$KEEP" = true ]; then
    log "Stack left running (--keep). Stop it with:"
    echo "  (cd $GATEWAY && docker compose -f docker-compose.gateway.yml -f docker-compose.gateway.smoke.yml down -v)"
    echo "  (cd $PROD && docker compose -f docker-compose.prod.yml -f docker-compose.ci-smoke.yml --env-file .env down -v)"
    echo "  rm -rf $WORK"
    return
  fi
  # Gateway first: it is attached to the production network.
  gateway down -v --remove-orphans >/dev/null 2>&1 || true
  prod down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap finish EXIT

if [ "$BUILD" = true ]; then
  log "Building the 14 production images (docker-bake.hcl, tag :$TAG)"
  (cd "$ROOT" && TAG="$TAG" docker buildx bake -f docker-bake.hcl smoke --load)
fi

log "Laying out the host directories as deploy.yml ships them"
cp "$ROOT/docker-compose.prod.yml" "$ROOT/docker-compose.ci-smoke.yml" "$PROD/"
cp -R "$ROOT/nginx" "$PROD/nginx"
cp "$ROOT/scripts/deploy-secrets.sh" "$ROOT/scripts/wait-for-services.sh" "$PROD/scripts/"
cp -R "$ROOT/deploy/gateway/." "$GATEWAY/"

# The host .env a deploy expects (docs/infrastructure/DEPLOYMENT-PLAN.md), with
# throwaway values. DEPLOY_SHA is the local image tag.
cat > "$PROD/.env" <<EOF
POSTGRES_USER=ads_smoke
POSTGRES_DB=ads_smoke
REDIS_PASSWORD=$(openssl rand -hex 16)
CORS_ORIGIN=https://$DOMAIN,https://admin.$DOMAIN,https://rescue.$DOMAIN
PROD_HOSTNAME=$DOMAIN
DEFAULT_FROM_EMAIL=noreply@$DOMAIN
FCM_PROJECT_ID=smoke
DEPLOY_SHA=$TAG
EOF

# deploy.yml's PROD_HOSTNAME substitution (portable: no `sed -i`).
sed "s/__PROD_HOSTNAME__/$DOMAIN/g" "$PROD/nginx/nginx.prod.conf" > "$PROD/nginx/nginx.prod.conf.tmp"
mv "$PROD/nginx/nginx.prod.conf.tmp" "$PROD/nginx/nginx.prod.conf"

log "Writing throwaway secrets with scripts/deploy-secrets.sh"
(
  cd "$PROD"
  SECRET_JWT_SECRET="$(openssl rand -hex 32)" \
    SECRET_JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
    SECRET_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    SECRET_UPLOAD_SIGNING_SECRET="$(openssl rand -hex 32)" \
    SECRET_DB_PASSWORD="$(openssl rand -hex 16)" \
    SECRET_PRINCIPAL_SIGNING_KEY="$(openssl rand -hex 32)" \
    SECRET_NATS_AUTH_TOKEN="$(openssl rand -hex 32)" \
    bash scripts/deploy-secrets.sh
  # deploy.yml writes these two from the host .env; the FCM JSON only has to
  # be the right shape (no push is ever sent).
  openssl rand -hex 16 > secrets/resend_api_key
  printf '%s' '{"project_id":"smoke","client_email":"smoke@example.com","private_key":"-----BEGIN PRIVATE KEY-----\nsmoke\n-----END PRIVATE KEY-----\n"}' \
    > secrets/fcm_service_account_json
  chmod 644 secrets/resend_api_key secrets/fcm_service_account_json
)

log "Starting the production stack"
prod up -d

log "Health gate (the same scripts/wait-for-services.sh a deploy runs)"
(cd "$PROD" && bash scripts/wait-for-services.sh docker-compose.prod.yml 90 2 \
  service-notifications:5001 service-auth:5002 service-pets:5003 service-rescue:5004 \
  service-applications:5005 service-chat:5006 service-moderation:5007 \
  service-matching:5008 service-audit:5009 service-cms:5010 service-gateway:4000)

log "Waiting for every container to be running and healthy (ClamAV's first signature download takes a few minutes)"
not_ready=""
for _ in $(seq 1 120); do
  not_ready="$(prod ps -a --format '{{.Service}} {{.State}} {{.Health}}' |
    awk '$2 != "running" || ($3 != "" && $3 != "healthy")')"
  [ -z "$not_ready" ] && break
  sleep 5
done
if [ -n "$not_ready" ]; then
  echo "Not running/healthy after 10 minutes:"
  echo "$not_ready"
  exit 1
fi
echo "All containers running and healthy."

# A real photo in the uploads volume, written the way the gateway stores
# them. Requesting only a missing file can't tell "served" from "uploads
# volume not mounted" — both are 404.
fixture="adopt-dont-shop smoke fixture $(openssl rand -hex 8)"
uploads_volume="$(docker volume ls -q --filter label=com.docker.compose.project=production \
  --filter label=com.docker.compose.volume=uploads)"
nginx_image="$(prod config --images | grep -m1 '^nginx:')"
docker run --rm -v "$uploads_volume:/uploads" --entrypoint sh "$nginx_image" -c \
  "mkdir -p /uploads/pets && printf '%s' '$fixture' > /uploads/pets/smoke-fixture.jpg"

log "Starting the edge gateway with a self-signed certificate"
names=("$DOMAIN" "www.$DOMAIN" "api.$DOMAIN" "admin.$DOMAIN" "rescue.$DOMAIN" "staging.$DOMAIN")
san="$(printf 'DNS:%s,' "${names[@]}")"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=${san%,}" \
  -keyout "$WORK/cert/privkey.pem" -out "$WORK/cert/fullchain.pem" 2>/dev/null
chmod 644 "$WORK/cert/privkey.pem"
# Test-only: publish 443 on a loopback port instead of the host's 80/443.
cat > "$GATEWAY/docker-compose.gateway.smoke.yml" <<EOF
services:
  nginx:
    ports: !override
      - '127.0.0.1:$HTTPS_PORT:443'
EOF
# Install the certificate where certbot would put it, through the gateway's
# own certbot service and letsencrypt volume.
gateway run --rm --no-deps -v "$WORK/cert:/src:ro" --entrypoint sh certbot -c \
  "mkdir -p /etc/letsencrypt/live/$DOMAIN && cp /src/fullchain.pem /src/privkey.pem /etc/letsencrypt/live/$DOMAIN/"
gateway up -d nginx
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' ads_gateway 2>/dev/null)" = healthy ] && break
  sleep 2
done

log "Checking the stack through the TLS edge (https://*.$DOMAIN on 127.0.0.1:$HTTPS_PORT)"
failures=0
# status <host> <path> [curl args...]: HTTP status via the edge, 000 on a
# connection/TLS failure. The certificate is verified against our own CA, and
# any HTTPS_PROXY is bypassed — these requests must reach the local edge.
status() {
  local host="$1" path="$2"
  shift 2
  curl -s -o /dev/null -w '%{http_code}' --max-time 20 --noproxy '*' --cacert "$WORK/cert/fullchain.pem" \
    --resolve "$host:$HTTPS_PORT:127.0.0.1" "$@" "https://$host:$HTTPS_PORT$path" || true
}
body() {
  local host="$1" path="$2"
  curl -s --max-time 20 --noproxy '*' --cacert "$WORK/cert/fullchain.pem" \
    --resolve "$host:$HTTPS_PORT:127.0.0.1" "https://$host:$HTTPS_PORT$path" || true
}
check() {
  local description="$1" expected="$2" actual="$3"
  if [[ "$actual" =~ ^($expected)$ ]]; then
    echo "  ok    $description ($actual)"
  else
    echo "  FAIL  $description: expected $expected, got $actual"
    failures=$((failures + 1))
  fi
}

check "public site" 200 "$(status "$DOMAIN" /)"
check "admin site" 200 "$(status "admin.$DOMAIN" /)"
check "rescue site" 200 "$(status "rescue.$DOMAIN" /)"
check "API readiness" 200 "$(status "api.$DOMAIN" /health/ready)"
check "legal terms (docs baked into the gateway image)" 200 "$(status "$DOMAIN" /api/v1/legal/terms)"
# The public login route forwards an empty body to auth, whose validation
# answers 400. 404 means the route is missing; 401/403 that it was wrongly
# put behind authentication or CSRF.
check "login route registered and public (empty body is a 400)" 400 \
  "$(status "api.$DOMAIN" /api/v1/auth/login -X POST -H 'content-type: application/json' -d '{}')"
check "uploaded photos are served from the uploads volume" 200 \
  "$(status "$DOMAIN" /uploads/pets/smoke-fixture.jpg)"
check "uploaded photo content is intact" match \
  "$([ "$(body "$DOMAIN" /uploads/pets/smoke-fixture.jpg)" = "$fixture" ] && echo match || echo mismatch)"
check "a missing photo is a 404 (not a redirect)" 404 \
  "$(status "$DOMAIN" /uploads/pets/smoke-missing.jpg)"
check "ID documents are never served directly" 403 "$(status "$DOMAIN" /uploads/documents/smoke.pdf)"
check "a vhost whose stack is absent fails alone (staging, no staging stack)" 502 \
  "$(status "staging.$DOMAIN" /)"
hsts="$({ curl -s -D - -o /dev/null --max-time 20 --noproxy '*' --cacert "$WORK/cert/fullchain.pem" \
  --resolve "$DOMAIN:$HTTPS_PORT:127.0.0.1" "https://$DOMAIN:$HTTPS_PORT/" || true; } | tr -d '\r' |
  awk -F': ' 'tolower($1) == "strict-transport-security" { print "present" }' | head -n1)"
check "HSTS header on the public site" present "${hsts:-missing}"

if [ "$failures" -ne 0 ]; then
  log "$failures check(s) failed"
  exit 1
fi
log "Production smoke test passed"
