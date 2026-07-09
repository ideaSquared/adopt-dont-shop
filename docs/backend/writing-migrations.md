# Writing a database migration (backend)

Each microservice under `services/<name>/` owns its own slice of the schema
and its own migrations under `services/<name>/src/migrations/`. This guide
covers the current node-pg-migrate-based pattern used by every extracted
service. (`docs/backend/database-schema.md`'s "Create a new migration by
following the existing pattern" line points here.)

> The tool is **node-pg-migrate**, not `sequelize-cli` — the Sequelize
> monolith (`service.backend/`) that used it was removed. If you find a doc
> that mentions `sequelize.sync()`, `SequelizeMeta`, or `queryInterface`, it
> describes the deleted monolith; see the note in [Baseline
> pattern](#3-baseline-pattern) below for the one place that history still
> matters.

## 1. Numbering scheme

Migrations are numbered **per service**, starting at `001`, zero-padded to 3
digits, `snake_case` after the number:

```
services/auth/src/migrations/
  001_create_users.ts
  002_create_roles.ts
  003_create_permissions.ts
  ...
  024_hash_auth_tokens.ts
  025_hash_refresh_tokens.ts
```

The filename pattern is enforced by a test in every service's migration
directory (e.g. `services/auth/src/migrations/migrations.test.ts`):

```ts
const MIGRATION_FILENAME_PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;
// ...numbers migrations sequentially without gaps
```

node-pg-migrate scans the directory and runs files in **lexicographic**
order, which is why the number is zero-padded and sequential — a gap or an
out-of-order number doesn't break anything at runtime, but the test above
will fail your PR, and a gap usually means two branches picked the same
number and one needs renumbering on rebase.

To add a migration: pick the next number for **that service** (each service
has its own counter — `services/auth` being at `025` says nothing about
`services/pets`), and follow the shape of the most recent file in the same
directory.

## 2. Writing `up` and `down`

Every migration file exports `up` and `down` async functions taking a
node-pg-migrate `MigrationBuilder`:

```ts
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('refresh_tokens', {
    token_hash: { type: 'varchar(64)' },
  });
  pgm.createIndex('refresh_tokens', 'token_hash', {
    name: 'refresh_tokens_token_hash_uq',
    unique: true,
    where: 'token_hash IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('refresh_tokens', 'token_hash', { name: 'refresh_tokens_token_hash_uq' });
  pgm.dropColumns('refresh_tokens', ['token_hash']);
};
```

(Real example: `services/auth/src/migrations/025_hash_refresh_tokens.ts`.)

Conventions to follow, taken from the existing migrations in this repo:

- **Comment the "why", not the "what".** Every non-trivial migration in this
  repo opens with a comment explaining the problem it fixes and links the
  Linear ticket (e.g. `// ADS-884: store SHA-256 hashes of refresh tokens...`).
  The `up`/`down` bodies are usually self-explanatory from the `pgm.*` calls;
  the comment is for context a diff can't carry (why now, what broke, what
  the tradeoff was).
- **`down` should be the true inverse of `up`**, not a no-op, unless there's
  a specific reason it can't be (e.g. a backfill that can't be un-backfilled
  safely — comment that explicitly, see `023_drop_reset_token_force_flag.ts`
  or `012_reconcile_refresh_token_revocation.ts` for examples of documented
  irreversibility).
- **Never modify a migration that has already run anywhere** (including
  staging). Ship a new migration that corrects it instead — that's what
  `010_align_refresh_tokens_with_handlers.ts` → `012_reconcile_refresh_token_revocation.ts`
  did.
- **Backfills use `pgm.sql(...)`** for direct `UPDATE`/data-shape statements
  that don't have a first-class `pgm.*` builder method — see `025`'s
  `encode(sha256(token::bytea), 'hex')` backfill.
- **Two-phase destructive changes.** Dropping a column that's actively read
  is done in two migrations: one that adds the replacement and stops writing
  the old column (this PR), a follow-up migration that drops it once the new
  code has been live for a release cycle (gives you a rollback window). See
  `025_hash_refresh_tokens.ts`'s comment for a worked example — it explicitly
  defers dropping the raw `token` column.

### Testing your migration's `up` and `down` locally

There's no dedicated `db:migrate:undo` npm script yet — the shared runner
(`packages/db/src/migrate.ts`) hardcodes `direction: 'up'` because that's all
service boot needs. To exercise `down` locally, run node-pg-migrate's CLI
directly against the service's migration directory (each service already
depends on `node-pg-migrate` directly, so `pnpm exec` resolves it):

