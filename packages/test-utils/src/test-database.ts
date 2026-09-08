// withTestDatabase — real-Postgres integration test harness (ADS-1315).
//
// Service tests otherwise run entirely against mocks (fake pg.Pool, fake
// NATS), so SQL correctness and the events transactional-outbox seam are
// never exercised against a real database. This harness creates a
// throwaway schema, runs the owning service's own migrations against it
// (the same `runMigrations` used by `db:migrate` and by container boot —
// see @adopt-dont-shop/db), yields a real `pg.Pool` scoped to that schema,
// and drops the schema afterwards.
//
// Only runs when a real Postgres is reachable. Callers must guard their
// `describe` block with `describe.skipIf(!process.env.DATABASE_URL)` so the
// suite is visibly SKIPPED (not silently passed) when no database is
// configured — see docs/testing.md for the pattern and how to run these
// locally / in CI.
import { randomBytes } from 'node:crypto';

import { createDbClient, runMigrations, type DbClient } from '@adopt-dont-shop/db';
import { register as registerTsxLoader } from 'tsx/esm/api';

// node-pg-migrate dynamically loads each migration file by path. A plain
// self-contained `.ts` migration file loads fine under Node's own native
// TypeScript support with no help needed. But some real migrations (e.g.
// services/auth/src/migrations/027_encrypt_totp_secrets.ts) import a sibling
// module via its compiled `.js` specifier (the standard NodeNext-resolution
// pattern) — resolving that `.js` specifier back to the `.ts` source is a
// loader-hook feature `pnpm db:migrate` gets from running under `tsx`, not
// something Node's native TS support does on its own. `registerTsxLoader`
// opts a `withTestDatabase` call into the same tsx loader so those
// migrations behave identically under Vitest.
//
// Deliberately NOT the default: registering it unconditionally broke a
// migrations directory generated in-process by a test that also imports
// (directly or transitively) the same source file the migration re-exports
// from — tsx's loader turned that into a genuine `require(esm)`-in-a-cycle
// failure that doesn't happen under Node's native loader. Opt in only when
// the target migrations actually need it (see docs/testing.md).
let tsxLoaderRegistered = false;
function ensureTsxLoaderRegistered(): void {
  if (tsxLoaderRegistered) {
    return;
  }
  registerTsxLoader();
  tsxLoaderRegistered = true;
}

export type WithTestDatabaseOptions = {
  // Prefix for the throwaway schema name (e.g. the owning service or
  // package, "auth" / "events"). Combined with a random suffix so
  // concurrently-running test files never collide on the same schema —
  // unless `exactSchemaName` is set (see below).
  schemaPrefix: string;
  // Use `schemaPrefix` verbatim as the schema name instead of appending a
  // random suffix. Needed only when a service's committed migrations
  // reference their own schema by LITERAL name in raw SQL (`pgm.sql(...)`)
  // rather than through node-pg-migrate's schema-aware table helpers or an
  // unqualified identifier resolved via search_path — e.g.
  // services/auth/src/migrations/025_hash_refresh_tokens.ts runs
  // `UPDATE auth.refresh_tokens ...`, which only resolves against a schema
  // actually named "auth". Fixing that migration is not an option (CLAUDE.md:
  // never modify a shipped migration), so the harness accommodates it
  // instead. Callers that set this are responsible for not running two
  // suites against the same exact schema name concurrently — safe for the
  // common case of sequential `it` blocks within one test file.
  exactSchemaName?: boolean;
  // Absolute path to the migrations directory `runMigrations` should apply
  // — the same directory the service's own `db:migrate` script points at.
  migrationsDir: string;
  // Register tsx's module loader before running migrations — needed only
  // when a migration in `migrationsDir` imports a sibling module via a
  // `.js` specifier that resolves to a `.ts` file (see the module comment
  // above `ensureTsxLoaderRegistered`). Defaults to false; most services'
  // migrations don't need it.
  registerTsxLoader?: boolean;
  // Defaults to process.env.DATABASE_URL. Override for a test that needs a
  // different target (rare — most callers should rely on the env var so
  // ci.yml's `test-services` job needs no per-package wiring).
  databaseUrl?: string;
};

// Matches the schema-name convention used elsewhere (services/*, migrate.ts)
// — validated so a malformed prefix fails fast rather than producing SQL
// that silently does the wrong thing.
const SAFE_PREFIX = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Run `fn` against a real, migrated, throwaway Postgres schema, then drop it.
 *
 * @throws if DATABASE_URL is not set (directly or via `options.databaseUrl`)
 *   — callers should never reach this in CI because the describe block
 *   should already be skipped; this is a fail-fast guard for local misuse.
 */
export async function withTestDatabase<T>(
  options: WithTestDatabaseOptions,
  fn: (pool: DbClient) => Promise<T>
): Promise<T> {
  if (!SAFE_PREFIX.test(options.schemaPrefix)) {
    throw new Error(
      `withTestDatabase: invalid schemaPrefix "${options.schemaPrefix}" (must match ${SAFE_PREFIX})`
    );
  }

  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'withTestDatabase requires DATABASE_URL (directly, or via options.databaseUrl). ' +
        'Guard the calling describe block with describe.skipIf(!process.env.DATABASE_URL) ' +
        'so the suite is visibly skipped rather than reaching this error — see docs/testing.md.'
    );
  }

  if (options.registerTsxLoader) {
    ensureTsxLoaderRegistered();
  }

  const schema = options.exactSchemaName
    ? options.schemaPrefix
    : `${options.schemaPrefix}_test_${randomBytes(4).toString('hex')}`;

  await runMigrations({ databaseUrl, schema, migrationsDir: options.migrationsDir });

  const pool = createDbClient({ connectionString: databaseUrl, schema });

  try {
    return await fn(pool);
  } finally {
    // Best-effort cleanup — a failure to drop the throwaway schema must not
    // mask the test's own passing result or failure behind a teardown error.
    // CI Postgres containers are ephemeral anyway.
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    await pool.end();
  }
}
