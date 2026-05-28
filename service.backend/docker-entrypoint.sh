#!/bin/sh
set -e

cd /app/service.backend

# Skip runtime npm install in production — images bake dependencies in at
# build time, and running npm install in a hardened (read-only) container
# either fails or constitutes a supply-chain risk. [ADS-701]
if [ "$NODE_ENV" != "production" ]; then
  if [ ! -d "node_modules/pg" ]; then
    echo "Installing dependencies (node_modules missing or stale)..."
    npm install --prefer-offline 2>/dev/null || npm install
  fi
fi

exec "$@"