```bash
# From inside the service directory, e.g. services/auth
DATABASE_URL="$(pnpm --silent -e 'console.log(process.env.DATABASE_URL)')" \
  pnpm exec node-pg-migrate down -m src/migrations --schema auth -j ts --tsconfig tsconfig.json
```

In practice the simpler, more representative check is the full round trip
against the dev stack, which exercises `up` the same way every other
service's boot does:

```bash
pnpm docker:reset             # WIPES the dev DB — confirm you mean it
pnpm docker:dev:detach
docker compose exec service-auth pnpm db:migrate   # or let the container's own entrypoint do it on start
pnpm docker:shell:db           # open psql, inspect the resulting schema
```

If your migration needs a `down` you're not confident in, write a quick
throwaway test that calls `up(pgm)` then `down(pgm)` against a real
Postgres (see `packages/db/src/migrate.test.ts` for the harness pattern used
to test the runner itself) rather than trusting it untested — a `down` that
throws halfway through a rollback is worse than not having one.

## 3. Baseline pattern

The extracted services (`services/*`) do **not** use a "baseline via sync"
pattern — each service's `001_*.ts` just creates its own tables explicitly
with `pgm.createTable(...)`, the same as any other migration. There's no
`sync()`-generated baseline to keep in step with model files, because there
are no Sequelize models anymore.

[`docs/migrations/per-model-rebaseline.md`](../migrations/per-model-rebaseline.md)
describes a **different, historical** problem: the deleted `service.backend`
monolith's `00-baseline.ts` called `sequelize.sync()`, which silently
regenerated its baseline schema from whatever the Sequelize model files
looked like *at migration-run time* — a real footgun that motivated
per-model baseline files. None of that applies to the current node-pg-migrate
services; the doc is kept for historical context, not as a pattern to follow
here. If you're not touching `service.backend/` (it's deleted — you can't
be), you can ignore it.

## 4. Failure recovery (advisory locks, partial applies)

`packages/db/src/migrate.ts` wraps node-pg-migrate's `runner()` with retry
logic for one specific, expected failure:

- **Advisory lock contention.** node-pg-migrate takes a database-wide
  advisory lock around the `pgmigrations` bookkeeping table. When multiple
  services boot simultaneously against the same physical Postgres (normal on
  `pnpm docker:dev` cold boot — every service's container tries to migrate
  at once), the losers see `"Another migration is already running"`. The
  runner retries with linear backoff (`retryBackoffMs * attempt`, up to
  `maxRetries` — defaults 12 × 250ms base) before giving up. You don't need
  to do anything about this in a normal migration — it's handled for you.

- **A migration crashes mid-way.** node-pg-migrate runs each migration file
  in its own transaction by default, so a thrown error inside `up()` rolls
  back that file's changes — the `pgmigrations` table won't record it as
  applied, and re-running `db:migrate` retries it. This safety net breaks if
  your migration uses **non-transactional DDL** (e.g. `CREATE INDEX
  CONCURRENTLY`, which cannot run inside a transaction) — those need to be
  idempotent (`IF NOT EXISTS` / a guard query) so a re-run after a partial
  failure doesn't error on "already exists". If you write one, say so in the
  migration's comment.

- **Recovering a stuck advisory lock.** If a migrating container is killed
  hard (not a clean crash) the Postgres session holding the advisory lock
  can outlive the process until Postgres notices the dead connection.
  `pnpm docker:reset` (dev) rebuilds the DB from scratch and sidesteps this
  entirely; in staging/production, check `pg_locks` /
  `pg_stat_activity` for a stale session before assuming a real deadlock.

## 5. CI checks

[`.github/workflows/schema-equivalence.yml`](../../.github/workflows/schema-equivalence.yml)
is the safety net for migrations specifically (see also
[`docs/migrations/schema-equivalence-runbook.md`](../migrations/schema-equivalence-runbook.md),
which documents the monolith-era version of this same gate). Its current,
post-monolith form: for every microservice that owns a schema, the migration
runner must apply cleanly (`up`, every migration, in order) against a fresh
Postgres in CI. There's no Sequelize model layer left to compare against —
the check is simply "do the migrations run end-to-end without error." If you
break a migration (bad SQL, a missing dependency, a naming collision with
another service sharing the same physical Postgres instance), this is what
catches it.

The regular `test-services` CI job also runs each service's
`migrations.test.ts` file, which checks the filename convention and that
every migration exports `up`/`down` — see [Numbering
scheme](#1-numbering-scheme) above.
