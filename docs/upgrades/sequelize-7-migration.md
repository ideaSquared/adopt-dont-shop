# Sequelize 6 → Sequelize 7 Migration Plan

**Linear**: ADS-531 (this document covers the Sequelize portion)
**Status**: Not started — planning only
**Recommended quarter**: After Sequelize 7 ships a stable (non-alpha) tag and
`sequelize-typescript` (or our chosen replacement) catches up. **Do not start
until that's true.**

> Sequelize 7 has been in alpha for an extended period. It rewrites a large
> part of the internals (TypeScript-first decorators, new model-definition
> API, separate dialect packages, stricter typing for raw queries). At audit
> time `sequelize@7` is published as `7.0.0-alpha.x`. We should plan now and
> execute after a stable release.

## 1. Current state

Sequelize is used **only in `service.backend`**:

```bash
grep -rlE "from ['\"]sequelize['\"]" service.backend/src lib.*/src   # 120 hits, all in service.backend
```

Pinned versions:

```
"sequelize":            "^6.31.0"
"sequelize-typescript": "^2.1.5"     # used as a dep but not via decorators
"@types/sequelize":     "^4.28.20"   # vestigial — Sequelize 6 ships its own types
"sequelize-cli":        "^6.6.0"
"pg":                   "^8.11.0"
"pg-hstore":            "^2.3.4"
```

Surface area:

| Layer | File count |
| --- | --- |
| Models | 66 |
| Migrations | 10 (sequential `00`–`09`) |
| Seeders | 53 |
| Files importing `sequelize` | 120 |
| `sequelize.query(...)` raw queries | 76 occurrences |
| `sequelize.transaction()` blocks | 38 occurrences |
| `Op.in/Op.like/Op.or/Op.and/...` uses | 138 occurrences |
| `DataTypes.{JSON,JSONB,VIRTUAL,ENUM}` columns | 96 occurrences |

Notably we do **not** use `sequelize-typescript` decorators (`@Table`,
`@Column`) — `grep` for those returns zero. The dependency is dead weight
and could be removed today (file as separate cleanup ticket; out of scope
here).

## 2. Breaking changes

References:
- Sequelize 7 alpha changelog — <https://github.com/sequelize/sequelize/releases?q=v7&expanded=true>
- Migration guide (in-progress) — <https://sequelize.org/docs/v7/other-topics/upgrade/>
- Dialect-package split RFC — <https://github.com/sequelize/sequelize/issues/14393>

| Change | Risk for us | Notes |
| --- | --- | --- |
| **Dialect packages split** — `pg` is no longer a peer-dep auto-pick; install `@sequelize/postgres` | **Medium** | Requires deps update + import-site change in DB init. |
| **`Model.init(attrs, options)` static API replaced/augmented by decorator-based definition** | **Medium** | Existing `Model.init` calls keep working in 7.x but are deprecated. We have 66 model files using `Model.init`. |
| **`DataTypes` import path** | Low | Still exported from main package; no change required. |
| **`Op` symbols** | Low | Still exported; no change. |
| **Raw query result shape** — `QueryTypes.SELECT` returns rows directly (already true in v6 with `type:`); typed via generics now | Low | We already pass `type: QueryTypes.SELECT` and use generics (`sequelize.query<CountResult>(...)`). |
| **Transactions** — explicit `transaction.commit()` semantics tightened; managed transactions encouraged | Low | We use managed transactions (`sequelize.transaction(async (t) => {...})`). |
| **Eager-loaded includes** — `nest: true` interactions with through-tables changed | Medium | Spot-check every `findAll({ include: [...] })` site. |
| **`paranoid` model option** behaviour around forced deletes refined | Low | Limited use; verify per-model. |
| **`getterMethods` / `setterMethods`** removed in favour of decorators / class get/set | Medium | Audit `model/*.ts` for any use; `grep -rE "getterMethods|setterMethods"` reports 0 — we are clean. |
| **`@types/sequelize` is incompatible** | None | We can drop it — Sequelize 7 ships first-class types. |
| **CLI** — `sequelize-cli` still works against v7 but is deprecated; the team recommends `umzug` directly | **Medium-long-term** | Decide whether to migrate migrations to umzug (separate ticket) or stay on `sequelize-cli` while it works. |
| **`dialectOptions` shape** | Low | Verify our PG-specific `ssl` / `decimalNumbers` config still applies. |
| **Hooks signatures** | Low | We use `beforeCreate` / `beforeUpdate` sparingly; verify each. |

## 3. Risk inventory

### 3.1 Database init (single hot file)

`service.backend/src/sequelize.ts` (or wherever `new Sequelize(...)` lives)
is the one place that imports the dialect. After upgrade:

```ts
// Before (v6)
import { Sequelize } from 'sequelize';
// After (v7)
import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

new Sequelize({ dialect: PostgresDialect, /* ... */ });
```

Verify the actual init file in this repo before the upgrade
(`grep -rln "new Sequelize" service.backend/src`).

### 3.2 66 model files

