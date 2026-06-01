---
name: db-migration
description: >
  Create a Sequelize migration for service.backend. Use when the user asks to add a
  column, table, index, enum value, or any schema change. Covers numbering,
  idempotency, transactions, and up/down symmetry.
disable-model-invocation: true
---

# Adding a Database Migration

Migrations live in `service.backend/src/migrations/` and run sequentially by filename.
NEVER modify an existing migration — create a new one.

## Current latest migration
!`ls /home/user/adopt-dont-shop/service.backend/src/migrations/ 2>/dev/null | grep -v "^_" | sort | tail -5`

## Step 1 — Pick the filename

Format: `<NN>-<kebab-case-summary>.ts` where `NN` is the next integer in the existing
series.

- Baseline migrations (`00-baseline-*`) are the per-model bootstrap — never add to
  this series.
- Increment from the highest numeric prefix. If the last is `10-migrate-quiz-data`,
  yours becomes `11-<your-change>`.
- Keep the summary short and descriptive: `09-add-allergies-to-adopter-match-profile.ts`,
  `06-add-audit-logs-login-failures-index.ts`.

## Step 2 — Use the helpers

`src/migrations/_helpers.ts` provides:

| Helper | Purpose |
|--------|---------|
| `runInTransaction(queryInterface, fn)` | Wraps the body in a transaction — required for multi-step DDL |
| `columnExists(queryInterface, table, col)` | Idempotency guard before `addColumn` |
| `dropEnumTypeIfExists(queryInterface, name)` | Cleanly drop a Postgres ENUM in `down` |
| `assertDestructiveDownAcknowledged()` | Guard for destructive `down` (data-loss) |

Idempotency matters because `00-baseline-*` migrations create the schema via
`sequelize.sync()` on a fresh DB, and the model definitions already include columns
declared in later migrations. Without an `if (columnExists)` guard, a fresh install
re-tries to add a column that's already there → migration failure.

## Step 3 — Write the migration

### Add a column

```typescript
// 11-add-favourite-colour-to-pets.ts
import { DataTypes, type QueryInterface } from 'sequelize';
import { columnExists, runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    if (await columnExists(queryInterface, 'pets', 'favourite_colour')) {
      return;
    }
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.addColumn(
        'pets',
        'favourite_colour',
        { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
        { transaction }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.removeColumn('pets', 'favourite_colour', { transaction });
    });
  },
};
```

### Add an index

```typescript
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.addIndex('audit_logs', ['user_id', 'action'], {
        name: 'idx_audit_logs_user_action',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_user_action', {
        transaction,
      });
    });
  },
};
```

### Add an ENUM value

Postgres ENUMs require a special path — `ALTER TYPE ... ADD VALUE` cannot run inside
a transaction.

```typescript
export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'NEW_VALUE'`
    );
  },

  down: async () => {
    // Postgres can't remove enum values cleanly.
    // Leave as a no-op or assertDestructiveDownAcknowledged().
  },
};
```

## Step 4 — Update the Sequelize model

If you added a column, the model in `src/models/<Model>.ts` must declare it too. Two
places to update:

1. The `XxxAttributes` interface
2. The `Xxx.init({...})` call

The model is the source of truth for `sequelize.sync()` (clean-DB bootstrap), so a
missing model declaration means a freshly synced dev DB won't have the new column.

## Step 5 — `down` symmetry

Every `up` must have a matching `down` that returns the schema to its prior state.
This is enforced by the migration runner in CI for non-destructive changes.

For destructive `down` (drops a column with data, drops a table) — use
`assertDestructiveDownAcknowledged()` so it only runs when explicitly approved via the
documented env var.

## Step 6 — Run and verify

```bash
# Inside the backend container
docker exec adopt-dont-shop-service-backend-1 npm run db:migrate

# Inspect the result
docker exec adopt-dont-shop-database-1 \
  psql -U adopt_user -d adopt_dont_shop_dev \
  -c "\d+ pets"

# Roll back to verify down
docker exec adopt-dont-shop-service-backend-1 npm run db:migrate:undo
```

For the local (non-Docker) path: `npm run db:migrate` from `service.backend/`.

## Step 7 — Add a migration test

`src/__tests__/migrations/` contains per-migration tests that exercise up + down
against a fresh DB. Match the style of an existing test for the same change shape.

## Conventions checklist

- [ ] Filename uses next integer prefix, kebab-case summary
- [ ] `columnExists()` guard on every `addColumn` (or equivalent for other ops)
- [ ] Body wrapped in `runInTransaction` (except ENUM ADD VALUE)
- [ ] `down` reverses `up` (or is acknowledged-destructive)
- [ ] Model file updated to match
- [ ] Brief JSDoc header explaining WHY the change (ticket ref, motivation)
- [ ] Migration test added

## Common mistakes

- Modifying an existing migration — never. Migrations are append-only history
- Skipping `columnExists` → migration fails on fresh DBs where `sync()` already added it
- Running ENUM `ADD VALUE` inside `runInTransaction` → Postgres rejects it
- Forgetting to update the model → fresh `sync()` skips the column
- `down` that destroys data without `assertDestructiveDownAcknowledged()`
- Adding a NOT NULL column without a default → fails on tables with existing rows.
  Use nullable + default in step 1, backfill in step 2, then tighten if needed.
