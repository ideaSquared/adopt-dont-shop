/**
 * ADS-784 C2: round-trip + idempotency tests for the orphan-table baselines:
 *
 *   00-baseline-062-adopter-match-profile
 *   00-baseline-063-user-preferences
 *
 * These tables previously existed only via the catch-all sync() and had no
 * per-model baseline. The new files freeze sync()'s output so the tables
 * survive the eventual removal of sync().
 *
 * The migrations themselves use JSONB and Postgres FKs so the round-trip
 * assertions are Postgres-gated, mirroring baseline-discovery.test.ts. The
 * idempotency guard (`tableExists` → no-op) is dialect-agnostic, so it is
 * exercised on whatever dialect the suite runs on (SQLite in CI).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline062 from '../../migrations/00-baseline-062-adopter-match-profile';
import baseline063 from '../../migrations/00-baseline-063-user-preferences';

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
    `SELECT indexname FROM pg_indexes WHERE tablename = '${table}' ORDER BY indexname`
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
    name: '062 — adopter_match_profile',
    table: 'adopter_match_profile',
    destructiveKey: '00-baseline-062-adopter-match-profile',
    migration: baseline062,
  },
  {
    name: '063 — user_preferences',
    table: 'user_preferences',
    destructiveKey: '00-baseline-063-user-preferences',
    migration: baseline063,
  },
];

describeIfPostgres('orphan-table baselines (ADS-784 C2, round trip)', () => {
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
      expect(await listColumns(table)).toEqual(expectedColumns);
    });

    it('up() recreates the indexes sync() produces', async () => {
      const expectedIndexes = await listIndexes(table);

      await queryInterface.dropTable(table);
      await migration.up(queryInterface);

      expect(new Set(await listIndexes(table))).toEqual(new Set(expectedIndexes));
    });

    it('up() is idempotent — no-op when the table already exists', async () => {
      // sync() in beforeEach already created it. The guard must no-op.
      expect(await tableExists(table)).toBe(true);
      await expect(migration.up(queryInterface)).resolves.not.toThrow();
      expect(await tableExists(table)).toBe(true);
    });

    it('down() refuses without the destructive-down env flags', async () => {
      delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
      delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;

      await expect(migration.down(queryInterface)).rejects.toThrow(/destructive down/);
      expect(await tableExists(table)).toBe(true);
    });

    it('down() drops the table when acknowledged', async () => {
      process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
      process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = destructiveKey;

      await migration.down(queryInterface);

      expect(await tableExists(table)).toBe(false);
    });
  });
});

/**
 * Dialect-agnostic coverage for the idempotency guard helpers. Runs on SQLite
 * in CI so the guard logic is exercised even when the Postgres round-trip is
 * skipped.
 */
describe('migration idempotency guards (ADS-784)', () => {
  beforeAll(async () => {
    await sequelize.sync();
  });

  it('orphan baseline up() is a no-op when sync() already created the table', async () => {
    // models/index registers AdopterMatchProfile + UserPreference, so sync()
    // above made both tables. The guard must short-circuit without throwing.
    await expect(baseline062.up(queryInterface)).resolves.not.toThrow();
    await expect(baseline063.up(queryInterface)).resolves.not.toThrow();
  });
});
