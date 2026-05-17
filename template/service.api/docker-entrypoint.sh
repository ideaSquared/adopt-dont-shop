#!/bin/sh
set -e

# Build lib.example if not already built
if [ ! -d "/app/lib.example/dist" ]; then
  echo "Building lib.example..."
  cd /app/lib.example && npm run build
fi

# Ensure lib.example is in node_modules
mkdir -p /app/service.api/node_modules/@my-org
if [ ! -d "/app/service.api/node_modules/@my-org/lib.example" ] || [ ! -f "/app/service.api/node_modules/@my-org/lib.example/package.json" ]; then
  echo "Copying lib.example to node_modules..."
  rm -rf /app/service.api/node_modules/@my-org/lib.example
  mkdir -p /app/service.api/node_modules/@my-org/lib.example
  cp /app/lib.example/package.json /app/service.api/node_modules/@my-org/lib.example/
  cp -r /app/lib.example/dist /app/service.api/node_modules/@my-org/lib.example/
fi

cd /app/service.api
exec "$@"
