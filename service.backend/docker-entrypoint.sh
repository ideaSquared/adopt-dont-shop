#!/bin/sh
set -e

cd /app/service.backend

if [ ! -d "node_modules/pg" ]; then
  echo "Installing dependencies (node_modules missing or stale)..."
  npm install --prefer-offline 2>/dev/null || npm install
fi

exec "$@"
