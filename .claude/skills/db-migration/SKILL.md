---
name: db-migration
description: >
  Create a node-pg-migrate migration in a schema-owning service. Use when
  the user asks to add a column, table, index, enum value, or any schema
  change. Covers naming, idempotency, up/down symmetry, and where the
  migration runs.
disable-model-invocation: true
---

# Adding a Database Migration

Each schema-owning service ships its own migrations under
`services/<name>/src/migrations/` and runs them on container boot via
`node-pg-migrate` wrapped by `@adopt-dont-shop/db` (entry point:
`services/<name>/src/db/migrate.ts`). The runner records applied
migrations in a `pgmigrations` table inside that service's owning
Postgres schema (one per service: `auth`, `pets`, `rescue`,
`applications`, `chat`, `notifications`, `moderation`, `matching`,
`cms`, `audit`). There is no `sequelize-cli`, no Umzug, and no
`SequelizeMeta` table — those describe the deleted monolith.

**NEVER modify an existing migration.** Migrations are append-only
history.

## Step 1 — Pick the right service

Migrations live in the schema-owning service. If you're adding a
column to `pets.pets`, the migration goes in
`services/pets/src/migrations/`. Schema ownership:

| Service                | Schema                          |
|------------------------|---------------------------------|
| `services/auth/`       | `auth.*`                        |
| `services/pets/`       | `pets.*`                        |
| `services/rescue/`     | `rescue.*`                      |
| `services/applications/` | `applications.*`              |
| `services/chat/`       | `chat.*`                        |
| `services/notifications/` | `notifications.*`            |
| `services/moderation/` | `moderation.*`                  |
| `services/matching/`   | `matching.*`                    |
| `services/cms/`        | `cms.*`                         |
| `services/audit/`      | `audit.*`                       |

## Step 2 — Pick the filename

Format: `<NNN>_<snake_case_summary>.ts` where `<NNN>` is the next
zero-padded integer after the highest existing prefix in that
service's migrations directory. `node-pg-migrate` orders by filename,
so the prefix is load-bearing.

Examples:
- `007_pets_list_keyset_index.ts`
- `012_add_favourite_colour_to_pets.ts`

## Step 3 — Write the migration

Migrations export `up` and `down` functions that take a
`MigrationBuilder`. `node-pg-migrate` already wraps each migration
in a transaction by default — don't add another one yourself.

### Add a column

```typescript
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('pets', {
    favourite_colour: { type: 'varchar(50)', notNull: false, default: null },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('pets', 'favourite_colour');
};
```

### Add an index

```typescript
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('audit_logs', ['user_id', 'action'], {
    name: 'audit_logs_user_action_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('audit_logs', ['user_id', 'action'], {
    name: 'audit_logs_user_action_idx',
  });
};
```

### Add an ENUM value

Postgres ENUMs require `ALTER TYPE ... ADD VALUE`, which cannot run
inside a transaction. Tell `node-pg-migrate` to skip the transaction
wrapper by exporting `shorthands` / using raw SQL with `IF NOT EXISTS`.

```typescript
import type { MigrationBuilder } from 'node-pg-migrate';

// Run outside a transaction — required for ADD VALUE.
export const shorthands = undefined;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `ALTER TYPE "notifications"."notification_type" ADD VALUE IF NOT EXISTS 'NEW_VALUE'`,
  );
};

export const down = async (): Promise<void> => {
  // Postgres can't cleanly remove an enum value. Leave as a no-op
  // unless you've planned a full table-rewrite path.
};
```

### Create a table

Use schema-qualified names where ambiguity matters; `@adopt-dont-shop/db`
sets `search_path` to the service's schema, so unqualified table names
also work for the owning service. Postgres extensions belong in
`public` and need `CREATE EXTENSION IF NOT EXISTS` if not already
present.

```typescript
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('things', {
    thing_id: { type: 'uuid', primaryKey: true },
    name: { type: 'varchar(128)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('things', 'name', { name: 'things_name_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('things');
};
```

## Step 4 — `down` symmetry

Every `up` must have a matching `down` that returns the schema to its
prior state. The migration test suite (see Step 6) enforces this.

There is **no `pnpm db:migrate:undo` script** — the runner is
`up`-only. `down` is exercised by the test suite and is the canonical
recipe for the corrective migration you'd write to reverse a forward
change in production. See [`docs/runbooks/migration-failure.md`](../../../docs/runbooks/migration-failure.md)
for the operational recovery sequence.

## Step 5 — Update the gRPC handlers

There is no ORM. The service's gRPC handlers in
`services/<name>/src/grpc/` read/write the new schema via direct
parameterised SQL using the connection from `@adopt-dont-shop/db`.
Update those queries to use the new column / table.

## Step 6 — Run and verify

```bash
# Restart the owning service — its boot CMD runs db:migrate.
docker compose restart service-pets

# Or run db:migrate by hand (the runner is idempotent).
docker compose exec service-pets pnpm db:migrate

# Inspect the result.
docker compose exec database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c '\d+ pets.pets'

# Confirm the migration is recorded.
docker compose exec database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT name FROM pets.pgmigrations ORDER BY id DESC LIMIT 5;'
```

## Step 7 — Add a migration test

Each schema-owning service has a `services/<name>/src/migrations/migrations.test.ts`
that loops over every migration up + down and asserts the schema state.
If you've added a new migration, the existing test usually covers it
automatically — read the test header to confirm. For unusual migrations
(e.g. data backfills) add a dedicated assertion.

## Conventions checklist

- [ ] Filename uses next zero-padded prefix + `snake_case_summary`
- [ ] `up` + `down` both implemented (or `down` deliberately a no-op
      for unrecoverable ENUM ADD VALUE)
- [ ] gRPC handlers updated to use the new column / table
- [ ] Migration test in the service's `migrations.test.ts` still passes
- [ ] Brief comment header explaining WHY the change (ticket ref,
      motivation)

## Common mistakes

- Modifying an existing migration — never. They're append-only.
- Wrapping the body in a transaction — `node-pg-migrate` already does
  this by default; nesting can break.
- Trying to run `ALTER TYPE ... ADD VALUE` inside the default
  transaction — Postgres rejects it. Use `pgm.sql(...)` with
  `IF NOT EXISTS` and let the runner pick up the no-transaction hint.
- Reaching for `pnpm db:migrate:undo` — the script doesn't exist. To
  reverse a forward change, author a new migration that performs the
  reverse DDL.
- Adding a `NOT NULL` column without a default → fails on tables with
  existing rows. Use nullable + default in step 1, backfill in step 2,
  tighten in step 3.
- Putting the migration in the wrong service — the runner only sees
  files under `services/<name>/src/migrations/`, so a misplaced
  migration silently never runs.
