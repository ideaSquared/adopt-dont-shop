#!/bin/sh
set -e

# Build lib.types if not already built
if [ ! -d "/app/lib.types/dist" ]; then
  echo "Building lib.types..."
  cd /app/lib.types && npm run build
fi

# Ensure lib.types is in node_modules
mkdir -p /app/service.backend/node_modules/@adopt-dont-shop
if [ ! -d "/app/service.backend/node_modules/@adopt-dont-shop/lib.types" ] || [ ! -f "/app/service.backend/node_modules/@adopt-dont-shop/lib.types/package.json" ]; then
  echo "Copying lib.types to node_modules..."
  rm -rf /app/service.backend/node_modules/@adopt-dont-shop/lib.types
  mkdir -p /app/service.backend/node_modules/@adopt-dont-shop/lib.types
  cp /app/lib.types/package.json /app/service.backend/node_modules/@adopt-dont-shop/lib.types/
  cp -r /app/lib.types/dist /app/service.backend/node_modules/@adopt-dont-shop/lib.types/
fi

cd /app/service.backend
exec "$@"
