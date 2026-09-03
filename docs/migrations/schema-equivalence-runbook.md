# Schema Equivalence Runbook

What the Schema Equivalence CI gate checks, when it runs, and what to do when it fails (audience: engineers whose PR the gate blocks). The gate is [`.github/workflows/schema-equivalence.yml`](../../.github/workflows/schema-equivalence.yml).

## What the gate asserts

The original gate compared the monolith's Sequelize models against migration output. With the Sequelize layer gone, the post-monolith gate asserts a simpler invariant:

> For every microservice that owns a schema, its migration runner applies **cleanly against a fresh Postgres**.

If anyone breaks a migration — bad SQL, a missing dependency, or a prefix collision across services that share the one database — the gate fails. There is no `sequelize.sync()`, no `SequelizeMeta`, and no `src/models/` comparison anymore.

## When it runs

- **Triggers:** every `push` and `pull_request` on `main` / `develop`, plus `workflow_dispatch`. The workflow triggers unconditionally so the required check `Schema Equivalence (migrate vs sync)` always reports a status (a required check whose workflow is filtered out at the trigger level sits at "Expected — waiting for status" forever).
- **Cost gating lives in the `changes` job, not the triggers.** `changes` (dorny/paths-filter) sets `migrations=true` only when migration-relevant paths change: `services/*/src/migrations/**`, `services/*/src/db/**`, `packages/{db,observability,events}/**`, `pnpm-lock.yaml`, or the workflow file itself.
- The expensive `schema-equivalence-compute` job runs only when `migrations == 'true'` **or** the run is a manual `workflow_dispatch`. On unrelated PRs it is skipped.
- The lightweight `schema-equivalence-migrate-vs-sync` job (`if: always()`) is the required check — it passes when `compute` is skipped and fails if change-detection itself failed. The job names are preserved for the branch-protection ruleset.

## How `compute` works

1. Spins up Postgres 16 + PostGIS (`postgis/postgis:16-3.4`) as a service container with a fresh `ci` database.
2. Builds the shared libraries and `packages/{observability,db,events}` (each service's `migrate.ts` imports `@adopt-dont-shop/db` + `@adopt-dont-shop/observability`).
3. Loops over every schema-owning service — `auth notifications pets rescue applications chat moderation matching cms audit` — running `cd services/<svc> && pnpm db:migrate` against the fresh DB, inside a `::group::services/<svc> db:migrate` log group.
4. Collects failures and exits non-zero if any service's migrations failed, printing `::error::Migration failures: <list>`.

Dummy `JWT_SECRET` / `JWT_REFRESH_SECRET` / `ENCRYPTION_KEY` values are set only to satisfy each service's `loadConfig()` on the migrate path — migrations never read them.

## What to do when it fails

1. Open the failed run and expand the `::group::services/<svc> db:migrate` group for the service named in the `::error::Migration failures:` line. The error is the raw `node-pg-migrate` output for the offending migration.
2. Reproduce locally against a throwaway Postgres:

   ```bash
   docker run --rm -d --name equiv-pg -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ci -p 5432:5432 postgis/postgis:16-3.4
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ci \
     bash -c 'cd services/<svc> && pnpm db:migrate'
   ```

   Expected on success: each migration prints `> Migrating files:` / `### MIGRATION … (up)` and the run exits 0.

3. Fix forward — add or correct a migration in `services/<svc>/src/migrations/` (never edit a shipped migration; see [writing-migrations.md](../backend/writing-migrations.md)). Common causes: invalid SQL, a migration depending on an object another service owns (no cross-schema FKs), or a table/type name that collides with another service in the shared database.
4. Push the fix; the gate re-runs on the PR.

If change-detection (`changes`) itself failed, that is a CI-infra failure, not a migration problem — the gate surfaces it rather than passing silently.
