# Schema Equivalence Runbook

The schema-equivalence gate is the per-model rebaseline's safety net (see [`per-model-rebaseline.md` §3.4](./per-model-rebaseline.md#34-verification-step)). It enforces a single invariant:

> A database bootstrapped via `sequelize-cli db:migrate` must be byte-equivalent (modulo documented asymmetries) to a database bootstrapped via `sequelize.sync()` against the same model code.

If the two diverge, then either:
- a per-model baseline file does not faithfully describe what `sync()` would produce, or
- a model has been edited but the per-model baseline that captures it was not updated, or
- a forward migration has changed the live schema in a way the models don't yet reflect.

In any of those cases, the next fresh-DB bootstrap will not match what the running service expects. The gate fails so it gets noticed before the divergence reaches production.

## How it runs

CI workflow: [`.github/workflows/schema-equivalence.yml`](../../.github/workflows/schema-equivalence.yml).

Triggers on **`pull_request`** events that touch any of:
- `service.backend/src/migrations/**`
- `service.backend/src/models/**`
- `service.backend/scripts/normalise-pg-dump.sh`
- `service.backend/scripts/schema-equivalence.sh`
- `.github/workflows/schema-equivalence.yml`

The job:

1. Spins up Postgres 15 as a service container.
2. Creates two empty databases: `schema_equiv_a`, `schema_equiv_b`.
3. Bootstraps **DB-A** via `npm run db:migrate` — runs every migration in `service.backend/src/migrations/` in order.
4. Bootstraps **DB-B** via a one-shot inline `sequelize.sync()` invocation that loads `src/models/index.ts` and calls `sync()` once.
5. Runs `pg_dump --schema-only --no-owner --no-privileges --exclude-table=SequelizeMeta` against both.
6. Pipes both dumps through [`normalise-pg-dump.sh`](../../service.backend/scripts/normalise-pg-dump.sh) — strips comments, blank lines, `SET` directives, sorts statements, drops known asymmetries.
7. `diff -u`s the normalised files. Empty diff → green. Non-empty → red.

Both dumps and the diff are uploaded as the `schema-equivalence-artifacts` workflow artifact (14-day retention) so a developer can inspect drift offline without re-running CI.

The job is intentionally **NOT** wired into the existing `ci.yml` matrix. It's a separate check that should be required-or-not at branch-protection level — keeping it out of `ci.yml` means the existing test suite isn't gated on Postgres spin-up + 2x bootstrap on every PR.

## Initial behaviour (before any per-domain PRs land)

The gate passes by construction:

- DB-A's `db:migrate` runs `00-baseline.ts`, whose `up()` body is `await sequelize.sync()`.
- DB-B's bootstrap is `await sequelize.sync()` against the same models.
- Identical code path → identical schema → empty diff.

As per-domain baseline PRs (e.g. `00a-baseline-users.ts`) land, DB-A's bootstrap shifts to explicit `queryInterface.createTable(...)` calls. The gate then has teeth: any drift between hand-written baseline files and what `sync()` produces will fail this check before merge.

## Documented asymmetries

The normaliser drops the following from both dumps so they don't surface as drift:

| Object                                                | Why it differs                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SequelizeMeta` table                                  | Created by `sequelize-cli` only. Present on DB-A, absent on DB-B. Already excluded at `pg_dump` time via `--exclude-table` and stripped again by the normaliser as belt-and-braces.                                              |
| `audit_logs_immutable` trigger                        | Installed only by [migration 11](../../service.backend/src/migrations/11-add-audit-log-immutable-trigger.ts). DB-A has it, DB-B does not, until/unless the trigger DDL moves into a per-domain baseline or a `sync()`-equivalent hook. |
| `audit_logs_reject_mutation` function                 | Same as above — created exclusively by migration 11.                                                                                                                                                                            |

If the rebaseline scope expands to fold migration 11's trigger into a per-domain baseline (or a model-side `afterSync` hook), remove the corresponding entry from `normalise-pg-dump.sh`'s `asym` list so the gate covers it again.

### Model-side hooks that DO emit DDL on both sides

These produce database objects under both bootstrap paths because they fire on `sync()`. They are SYMMETRIC and need no special handling:

- `installStatusTransitionTrigger` (`status-transitions.ts`) — `afterSync` hook on `*_status_transitions` models, installs an `AFTER INSERT` trigger that copies `to_status` onto the parent row.
- `installGeneratedSearchVector` (`generated-search-vector.ts`) — `afterSync` hook on `Pet` and `Message`, installs a `BEFORE INSERT/UPDATE` trigger that maintains `search_vector`.
- `installImmutableCreatedAtTriggers` (`immutable-created-at.ts`) — invoked from `src/index.ts` boot script, NOT an `afterSync` hook. Neither DB-A nor DB-B has it after their bootstrap step — symmetric, so nothing to filter.

If anyone adds a new model-side DDL helper that ONLY runs in one of the two bootstrap paths (e.g. a script invoked by `db:migrate` but not by `sync()`, or vice versa), document the asymmetry here and add it to `normalise-pg-dump.sh`.

## Running it locally

Two empty Postgres databases are required. The script will not create them — it expects the operator to provide reachable, empty targets so accidental wipes are impossible.

```bash
# 1. Create two empty DBs (any names work):
createdb schema_equiv_a
createdb schema_equiv_b

