/**
 * Round-trip tests for the per-model baseline migrations covering the
 * consent & prefs domain (rebaseline 9/10):
 *
 *   00-baseline-055-user-consents
 *   00-baseline-056-user-notification-prefs
 *   00-baseline-057-user-privacy-prefs
 *
 * Pattern: force-sync the schema to capture the canonical column / index
 * set, drop the table, run `up()`, assert the table is rebuilt with the
 * same columns and indexes. Then run `down()` (with the destructive-down
 * env flag) and assert the table is gone.
 *
 * Postgres-only — Sequelize ENUM types have no SQLite equivalent.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline055 from '../../migrations/00-baseline-055-user-consents';
import baseline056 from '../../migrations/00-baseline-056-user-notification-prefs';
import baseline057 from '../../migrations/00-baseline-057-user-privacy-prefs';

void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

type ColumnRow = { column_name: string };
type IndexRow = { indexname: string };

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
    name: '055 — user_consents',
    table: 'user_consents',
    destructiveKey: '00-baseline-055-user-consents',
    migration: baseline055,
  },
  {
    name: '056 — user_notification_prefs',
    table: 'user_notification_prefs',
    destructiveKey: '00-baseline-056-user-notification-prefs',
    migration: baseline056,
  },
  {
    name: '057 — user_privacy_prefs',
    table: 'user_privacy_prefs',
    destructiveKey: '00-baseline-057-user-privacy-prefs',
    migration: baseline057,
  },
];

describeIfPostgres('per-model baseline — consent & prefs (rebaseline 9/10)', () => {
  // Snapshot the env vars we mutate so we restore them between tests and
  // never leak into other test files.
  const originalAllow = process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  const originalKey = process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;

  beforeAll(async () => {
    // Establish the canonical post-sync baseline once. Each test that
    // needs to compare against the canonical shape captures it before
    // dropping the table.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Restore env so test ordering doesn't leak.
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
});
