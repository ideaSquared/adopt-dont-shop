/**
 * Round-trip tests for the per-model baseline migrations covering the
 * platform domain (rebaseline 10/10):
 *
 *   00-baseline-058-audit-logs
 *   00-baseline-059-idempotency-keys
 *   00-baseline-060-cms-content
 *   00-baseline-061-cms-navigation-menus
 *
 * Pattern: capture the canonical column / index set from `sync()`, drop
 * the table, run `up()`, assert the table is rebuilt with the same
 * columns and indexes. Then run `down()` (with the destructive-down env
 * flag) and assert the table is gone.
 *
 * Postgres-only — Sequelize ENUMs and JSONB columns have no SQLite
 * equivalent.
 *
 * Bonus: a dedicated test verifies the audit_logs baseline DOES NOT
 * install the immutability trigger from migration 11. The trigger lives
 * in its post-baseline migration and the boundary should be visible to
 * reviewers.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline058 from '../../migrations/00-baseline-058-audit-logs';
import baseline059 from '../../migrations/00-baseline-059-idempotency-keys';
import baseline060 from '../../migrations/00-baseline-060-cms-content';
import baseline061 from '../../migrations/00-baseline-061-cms-navigation-menus';

void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

type ColumnRow = { column_name: string };
type IndexRow = { indexname: string };
type TriggerRow = { trigger_name: string };

const tableExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const listColumns = async (table: string): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = '${table}'
       ORDER BY column_name`
  );
  return (rows as ColumnRow[]).map(r => r.column_name);
};

const listIndexes = async (table: string): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT indexname FROM pg_indexes
       WHERE tablename = '${table}'
       ORDER BY indexname`
  );
  return (rows as IndexRow[]).map(r => r.indexname);
};

const listTriggers = async (table: string): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT trigger_name FROM information_schema.triggers
       WHERE event_object_table = '${table}'
       ORDER BY trigger_name`
  );
  return (rows as TriggerRow[]).map(r => r.trigger_name);
};

type Migration = {
  up: (qi: typeof queryInterface) => Promise<void>;
  down: (qi: typeof queryInterface) => Promise<void>;
};

type Case = {
  name: string;
  table: string;
  destructiveKey: string;
  migration: Migration;
};

const CASES: ReadonlyArray<Case> = [
  {
    name: '058 — audit_logs',
    table: 'audit_logs',
    destructiveKey: '00-baseline-058-audit-logs',
    migration: baseline058,
  },
  {
    name: '059 — idempotency_keys',
    table: 'idempotency_keys',
    destructiveKey: '00-baseline-059-idempotency-keys',
    migration: baseline059,
  },
  {
    name: '060 — cms_content',
    table: 'cms_content',
    destructiveKey: '00-baseline-060-cms-content',
    migration: baseline060,
  },
  {
    name: '061 — cms_navigation_menus',
    table: 'cms_navigation_menus',
    destructiveKey: '00-baseline-061-cms-navigation-menus',
    migration: baseline061,
  },
];

describeIfPostgres('per-model baseline — platform (rebaseline 10/10)', () => {
  // Snapshot the env vars we mutate so we restore them between tests and
  // never leak into other test files.
  const originalAllow = process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  const originalKey = process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = originalAllow;
    process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = originalKey;
    await sequelize.close();
  });

  beforeEach(async () => {
    // Each test starts from a freshly-synced schema so dropTable in one
    // test cannot stomp another's setup.
    await sequelize.sync({ force: true });
  });

  afterEach(() => {
    process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = originalAllow;
    process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = originalKey;
  });

  describe.each(CASES)('$name', ({ table, destructiveKey, migration }) => {
    it('up() recreates the table with the same columns sync() produces', async () => {
      const expectedColumns = await listColumns(table);
      expect(expectedColumns.length).toBeGreaterThan(0);

      await queryInterface.dropTable(table);
      expect(await tableExists(table)).toBe(false);

      await migration.up(queryInterface);

      expect(await tableExists(table)).toBe(true);
      const actualColumns = await listColumns(table);
      expect(actualColumns).toEqual(expectedColumns);
    });

    it('up() recreates the indexes sync() produces', async () => {
      const expectedIndexes = await listIndexes(table);

      await queryInterface.dropTable(table);
      await migration.up(queryInterface);

      const actualIndexes = await listIndexes(table);
      // Compare as sets — sync()'s anonymous index naming order can drift
      // from queryInterface.addIndex's, but the set of indexes must match.
      expect(new Set(actualIndexes)).toEqual(new Set(expectedIndexes));
    });

    it('down() refuses to drop the table without the destructive-down env flags', async () => {
      delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
      delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;

      await expect(migration.down(queryInterface)).rejects.toThrow(/destructive down/);
      expect(await tableExists(table)).toBe(true);
    });

    it('down() drops the table when the destructive-down env flags acknowledge it', async () => {
      process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
      process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = destructiveKey;

      await migration.down(queryInterface);

      expect(await tableExists(table)).toBe(false);
    });
  });

  describe('audit_logs immutability trigger boundary', () => {
    // Documents the design boundary: triggers cannot be expressed in
    // Sequelize's createTable, so they live in their post-baseline
    // migration. A reviewer skimming this test should be able to see
    // immediately that the baseline does NOT install
    // `audit_logs_immutable` — that's migration 11's job.
    it('up() does not install the audit_logs_immutable trigger from migration 11', async () => {
      await queryInterface.dropTable('audit_logs');
      await baseline058.up(queryInterface);

      const triggers = await listTriggers('audit_logs');
      expect(triggers).not.toContain('audit_logs_immutable');
    });
  });
});
