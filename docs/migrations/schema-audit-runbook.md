# Schema Audit Runbook

`service.backend/scripts/schema-audit.ts` is a read-only diff tool. It compares the Sequelize models registered in `service.backend/src/models/index.ts` against a live database and prints a per-table report of any drift. Its purpose is to gate the per-model rebaseline plan in [`per-model-rebaseline.md`](./per-model-rebaseline.md): the SequelizeMeta pre-seed step (§3) is only safe if the live DB already matches what the per-model baseline files would create. The audit answers "does it?".

## Running the script

The script honours the same env-var conventions as the rest of `service.backend` (see `service.backend/src/sequelize.ts`):

| NODE_ENV      | Connection-string source (in priority order)                                                  |
| ------------- | --------------------------------------------------------------------------------------------- |
| `development` | `DEV_DATABASE_URL`, else built from `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` |
| `test`        | in-memory SQLite (used by the test suite only)                                                |
| `production`  | `DATABASE_URL`, else built from individual `DB_*` vars                                        |

### Against a local dev DB

```bash
cd service.backend
NODE_ENV=development npx ts-node scripts/schema-audit.ts > /tmp/audit-dev.json
```

### Against staging or production

Run from a host that already has read access to the target DB (e.g. a bastion, CI runner, or `kubectl exec` into a backend pod). The script only issues `SELECT` against `information_schema` / `pg_catalog` / `sqlite_master` — no writes, no DDL, no transactions other than the implicit per-query autocommit.

```bash
# From inside a production container that has DATABASE_URL already set:
NODE_ENV=production node dist/scripts/schema-audit.js > /tmp/audit-prod.json
# (Or via ts-node from a dev checkout, if the bastion has it:)
NODE_ENV=production DATABASE_URL='postgres://user:pass@host:5432/db' \
  npx ts-node scripts/schema-audit.ts > /tmp/audit-prod.json
```

### Via Docker (operator without Node/workspace deps)

For an SRE who has Docker but no Node toolchain or repo checkout, `service.backend/scripts/schema-audit-docker.sh` builds the audit image from the existing backend `Dockerfile` build stage and runs the script with `DATABASE_URL` passed through. The image mounts no volumes; stdout is the JSON report so the operator can pipe to a file, stderr is the human summary. The wrapper exits with the same code the underlying script produces (0 = no drift, 1 = drift, 2 = error).

```bash
# Run from the monorepo root (the Dockerfile build context needs lib.types/).
DATABASE_URL='postgres://user:pass@host:5432/db' \
  ./service.backend/scripts/schema-audit-docker.sh > audit.json

# Reuse a previously-built image:
SKIP_BUILD=1 IMAGE_TAG=ads-schema-audit:v1 \
  DATABASE_URL='postgres://...' \
  ./service.backend/scripts/schema-audit-docker.sh > audit.json
```

## Output

- **stdout**: a JSON `AuditReport` (shape defined by the Zod schema in the script).
- **stderr**: a human-readable summary listing every drifted table and the specific column / index / enum drift.
- **exit code**:
  - `0` — no drift.
  - `1` — drift detected. The report on stdout lists every drifted table.
  - `2` — the script could not connect or introspection failed. stderr carries the error.

The script can be used as a pre-deploy gate:

```bash
schema-audit.ts && echo safe || echo drift
```

### Report shape (abridged)

```jsonc
{
  "generatedAt": "2026-05-09T12:34:56.789Z",
  "dialect": "postgres",
  "databaseName": "adopt_dont_shop_prod",
  "totalModels": 60,
  "totalTables": 61,        // 60 model tables + SequelizeMeta
  "driftedTables": 2,
  "tables": [
    { "table": "users", "modelName": "User", "status": "ok",
      "columns": [], "indexes": [], "enums": [] },
    { "table": "audit_logs", "modelName": "AuditLog", "status": "drift",
      "columns": [
        { "column": "session_id", "kind": "extra", "expected": null, "actual": "uuid" }
      ],
      "indexes": [], "enums": [] }
  ]
}
```

## Drift categories and what they mean for the rebaseline

The audit recognises five drift categories. Each maps to a different decision for the rebaseline.