# 2. Run the gate. DATABASE_URL_MIGRATE bootstraps DB-A; DATABASE_URL_SYNC
#    bootstraps DB-B. Both are dumped, normalised, and diffed.
DATABASE_URL_MIGRATE='postgresql://postgres:postgres@localhost:5432/schema_equiv_a' \
DATABASE_URL_SYNC='postgresql://postgres:postgres@localhost:5432/schema_equiv_b' \
  ./service.backend/scripts/schema-equivalence.sh
```

Outputs land in `./schema-equivalence-out/` by default (override with `OUT_DIR`):

- `dump-a.sql`, `dump-b.sql` — raw `pg_dump --schema-only` output.
- `dump-a.normalised.sql`, `dump-b.normalised.sql` — post-normalisation, what the diff actually compares.
- `schema.diff` — the unified diff. Empty file = success.

Exit codes mirror CI:
- `0` — equivalent.
- `1` — drift. Diff in `schema.diff`.
- `2` — bootstrap or dump failed. stderr carries the error.

## What to do when it fails

The diff in `schema-equivalence-out/schema.diff` is the source of truth. Lines prefixed `-` are in DB-A (migrate path) and missing from DB-B (sync); lines prefixed `+` are the reverse.

Three possible root causes, in decreasing order of likelihood:

### 1. The per-model baseline file is wrong

A `00*-baseline-*.ts` file's `createTable` call doesn't match what the model would emit at `sync()`. Look for the drifted column / index / enum in the diff, find the matching baseline file, and fix the baseline to match the model.

This is the most common case during the rebaseline rollout — it's exactly the bug the gate exists to catch.

### 2. The model is wrong (and the baseline is right)

A model edit shipped without updating the baseline file, but the baseline is the intended target. In that case, fix the model definition to match the baseline.

This is rarer but more dangerous: it means the running service has been declaring a schema that disagrees with the per-domain baseline.

### 3. Drift is intended

The model genuinely changed and the new shape is what we want. The fix is a **post-baseline forward migration** that brings the existing-DB path in line with the new model. Then update the relevant per-domain baseline file too, so a fresh DB also gets the new shape directly without going through the forward migration.

Workflow:
1. Add a new file `service.backend/src/migrations/NN-<descriptive>.ts` that brings the live schema in line with the new model (the standard `up`/`down` pattern from existing migrations applies).
2. Update the per-domain baseline file so a fresh `db:migrate` produces the new shape directly.
3. Re-run the gate locally; verify empty diff.

## Why not extend `schema-audit.ts` for this?

`scripts/schema-audit.ts` compares **models against a live DB**. The schema-equivalence gate compares **two live DBs against each other**. They share the goal of "no schema surprises" but answer different questions:

- `schema-audit.ts` answers: "does this DB match what the models declare?"
- `schema-equivalence.sh` answers: "do these two bootstrap paths produce the same DB?"

Both are useful at different points in the rebaseline lifecycle — the audit script gates the `SequelizeMeta` pre-seed step (does prod's actual schema match what the per-model files claim?), while the equivalence gate keeps the per-model files honest going forward.

`pg_dump --schema-only` + diff is the right tool for the equivalence question because it covers triggers, default expressions, sequences, and check constraints — areas the model-introspection-based audit explicitly does not cover. The trade-off is that pg_dump output is verbose and version-sensitive, hence the normaliser.
