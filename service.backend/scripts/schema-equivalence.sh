#!/usr/bin/env bash
#
# schema-equivalence.sh — verify the per-model rebaseline gate locally.
#
# Bootstraps two databases against the same model code:
#
#   DB-A : sequelize-cli db:migrate (runs 00-baseline + per-domain baselines
#          + post-baseline forward migrations)
#   DB-B : sequelize.sync() (one-shot, the source of truth for what the
#          model classes describe today)
#
# Then pg_dump --schema-only both, normalises with normalise-pg-dump.sh,
# and `diff`s the results. Exit code:
#   0 — schemas equivalent (modulo documented asymmetries; see
#       normalise-pg-dump.sh).
#   1 — drift detected. The diff is printed on stderr and saved to
#       --out-dir.
#   2 — bootstrap or dump failed. stderr carries the error.
#
# Usage:
#   # Operator provides two empty DBs (created beforehand). The script
#   # assumes both are reachable as superuser-equivalent so DDL and CREATE
#   # EXTENSION succeed.
#   DATABASE_URL_MIGRATE='postgresql://u:p@host:5432/equiv_a' \
#   DATABASE_URL_SYNC='postgresql://u:p@host:5432/equiv_b' \
#     ./service.backend/scripts/schema-equivalence.sh
#
# Same DATABASE_URL conventions as scripts/schema-audit-docker.sh.
#
# Tunables (env vars, all optional):
#   OUT_DIR  — where dumps + diff land (default: ./schema-equivalence-out)
#   PGDUMP   — pg_dump binary (default: pg_dump)

set -euo pipefail

if [[ -z "${DATABASE_URL_MIGRATE:-}" || -z "${DATABASE_URL_SYNC:-}" ]]; then
  echo "schema-equivalence: DATABASE_URL_MIGRATE and DATABASE_URL_SYNC must both be set" >&2
  echo "  Example:" >&2
  echo "    DATABASE_URL_MIGRATE='postgresql://u:p@host:5432/equiv_a' \\" >&2
  echo "    DATABASE_URL_SYNC='postgresql://u:p@host:5432/equiv_b' \\" >&2
  echo "      $0" >&2
  exit 2
fi

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd -- "${SCRIPT_DIR}/.." && pwd )"
NORMALISER="${SCRIPT_DIR}/normalise-pg-dump.sh"
OUT_DIR="${OUT_DIR:-./schema-equivalence-out}"
PGDUMP="${PGDUMP:-pg_dump}"

mkdir -p "${OUT_DIR}"

if ! command -v "${PGDUMP}" >/dev/null 2>&1; then
  echo "schema-equivalence: ${PGDUMP} not found in PATH" >&2
  exit 2
fi

# Parse DATABASE_URL into the DB_* envvars sequelize-config.js expects.
# `db:migrate` reads sequelize-config.js (not DATABASE_URL directly), so we
# translate here. URL format: postgresql://USER:PASS@HOST:PORT/DB
parse_url() {
  local url="$1"
  # shellcheck disable=SC2034  # Variables consumed by caller via eval.
  python3 - "$url" <<'PY'
import sys
from urllib.parse import urlparse, unquote
u = urlparse(sys.argv[1])
print(f"DB_USERNAME={unquote(u.username or '')}")
print(f"DB_PASSWORD={unquote(u.password or '')}")
print(f"DB_HOST={u.hostname or ''}")
print(f"DB_PORT={u.port or 5432}")
print(f"DB_NAME={(u.path or '/').lstrip('/')}")
PY
}

echo "==> Bootstrapping DB-A via sequelize-cli db:migrate" >&2
(
  set -a
  # shellcheck disable=SC2046  # Word splitting is intentional here.
  eval $(parse_url "${DATABASE_URL_MIGRATE}")
  TEST_DB_NAME="${DB_NAME}"
  DEV_DB_NAME="${DB_NAME}"
  PROD_DB_NAME="${DB_NAME}"
  NODE_ENV="${NODE_ENV:-test}"
  set +a
  cd "${BACKEND_DIR}"
  npm run db:migrate >&2
)

echo "==> Bootstrapping DB-B via sequelize.sync()" >&2
(
  set -a
  # shellcheck disable=SC2046
  eval $(parse_url "${DATABASE_URL_SYNC}")
  TEST_DB_NAME="${DB_NAME}"
  DEV_DB_NAME="${DB_NAME}"
  PROD_DB_NAME="${DB_NAME}"
  NODE_ENV="${NODE_ENV:-test}"
  set +a
  cd "${BACKEND_DIR}"
  npx ts-node --transpile-only -e '
    (async () => {
      const sequelize = (await import("./src/sequelize")).default;
      await import("./src/models/index");
      await sequelize.sync();
      await sequelize.close();
    })().catch((err) => { console.error(err); process.exit(1); });
  ' >&2
)

echo "==> Dumping DB-A" >&2
"${PGDUMP}" --schema-only --no-owner --no-privileges \
  --exclude-table='SequelizeMeta' \
  "${DATABASE_URL_MIGRATE}" > "${OUT_DIR}/dump-a.sql"

echo "==> Dumping DB-B" >&2
"${PGDUMP}" --schema-only --no-owner --no-privileges \
  --exclude-table='SequelizeMeta' \
  "${DATABASE_URL_SYNC}" > "${OUT_DIR}/dump-b.sql"

echo "==> Normalising both dumps" >&2
"${NORMALISER}" < "${OUT_DIR}/dump-a.sql" > "${OUT_DIR}/dump-a.normalised.sql"
"${NORMALISER}" < "${OUT_DIR}/dump-b.sql" > "${OUT_DIR}/dump-b.normalised.sql"

echo "==> Diffing" >&2
if diff -u "${OUT_DIR}/dump-a.normalised.sql" "${OUT_DIR}/dump-b.normalised.sql" \
    > "${OUT_DIR}/schema.diff"; then
  echo "schema-equivalence: OK — DB-A and DB-B are equivalent." >&2
  exit 0
fi

echo "schema-equivalence: DRIFT detected. See ${OUT_DIR}/schema.diff" >&2
echo "------ diff (truncated to 200 lines) ------" >&2
head -n 200 "${OUT_DIR}/schema.diff" >&2
exit 1