| Category               | What it means                                                                                                  | Implication for the rebaseline                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing-table`        | Model registered but no table in DB.                                                                           | The pre-seed plan **cannot** include this baseline — it would mark a missing table as "applied" and `db:migrate` would skip the file that would have created it.            |
| `extra-table`          | Table in DB with no Sequelize model.                                                                           | Almost always benign (legacy table, unmanaged side-table). Flag for documentation; no rebaseline action needed. Verify it's not something a model used to declare.            |
| `column.missing`       | Model declares a column the live DB doesn't have.                                                              | The per-model baseline file would `createTable` with this column. If we pre-seed `SequelizeMeta`, the column never gets added. Adjust: ship a real migration to add it first. |
| `column.extra`         | Live DB has a column the model doesn't declare.                                                                | Pre-seed is still safe (the per-model file's `createTable` would have run successfully against this DB), but flag the column for cleanup tracking.                            |
| `column.type`          | Type mismatch (e.g. model says `STRING`, DB has `INTEGER`).                                                    | **Hard block.** The per-model baseline would have produced a different column. Pre-seeding lies. Investigate; either rebaseline the model to match the live type or write a forward migration to fix the live DB. |
| `column.nullable`      | Nullability mismatch (e.g. model declares `NOT NULL`, DB has `NULL`).                                          | Same as `column.type` — block. NULL acceptance differs between expected and live.                                                                                             |
| `index.missing`        | Model declares an index the live DB doesn't have.                                                              | The per-model file would have built the index. If we pre-seed, the index is permanently lost. Adjust: ship a real migration to add it.                                       |
| `index.extra`          | Live DB has an index the model doesn't declare.                                                                | Likely a hand-added emergency index (R5 in the design doc). Flag — either drop it after rebaseline or add it to the model. Rebaseline can proceed.                            |
| `enum.missing-values`  | Postgres ENUM has fewer values than the model declares.                                                        | Hard block — `INSERT` of the missing value would fail in production. Run an `ALTER TYPE … ADD VALUE` migration first.                                                         |
| `enum.extra-values`    | Postgres ENUM has more values than the model declares.                                                         | Pre-seed is safe (any insert from the application is still valid). Flag for cleanup.                                                                                          |

## Mapping to the design doc's open questions

The audit answers — or tightly bounds — most of the seven open questions in [`per-model-rebaseline.md` §5](./per-model-rebaseline.md#5-open-questions):

| #   | Question                                                            | What the audit tells you                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Production `SequelizeMeta` content (`.ts` vs `.js`)                 | **Not answered by the audit** — `SequelizeMeta` is excluded from drift detection (it's a sequelize-cli internal). Run `SELECT * FROM "SequelizeMeta"` separately. The audit confirms whether the rest of the prerequisite (matching schema) holds.                                |
| Q2  | Ad-hoc schema mods in prod                                          | **Directly answered.** Every ad-hoc mod that adds a column / index / enum value lands in the report as `extra-*`; every ad-hoc DROP shows up as `missing-*`. Run the audit against prod and compare with the dev report; differences are the ad-hoc mods.                            |
| Q3  | Who owns the migration runner in prod                               | Not a schema question; not addressed.                                                                                                                                                                                                                                                 |
| Q4  | Next maintenance window                                             | Not a schema question; not addressed.                                                                                                                                                                                                                                                 |
| Q5  | Option A (hand-write) vs Option B (pg_dump-derived)                 | **Indirectly answered.** If the audit shows zero drift, either option works. If it shows drift, Option A (hand-write what the model says) actively contradicts the live DB; Option B (dump the live DB) preserves it. The audit makes the trade-off concrete instead of theoretical. |
| Q6  | Models producing DDL Sequelize cannot represent natively (triggers) | **Partially answered.** The audit detects column / index / enum drift but does not introspect triggers, functions, or check-constraints. A `column.extra` is what you get when a non-Sequelize migration (e.g. 11-add-audit-log-immutable-trigger) leaves DDL behind — so the audit confirms whether the column-level state matches; trigger-level drift needs a separate `pg_dump --schema-only` diff. |
| Q7  | Should the rebaseline drop unused tables/columns                    | **Directly answered.** The audit's `extra-table` and `column.extra` categories enumerate every "unused" thing. Decide per-row whether it's actually dead or in flight in another consumer.                                                                                            |

## Operating procedure (recommended)

1. Run the audit against **dev** first. Expect zero drift. If non-zero, fix dev before touching staging.
2. Run the audit against **staging** with the production deployment workflow's schema applied. Compare with dev. Differences = what the rebaseline pre-seed would mis-state for staging.
3. Run the audit against **prod** during an existing maintenance window's read window. The report is the input to the §3 pre-seed go/no-go decision.
4. Save all three JSON reports (dev / staging / prod) as artefacts on the rebaseline tracking ticket. Reviewers compare the three to spot prod-only drift.

## Why this script and not `pg_dump`

`pg_dump --schema-only` produces a more thorough diff (it covers triggers, default expressions, check-constraints, sequences). The audit script is intentionally narrower:

- It runs against the actual model definitions, not against another DB. So "matches the models we ship today" is the assertion under test.
- It exits non-zero with a structured report — drop-in for CI / scripting.
- It can be exercised against the SQLite test DB so the test suite catches regressions in the audit logic itself.

For trigger / function / sequence drift, run `pg_dump --schema-only` against both the live DB and a freshly-synced reference DB and `diff` the (normalised) outputs. That's a complement to this script, not a replacement.
