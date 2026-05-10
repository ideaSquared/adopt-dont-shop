/**
 * Round-trip tests for the per-model baseline migrations covering the
 * Rescue org domain (rebaseline 2/10).
 *
 *   00-baseline-012-rescues
 *   00-baseline-013-rescue-settings
 *   00-baseline-014-addresses
 *   00-baseline-015-ratings
 *
 * Each test runs `up` against an empty schema (we drop any table the
 * model would have created via sync() so up() actually has work to do),
 * asserts the table + expected indexes exist, then runs `down` (with
 * the destructive-down env-var acknowledgement set) and asserts the
 * table is gone. Postgres-only — the migration bodies use
 * dialect-specific features (CITEXT, ENUM types, JSONB, partial unique
 * indexes) that have no SQLite equivalent.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import baseline012 from '../../migrations/00-baseline-012-rescues';
import baseline013 from '../../migrations/00-baseline-013-rescue-settings';
import baseline014 from '../../migrations/00-baseline-014-addresses';
import baseline015 from '../../migrations/00-baseline-015-ratings';

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

const tableExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as unknown[]).length > 0;
};

const indexExists = async (table: string, name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

type ColumnInfo = { data_type: string; udt_name: string; is_nullable: string };

const describeColumn = async (table: string, column: string): Promise<ColumnInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT data_type, udt_name, is_nullable FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as ColumnInfo[])[0];
};

const enumExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(`SELECT 1 FROM pg_type WHERE typname = '${name}'`);
  return (rows as unknown[]).length > 0;
};

/**
 * Drop tables (and their dependent ENUMs) in reverse-creation order
 * before each test so `up()` always operates on an empty schema.
 */
const TABLES = ['ratings', 'addresses', 'rescue_settings', 'rescues'] as const;

const ENUMS = [
  'enum_rescues_status',
  'enum_rescues_verification_source',
  'enum_addresses_owner_type',
  'enum_ratings_rating_type',
  'enum_ratings_category',
] as const;

const dropAll = async (): Promise<void> => {
  for (const table of TABLES) {
    await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }
  for (const enumName of ENUMS) {
    await sequelize.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }
};