Every file in `service.backend/src/models/` calls `Model.init(...)`. The good
news: `Model.init` still works in v7. We don't have to convert to decorators
in the same PR. Plan: bump first, defer decorator migration to follow-ups.

### 3.3 76 raw queries

```bash
grep -rnE "sequelize\.query" service.backend/src
```

These need:
- Confirmed `type: QueryTypes.SELECT` (or appropriate) — typed result is the
  caller's responsibility in v7.
- Re-typed generic where currently it's `<any>` (we should already be `any`-free
  per project rules).

### 3.4 Eager-loading (`include`)

Spot-check every `findAll({ include })` and `findOne({ include })` for
through-table behaviour changes. There are dozens — file a sub-issue per
model area.

### 3.5 38 transaction blocks

Behaviour changes are minor but worth re-running. The managed-transaction
pattern we use is the recommended one.

### 3.6 Migrations

Migrations import sequelize types directly. The 10 migrations in
`service.backend/src/migrations/` will need a one-line type-import update
each — `QueryInterface` is now exported from `@sequelize/core`.

### 3.7 Seeders

53 seeders use `QueryInterface.bulkInsert(...)`. Same import-path adjustment.

### 3.8 `sequelize-typescript` removal

Currently a dep but not actively used. Remove in a separate PR before the
v7 migration to reduce noise.

### 3.9 `@types/sequelize` removal

Dead weight (Sequelize 6 already ships its own types). Drop in same PR as
the bump or as cleanup.

## 4. Migration path

**Stage 0 — Wait:** Do not start until `sequelize@7` ships a stable
(non-alpha) version and `@sequelize/postgres` is published as stable.

**Stage 1 — Preparatory (can happen now):**

1. Drop unused `sequelize-typescript` (separate PR, cleanup).
2. Drop unused `@types/sequelize` (separate PR, cleanup).
3. Add a thin abstraction around `new Sequelize(...)` if not present, so
   only one file changes its dialect import at upgrade time.
4. Add a regression test for one representative `findAll({ include })`
   path per model area to give us a tripwire.

**Stage 2 — The bump:**

5. Update deps in `service.backend/package.json`:
   ```
   "@sequelize/core":     "^7.x"
   "@sequelize/postgres": "^7.x"
   # remove "sequelize"
   ```
6. Update the single dialect-init site.
7. Update import paths across models, migrations, seeders. This is mostly
   `from 'sequelize'` → `from '@sequelize/core'`. Use a codemod or scripted
   `sed` (verify each diff).
8. Run the test suite. Fix typing drift.
9. Run all migrations against a fresh DB (`npm run db:reset`); verify
   migration UP succeeds.
10. Run a sample of seeders; verify they still produce the expected rows.

**Stage 3 — Optional follow-ups:**

11. Migrate models to decorator-based class definitions (large but mechanical).
12. Migrate migrations from `sequelize-cli` to `umzug` programmatic API.

## 5. Effort estimate

- Stage 1 prep: **1 dev-day**.
- Stage 2 bump + fix: **5 dev-days** (this is the big one — 66 models + 53
  seeders + 10 migrations + integration testing).
- Stage 3 decorator migration: **5–10 dev-days** (deferrable).

**Total: ~6 dev-days for the v7 bump, ~12+ if we also do decorator
migration in the same window.**

## 6. Test / rollback plan

**Tests:**

- Full backend Vitest suite + integration tests against a real Postgres
  (Docker compose).
- `npm run db:reset` end-to-end.
- Manual exercise of every model area against the staging DB.

**Rollback:**

- The bump is confined to `service.backend`. A revert PR is sufficient
  unless decorator migration was also landed in the same PR (don't do that).
- **Critical**: do not run any new migrations during the bump PR. The bump
  itself must not change schema. If schema changes are needed (e.g. dropping
  `sequelize-typescript`-specific columns), file separately.

## 7. Prerequisites

- **Node 22 migration (ADS-532)** strongly recommended first for fresh V8.
- **Express 5 migration** is independent — order does not matter.
- A green `db:reset` in CI before starting (so we know the baseline is good).
- Stable Sequelize 7 release available on npm.

## 8. Linear follow-up sub-issues to file (titles only)

- `[Deps][Sequelize 7] Cleanup: remove unused sequelize-typescript dependency`
- `[Deps][Sequelize 7] Cleanup: remove redundant @types/sequelize`
- `[Deps][Sequelize 7] Add abstraction for Sequelize init so dialect change touches one file`
- `[Deps][Sequelize 7] Add include/eager-load regression tests per model area`
- `[Deps][Sequelize 7] Bump core + add @sequelize/postgres + update import paths`
- `[Deps][Sequelize 7] Update migrations to use @sequelize/core types`
- `[Deps][Sequelize 7] Update seeders to use @sequelize/core types`
- `[Deps][Sequelize 7] (Optional) Migrate models to decorator-based definition`
- `[Deps][Sequelize 7] (Optional) Replace sequelize-cli with umzug programmatic API`
