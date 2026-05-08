/**
 * Round-trip tests for the audit forward-fix migrations (ADS-484):
 *
 *   10 — ip_rules.cidr → CIDR type           (ADS-444)
 *   11 — revoked_tokens.updated_at           (ADS-502)
 *   12 — report_shares.token_hash UNIQUE     (ADS-505)
 *   13 — soft-delete partial indexes         (ADS-504)
 *
 * Every test runs `up`, asserts the post-state, runs `down`, and asserts
 * the pre-state is restored. Postgres-only — the migration bodies use
 * dialect-specific features (CIDR cast, partial unique with predicate,
 * `CREATE INDEX CONCURRENTLY`) that have no SQLite equivalent.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import {
  Rescue,
  IpRule,
  RevokedToken,
  ReportShare,
  SavedReport,
  User,
  Pet,
  Application,
} from '../../models';
import migration10 from '../../migrations/10-ip-rules-cidr-type';
import migration11 from '../../migrations/11-revoked-tokens-updated-at';
import migration12 from '../../migrations/12-report-shares-token-hash-unique';
import migration13 from '../../migrations/13-soft-delete-partial-indexes';

// Reference models so they register with the Sequelize instance before
// `sync()` runs.
void Rescue;
void IpRule;
void RevokedToken;
void ReportShare;
void SavedReport;
void User;
void Pet;
void Application;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

type ColumnInfo = { data_type: string; udt_name: string };
type IndexInfo = { indexname: string; indexdef: string };

const describeColumn = async (table: string, column: string): Promise<ColumnInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT data_type, udt_name FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as ColumnInfo[])[0];
};

const findIndex = async (table: string, name: string): Promise<IndexInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as IndexInfo[])[0];
};

const queryInterface = sequelize.getQueryInterface();

describeIfPostgres('forward-fix migrations — up/down round trip (ADS-484)', () => {
  beforeEach(async () => {
    // Rebuild the post-migration baseline before each test.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('10 — ip_rules.cidr → CIDR (ADS-444)', () => {
    // The IpRule model already declares cidr as DataTypes.CIDR, so a fresh
    // sync() leaves the column as `cidr` already. To test the migration we
    // first downgrade the column to VARCHAR, then run up(), then down().
    beforeEach(async () => {
      await sequelize.query(
        'ALTER TABLE ip_rules ALTER COLUMN cidr TYPE VARCHAR(64) USING cidr::TEXT'
      );
    });

    it('up() promotes cidr to native CIDR type', async () => {
      const before = await describeColumn('ip_rules', 'cidr');
      expect(before?.udt_name).toBe('varchar');

      await migration10.up(queryInterface);

      const after = await describeColumn('ip_rules', 'cidr');
      expect(after?.udt_name).toBe('cidr');
    });

    it('down() restores VARCHAR(64)', async () => {
      await migration10.up(queryInterface);
      await migration10.down(queryInterface);

      const col = await describeColumn('ip_rules', 'cidr');
      expect(col?.udt_name).toBe('varchar');
    });

    it('CIDR type rejects malformed input after up()', async () => {
      await migration10.up(queryInterface);

      await expect(
        sequelize.query(
          `INSERT INTO ip_rules (type, cidr, is_active, created_at, updated_at)
             VALUES ('block', 'not-a-cidr', true, NOW(), NOW())`
        )
      ).rejects.toThrow();
    });
  });

  describe('11 — revoked_tokens.updated_at (ADS-502)', () => {
    beforeEach(async () => {
      // Drop the column so up() has something to add.
      await sequelize.query('ALTER TABLE revoked_tokens DROP COLUMN IF EXISTS updated_at');
    });

    it('up() adds updated_at column', async () => {
      await migration11.up(queryInterface);

      const col = await describeColumn('revoked_tokens', 'updated_at');
      expect(col).toBeDefined();
      expect(col?.data_type).toContain('timestamp');
    });

    it('down() removes updated_at column', async () => {
      await migration11.up(queryInterface);
      await migration11.down(queryInterface);

      const col = await describeColumn('revoked_tokens', 'updated_at');
      expect(col).toBeUndefined();
    });
  });

  describe('12 — report_shares.token_hash UNIQUE (ADS-505)', () => {
    beforeEach(async () => {
      // The model already has the new unique index on a fresh sync — but
      // it doesn't, because we haven't updated the model. The current
      // baseline has only the plain index. Make sure it's there.
      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      if (!plain) {
        await sequelize.query(
          'CREATE INDEX report_shares_token_hash_idx ON report_shares (token_hash)'
        );
      }
      await sequelize.query(
        'DROP INDEX CONCURRENTLY IF EXISTS report_shares_token_hash_unique_idx'
      );
    });

    it('up() creates the partial unique index and drops the plain one', async () => {
      await migration12.up(queryInterface);

      const unique = await findIndex('report_shares', 'report_shares_token_hash_unique_idx');
      expect(unique).toBeDefined();
      expect(unique?.indexdef).toContain('UNIQUE');
      expect(unique?.indexdef).toContain('share_type');

      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      expect(plain).toBeUndefined();
    });

    it('down() drops the unique index and restores the plain one', async () => {
      await migration12.up(queryInterface);
      await migration12.down(queryInterface);

      const unique = await findIndex('report_shares', 'report_shares_token_hash_unique_idx');
      expect(unique).toBeUndefined();

      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      expect(plain).toBeDefined();
    });
  });

  describe('13 — soft-delete partial indexes (ADS-504)', () => {
    const expectedIndexes = [
      { table: 'users', name: 'users_email_active_idx' },
      { table: 'pets', name: 'pets_status_active_idx' },
      { table: 'applications', name: 'applications_rescue_status_active_idx' },
    ];

    beforeEach(async () => {
      // Drop pre-existing partial indexes so up() can create them cleanly.
      for (const { name } of expectedIndexes) {
        await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}"`);
      }
    });

    it('up() creates the partial indexes with deleted_at IS NULL predicate', async () => {
      await migration13.up(queryInterface);

      for (const { table, name } of expectedIndexes) {
        const idx = await findIndex(table, name);
        expect(idx).toBeDefined();
        expect(idx?.indexdef).toContain('deleted_at IS NULL');
      }
    });

    it('down() removes the partial indexes', async () => {
      await migration13.up(queryInterface);
      await migration13.down(queryInterface);

      for (const { table, name } of expectedIndexes) {
        const idx = await findIndex(table, name);
        expect(idx).toBeUndefined();
      }
    });
  });
});
