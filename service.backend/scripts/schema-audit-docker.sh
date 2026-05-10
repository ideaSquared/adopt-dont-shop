#!/usr/bin/env bash
# schema-audit-docker.sh — operator wrapper around scripts/schema-audit.ts.
#
# Goal: an operator with only Docker (no Node, no workspace deps) can run the
# read-only schema-audit against any DATABASE_URL. The audit script is itself
# read-only — see scripts/schema-audit.ts for the contract.
#
# Build phase  : reuses the `build` stage of service.backend/Dockerfile so the
#                dependency tree (sequelize, models, ts-node) is identical to
#                what production runs against.
# Run phase    : passes DATABASE_URL through; mounts no volumes; emits JSON to
#                stdout (operator pipes to a file). Exit code mirrors the
#                audit script's: 0 = no drift, 1 = drift, 2 = error.
#
# Usage:
#   DATABASE_URL='postgres://user:pass@host:5432/db' \
#     ./service.backend/scripts/schema-audit-docker.sh > audit.json
#
# Tunables (env vars, all optional):
#   IMAGE_TAG  — tag for the built image (default: ads-schema-audit:local)
#   SKIP_BUILD — set to 1 to reuse an existing image without rebuilding
#
# Run from the monorepo root so the build context can see lib.types/ and
# lib.validation/ — the backend Dockerfile depends on them.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "schema-audit-docker: DATABASE_URL not set" >&2
  echo "  Example:" >&2
  echo "    DATABASE_URL='postgres://user:pass@host:5432/db' $0 > audit.json" >&2
  exit 2
fi

IMAGE_TAG="${IMAGE_TAG:-ads-schema-audit:local}"
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd -- "${SCRIPT_DIR}/../.." && pwd )"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  # The `build` stage carries the full source tree and dev deps (incl. ts-node).
  # Building only that stage skips the production-image trim — we need ts-node
  # and the source files to run the .ts script directly.
  docker build \
    --target build \
    -f "${REPO_ROOT}/service.backend/Dockerfile" \
    -t "${IMAGE_TAG}" \
    "${REPO_ROOT}" >&2
fi

# Stdout = JSON report; stderr = human summary. Forward both unmodified so the
# operator can pipe stdout to a file (`> audit.json`) and watch progress on
# stderr. Run as the image's non-root user (already configured in Dockerfile).
exec docker run --rm \
  -e NODE_ENV=production \
  -e DATABASE_URL \
  "${IMAGE_TAG}" \
  npx ts-node scripts/schema-audit.ts
