/**
 * Round-trip tests for the per-model baseline migrations covering the
 * communications domain (rebaseline 5/10):
 *
 *   00-baseline-029-chats
 *   00-baseline-030-chat-participants
 *   00-baseline-031-messages
 *   00-baseline-032-message-reactions
 *   00-baseline-033-message-reads
 *   00-baseline-034-file-uploads
 *   00-baseline-035-notifications
 *   00-baseline-036-device-tokens
 *
 * Pattern: force-sync the schema to capture the canonical column / index
 * set, drop the table, run `up()`, assert the table is rebuilt with the
 * same columns and indexes. Then run `down()` (with the destructive-down
 * env flag) and assert the table is gone.
 *
 * Postgres-only — Sequelize ENUM and partial-unique indexes have no
 * SQLite equivalent.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline029 from '../../migrations/00-baseline-029-chats';
import baseline030 from '../../migrations/00-baseline-030-chat-participants';
import baseline031 from '../../migrations/00-baseline-031-messages';
import baseline032 from '../../migrations/00-baseline-032-message-reactions';
import baseline033 from '../../migrations/00-baseline-033-message-reads';
import baseline034 from '../../migrations/00-baseline-034-file-uploads';
import baseline035 from '../../migrations/00-baseline-035-notifications';
import baseline036 from '../../migrations/00-baseline-036-device-tokens';

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
    name: '029 — chats',
    table: 'chats',
    destructiveKey: '00-baseline-029-chats',
    migration: baseline029,
  },
  {
    name: '030 — chat_participants',
    table: 'chat_participants',
    destructiveKey: '00-baseline-030-chat-participants',
    migration: baseline030,
  },
  {
    name: '031 — messages',
    table: 'messages',
    destructiveKey: '00-baseline-031-messages',
    migration: baseline031,
  },
  {
    name: '032 — message_reactions',
    table: 'message_reactions',
    destructiveKey: '00-baseline-032-message-reactions',
    migration: baseline032,
  },
  {
    name: '033 — message_reads',
    table: 'message_reads',
    destructiveKey: '00-baseline-033-message-reads',
    migration: baseline033,
  },
  {
    name: '034 — file_uploads',
    table: 'file_uploads',
    destructiveKey: '00-baseline-034-file-uploads',
    migration: baseline034,
  },
  {
    name: '035 — notifications',
    table: 'notifications',
    destructiveKey: '00-baseline-035-notifications',
    migration: baseline035,
  },
  {
    name: '036 — device_tokens',
    table: 'device_tokens',
    destructiveKey: '00-baseline-036-device-tokens',
    migration: baseline036,
  },
];

describeIfPostgres('per-model baseline — communications (rebaseline 5/10)', () => {
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