const setDownKey = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const clearDownKey = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('per-model baseline — Rescue org (rebaseline 2/10)', () => {
  beforeAll(async () => {
    // Required for rescues.email (CITEXT). Idempotent.
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS citext');
  });

  beforeEach(async () => {
    await dropAll();
    clearDownKey();
  });

  afterAll(async () => {
    clearDownKey();
    await sequelize.close();
  });

  describe('00-baseline-012-rescues', () => {
    it('up creates rescues with model-mapped columns + indexes; down drops it', async () => {
      await baseline012.up(queryInterface);
      expect(await tableExists('rescues')).toBe(true);
      // CITEXT email and the legacy column names that the model maps to.
      expect((await describeColumn('rescues', 'email'))?.udt_name).toBe('citext');
      expect(await columnExists('rescues', 'state')).toBe(true);
      expect(await columnExists('rescues', 'zip_code')).toBe(true);
      expect((await describeColumn('rescues', 'settings'))?.udt_name).toBe('jsonb');
      expect(await columnExists('rescues', 'companies_house_number')).toBe(true);
      expect(await columnExists('rescues', 'verification_source')).toBe(true);
      expect(await columnExists('rescues', 'manual_verification_requested_at')).toBe(true);
      expect(await columnExists('rescues', 'version')).toBe(true);
      expect(await columnExists('rescues', 'created_by')).toBe(true);
      expect(await columnExists('rescues', 'deleted_at')).toBe(true);
      expect(await indexExists('rescues', 'rescues_verified_by_idx')).toBe(true);
      expect(await indexExists('rescues', 'rescues_deleted_at_idx')).toBe(true);
      expect(await indexExists('rescues', 'rescues_created_by_idx')).toBe(true);
      expect(await enumExists('enum_rescues_status')).toBe(true);
      expect(await enumExists('enum_rescues_verification_source')).toBe(true);

      setDownKey('00-baseline-012-rescues');
      await baseline012.down(queryInterface);
      expect(await tableExists('rescues')).toBe(false);
      expect(await enumExists('enum_rescues_status')).toBe(false);
      expect(await enumExists('enum_rescues_verification_source')).toBe(false);
    });

    it('down without env-var acknowledgement refuses to run', async () => {
      await baseline012.up(queryInterface);
      await expect(baseline012.down(queryInterface)).rejects.toThrow(/destructive/i);
    });
  });

  describe('00-baseline-013-rescue-settings', () => {
    it('up creates rescue_settings with PK on rescue_id; down drops it', async () => {
      await baseline013.up(queryInterface);
      expect(await tableExists('rescue_settings')).toBe(true);
      // 1:1 with rescues — PK is rescue_id, not a synthetic id.
      expect((await describeColumn('rescue_settings', 'rescue_id'))?.is_nullable).toBe('NO');
      expect(await columnExists('rescue_settings', 'auto_approve_applications')).toBe(true);
      expect(await columnExists('rescue_settings', 'min_adopter_age')).toBe(true);
      expect(await columnExists('rescue_settings', 'application_expiry_days')).toBe(true);
      expect(await columnExists('rescue_settings', 'version')).toBe(true);
      // Not paranoid — model overrides global default.
      expect(await columnExists('rescue_settings', 'deleted_at')).toBe(false);
      expect(await indexExists('rescue_settings', 'rescue_settings_created_by_idx')).toBe(true);
      expect(await indexExists('rescue_settings', 'rescue_settings_updated_by_idx')).toBe(true);

      setDownKey('00-baseline-013-rescue-settings');
      await baseline013.down(queryInterface);
      expect(await tableExists('rescue_settings')).toBe(false);
    });

    it('down without env-var acknowledgement refuses to run', async () => {
      await baseline013.up(queryInterface);
      await expect(baseline013.down(queryInterface)).rejects.toThrow(/destructive/i);
    });
  });

  describe('00-baseline-014-addresses', () => {
    it('up creates addresses with polymorphic owner + partial unique index; down drops it', async () => {
      await baseline014.up(queryInterface);
      expect(await tableExists('addresses')).toBe(true);
      expect(await columnExists('addresses', 'owner_type')).toBe(true);
      expect(await columnExists('addresses', 'owner_id')).toBe(true);
      expect(await columnExists('addresses', 'is_primary')).toBe(true);
      expect(await indexExists('addresses', 'addresses_owner_idx')).toBe(true);
      expect(await indexExists('addresses', 'addresses_one_primary_per_owner')).toBe(true);
      expect(await indexExists('addresses', 'addresses_country_postal_idx')).toBe(true);
      expect(await indexExists('addresses', 'addresses_created_by_idx')).toBe(true);
      expect(await enumExists('enum_addresses_owner_type')).toBe(true);

      setDownKey('00-baseline-014-addresses');
      await baseline014.down(queryInterface);
      expect(await tableExists('addresses')).toBe(false);
      expect(await enumExists('enum_addresses_owner_type')).toBe(false);
    });

    it('partial unique index permits multiple non-primary rows per owner but rejects a second primary', async () => {
      await baseline014.up(queryInterface);

      const ownerId = '00000000-0000-0000-0000-000000000001';
      const buildRow = (label: string, isPrimary: boolean): string =>
        `('${crypto.randomUUID()}', 'user', '${ownerId}', '${label}', 'L1', 'C', 'PC', 'GB', ${isPrimary}, 0, NOW(), NOW())`;

      // Three non-primary + one primary all coexist.
      await sequelize.query(
        `INSERT INTO addresses (address_id, owner_type, owner_id, label, line_1, city, postal_code, country, is_primary, version, created_at, updated_at)
           VALUES ${buildRow('home', false)}, ${buildRow('work', false)}, ${buildRow('mailing', true)}`
      );

      // A second primary for the same owner must violate the partial unique index.
      await expect(
        sequelize.query(
          `INSERT INTO addresses (address_id, owner_type, owner_id, label, line_1, city, postal_code, country, is_primary, version, created_at, updated_at)
             VALUES ${buildRow('second-primary', true)}`
        )
      ).rejects.toThrow();
    });

    it('down without env-var acknowledgement refuses to run', async () => {
      await baseline014.up(queryInterface);
      await expect(baseline014.down(queryInterface)).rejects.toThrow(/destructive/i);
    });
  });

  describe('00-baseline-015-ratings', () => {
    it('up creates ratings with all model-declared FK indexes + audit indexes; down drops it', async () => {
      await baseline015.up(queryInterface);
      expect(await tableExists('ratings')).toBe(true);
      expect(await columnExists('ratings', 'rating_type')).toBe(true);
      expect(await columnExists('ratings', 'category')).toBe(true);
      expect(await columnExists('ratings', 'helpful_count')).toBe(true);
      expect(await columnExists('ratings', 'is_moderated')).toBe(true);
      expect(await columnExists('ratings', 'response_text')).toBe(true);
      expect(await columnExists('ratings', 'version')).toBe(true);
      // Model does not override the global paranoid default.
      expect(await columnExists('ratings', 'deleted_at')).toBe(true);
      expect((await describeColumn('ratings', 'pros'))?.udt_name).toBe('jsonb');
      expect((await describeColumn('ratings', 'cons'))?.udt_name).toBe('jsonb');
      expect(await indexExists('ratings', 'ratings_pet_id_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_rescue_id_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_reviewer_id_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_reviewee_id_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_application_id_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_created_by_idx')).toBe(true);
      expect(await indexExists('ratings', 'ratings_updated_by_idx')).toBe(true);
      expect(await enumExists('enum_ratings_rating_type')).toBe(true);
      expect(await enumExists('enum_ratings_category')).toBe(true);

      setDownKey('00-baseline-015-ratings');
      await baseline015.down(queryInterface);
      expect(await tableExists('ratings')).toBe(false);
      expect(await enumExists('enum_ratings_rating_type')).toBe(false);
      expect(await enumExists('enum_ratings_category')).toBe(false);
    });

    it('down without env-var acknowledgement refuses to run', async () => {
      await baseline015.up(queryInterface);
      await expect(baseline015.down(queryInterface)).rejects.toThrow(/destructive/i);
    });
  });
});
