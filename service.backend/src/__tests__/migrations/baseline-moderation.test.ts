/**
 * Round-trip tests for the per-model baseline migrations covering the
 * moderation & reports domain (rebaseline 7/10):
 *
 *   00-baseline-041-reports
 *   00-baseline-042-report-status-transitions
 *   00-baseline-043-report-templates
 *   00-baseline-044-report-shares
 *   00-baseline-045-saved-reports
 *   00-baseline-046-scheduled-reports
 *   00-baseline-047-moderator-actions
 *   00-baseline-048-moderation-evidence
 *   00-baseline-049-user-sanctions
 *   00-baseline-050-support-tickets
 *   00-baseline-051-support-ticket-responses
 *
 * Pattern: force-sync the schema to capture the canonical column / index
 * set, drop the table, run `up()`, assert the table is rebuilt with the
 * same columns and indexes. Then run `down()` (with the destructive-down
 * env flag) and assert the table is gone.
 *
 * Postgres-only — Sequelize ENUM, JSONB, ARRAY and GIN indexes have no
 * SQLite equivalent.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline041 from '../../migrations/00-baseline-041-reports';
import baseline042 from '../../migrations/00-baseline-042-report-status-transitions';
import baseline043 from '../../migrations/00-baseline-043-report-templates';
import baseline044 from '../../migrations/00-baseline-044-report-shares';
import baseline045 from '../../migrations/00-baseline-045-saved-reports';
import baseline046 from '../../migrations/00-baseline-046-scheduled-reports';
import baseline047 from '../../migrations/00-baseline-047-moderator-actions';
import baseline048 from '../../migrations/00-baseline-048-moderation-evidence';
import baseline049 from '../../migrations/00-baseline-049-user-sanctions';
import baseline050 from '../../migrations/00-baseline-050-support-tickets';
import baseline051 from '../../migrations/00-baseline-051-support-ticket-responses';

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
    name: '041 — reports',
    table: 'reports',
    destructiveKey: '00-baseline-041-reports',
    migration: baseline041,
  },
  {
    name: '042 — report_status_transitions',
    table: 'report_status_transitions',
    destructiveKey: '00-baseline-042-report-status-transitions',
    migration: baseline042,
  },
  {
    name: '043 — report_templates',
    table: 'report_templates',
    destructiveKey: '00-baseline-043-report-templates',
    migration: baseline043,
  },
  {
    name: '044 — report_shares',
    table: 'report_shares',
    destructiveKey: '00-baseline-044-report-shares',
    migration: baseline044,
  },
  {
    name: '045 — saved_reports',
    table: 'saved_reports',
    destructiveKey: '00-baseline-045-saved-reports',
    migration: baseline045,
  },
  {
    name: '046 — scheduled_reports',
    table: 'scheduled_reports',
    destructiveKey: '00-baseline-046-scheduled-reports',
    migration: baseline046,
  },
  {
    name: '047 — moderator_actions',
    table: 'moderator_actions',
    destructiveKey: '00-baseline-047-moderator-actions',
    migration: baseline047,
  },
  {
    name: '048 — moderation_evidence',
    table: 'moderation_evidence',
    destructiveKey: '00-baseline-048-moderation-evidence',
    migration: baseline048,
  },
  {
    name: '049 — user_sanctions',
    table: 'user_sanctions',
    destructiveKey: '00-baseline-049-user-sanctions',
    migration: baseline049,
  },
  {
    name: '050 — support_tickets',
    table: 'support_tickets',
    destructiveKey: '00-baseline-050-support-tickets',
    migration: baseline050,
  },
  {
    name: '051 — support_ticket_responses',
    table: 'support_ticket_responses',
    destructiveKey: '00-baseline-051-support-ticket-responses',
    migration: baseline051,
  },
];

describeIfPostgres('per-model baseline — moderation & reports (rebaseline 7/10)', () => {
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
