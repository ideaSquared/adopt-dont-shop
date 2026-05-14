/**
 * Shared helpers for migrations. Applies the patterns audited in:
 *
 *   ADS-402 — index ops on hot tables must use `CREATE INDEX CONCURRENTLY`
 *             so they don't take a ShareLock and block reads/writes for
 *             the duration of the build.
 *   ADS-403 — every multi-step migration must run inside a transaction so
 *             a partial failure doesn't leave the schema half-applied.
 *
 * Important Postgres constraint: `CREATE INDEX CONCURRENTLY` cannot run
 * inside a transaction. Practical migration shape is therefore:
 *
 *   await runInTransaction(qi, async t => {
 *     // DDL that needs atomicity (createTable, addColumn, addConstraint)
 *   });
 *   // Index builds AFTER the transaction commits.
 *   await createIndexConcurrently(qi, '...');
 */
import type { QueryInterface, Sequelize, Transaction } from 'sequelize';

/**
 * Wrap a migration body in a transaction. The callback receives the active
 * Transaction so it can be passed to QueryInterface methods via the
 * `{ transaction: t }` option.
 */
export async function runInTransaction<T>(
  queryInterface: QueryInterface,
  fn: (t: Transaction) => Promise<T>
): Promise<T> {
  return queryInterface.sequelize.transaction(async t => fn(t));
}

type ConcurrentIndexOptions = {
  /** Index name. Required so it's visible in pg_indexes for later removal. */
  name: string;
  /** Table to index. */
  table: string;
  /** Columns / expressions, e.g. ['rescue_id', 'status'] or ["lower(email)"]. */
  columns: ReadonlyArray<string>;
  /** Add UNIQUE before INDEX. */
  unique?: boolean;
  /** Optional partial-index predicate, e.g. "deleted_at IS NULL". */
  where?: string;
};

/**
 * Build an index without taking a ShareLock on the table. Required for any
 * index op against a populated production table — the standard
 * `CREATE INDEX` (and Sequelize's `queryInterface.addIndex`) holds a
 * ShareLock that blocks all writes for the duration of the build.
 *
 * Caller MUST invoke this OUTSIDE a transaction. Postgres rejects
 * `CREATE INDEX CONCURRENTLY` inside a transaction block.
 */
export async function createIndexConcurrently(
  sequelize: Sequelize,
  options: ConcurrentIndexOptions
): Promise<void> {
  const unique = options.unique ? 'UNIQUE ' : '';
  const cols = options.columns.join(', ');
  const where = options.where ? ` WHERE ${options.where}` : '';
  await sequelize.query(
    `CREATE ${unique}INDEX CONCURRENTLY IF NOT EXISTS "${options.name}" ` +
      `ON "${options.table}" (${cols})${where}`
  );
}

/**
 * Drop an index without ShareLock. Mirror of createIndexConcurrently — also
 * must be invoked outside a transaction.
 */
export async function dropIndexConcurrently(sequelize: Sequelize, name: string): Promise<void> {
  await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}"`);
}

/**
 * Drop a Postgres ENUM type if it exists. Required in migration `down()`
 * methods that drop tables which were the only consumers of the enum;
 * otherwise the type is orphaned and leaks into pg_type indefinitely.
 *
 * ADS-503. Cannot be undone for `ALTER TYPE ... ADD VALUE` (Postgres has
 * no DROP VALUE), so document that limitation in the migration when it
 * applies.
 */
export async function dropEnumTypeIfExists(sequelize: Sequelize, enumName: string): Promise<void> {
  await sequelize.query(`DROP TYPE IF EXISTS "${enumName}"`);
}

/**
 * Guard for `down` migrations that drop columns or other state which
 * cannot be reconstructed from what remains in the table.
 *
 * Operators must opt in by setting `MIGRATION_ALLOW_DESTRUCTIVE_DOWN=1`
 * AND naming the migration in `MIGRATION_DESTRUCTIVE_DOWN_KEY`. The two
 * separate vars stop a stale env-flag from greenlighting the wrong
 * rollback when several migrations in flight have destructive downs.
 *
 * ADS-440. Companion to `runInTransaction` — never replaces the need to
 * take a backup before running a destructive rollback in production.
 */
export function assertDestructiveDownAcknowledged(migrationKey: string): void {
  const allowed = process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN === '1';
  const keyMatches = process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY === migrationKey;
  if (!allowed || !keyMatches) {
    throw new Error(
      `Refusing to run destructive down() for ${migrationKey}. This rollback ` +
        'permanently drops backfilled data. Take a database backup, then set ' +
        `MIGRATION_ALLOW_DESTRUCTIVE_DOWN=1 and MIGRATION_DESTRUCTIVE_DOWN_KEY=${migrationKey} ` +
        'before re-running.'
    );
  }
}

/**
 * Phantom no-op default export. sequelize-cli 6.x's umzug adapter pattern is
 * `/^(?!.*\.d\.ts$).*\.(cjs|js|cts|ts)$/` — it picks up EVERY `.ts` file in
 * the migrations directory (including this helper) and tries to call its
 * `up` method. Without these no-ops `db:migrate` errors with "Could not find
 * migration method: up" the moment it iterates here.
 *
 * The helpers above remain importable via named exports; the default below
 * just keeps sequelize-cli happy. SequelizeMeta records `_helpers.ts` once,
 * so subsequent runs skip it without firing the no-op again.
 */
export default {
  up: async (): Promise<void> => undefined,
  down: async (): Promise<void> => undefined,
};
