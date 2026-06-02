/**
 * ADS-601: round-trip test for the `foster_placements` forward migration.
 *
 * Mirrors the per-model baseline test pattern in `baseline-pets.test.ts`:
 *   1. Drop the table sync() left behind so up() has work to do.
 *   2. Run up() and assert the table, columns, indexes (incl. the partial
 *      unique index that enforces one ACTIVE placement per pet), and
 *      enum type are created.
 *   3. Run down() with the destructive-down acknowledgement and assert
 *      the table and enum type are gone.
 *
 * Postgres-only — the migration uses a Postgres ENUM type and a partial
 * unique index, neither of which has a SQLite-equivalent we exercise.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import createFosterPlacements from '../../migrations/03-create-foster-placements';

// Force model side effects so sync() registers everything.
void models;

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

const indexDefinition = async (table: string, name: string): Promise<string> => {
  const [rows] = await sequelize.query(
    `SELECT indexdef FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as Array<{ indexdef: string }>)[0]?.indexdef ?? '';
};

const enumExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = '${name}' AND typtype = 'e'`
  );
  return (rows as unknown[]).length > 0;
};

const ackKey = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const clearAck = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('03-create-foster-placements (round trip)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.query('DROP TABLE IF EXISTS foster_placements CASCADE');
    await sequelize.query('DROP TYPE IF EXISTS "enum_foster_placements_status" CASCADE');
  });

  afterEach(() => {
    clearAck();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('up() creates the foster_placements table with the expected columns', async () => {
    expect(await tableExists('foster_placements')).toBe(false);

    await createFosterPlacements.up(queryInterface);

    expect(await tableExists('foster_placements')).toBe(true);
    expect(await columnExists('foster_placements', 'placement_id')).toBe(true);
    expect(await columnExists('foster_placements', 'pet_id')).toBe(true);
    expect(await columnExists('foster_placements', 'foster_user_id')).toBe(true);
    expect(await columnExists('foster_placements', 'rescue_id')).toBe(true);
    expect(await columnExists('foster_placements', 'start_date')).toBe(true);
    expect(await columnExists('foster_placements', 'end_date')).toBe(true);
    expect(await columnExists('foster_placements', 'status')).toBe(true);
    expect(await columnExists('foster_placements', 'notes')).toBe(true);
    expect(await columnExists('foster_placements', 'created_at')).toBe(true);
    expect(await columnExists('foster_placements', 'updated_at')).toBe(true);
    expect(await columnExists('foster_placements', 'deleted_at')).toBe(true);

    expect(await enumExists('enum_foster_placements_status')).toBe(true);
  });

  it('up() creates the four standard indexes and the active-pet partial unique index', async () => {
    await createFosterPlacements.up(queryInterface);

    expect(await indexExists('foster_placements', 'foster_placements_pet_id_idx')).toBe(true);
    expect(await indexExists('foster_placements', 'foster_placements_foster_user_id_idx')).toBe(
      true
    );
    expect(await indexExists('foster_placements', 'foster_placements_rescue_id_idx')).toBe(true);
    expect(await indexExists('foster_placements', 'foster_placements_status_idx')).toBe(true);
    expect(await indexExists('foster_placements', 'foster_placements_active_pet_unique')).toBe(
      true
    );

    const partialDef = await indexDefinition(
      'foster_placements',
      'foster_placements_active_pet_unique'
    );
    expect(partialDef).toContain('UNIQUE');
    expect(partialDef).toContain('pet_id');
    expect(partialDef).toMatch(/status = 'active'/);
    expect(partialDef).toMatch(/deleted_at IS NULL/);
  });

  it('up() is idempotent when the table already exists (ADS-784 guard)', async () => {
    // sync() / a prior apply already made the table — the guard must no-op
    // rather than abort trying to re-create it.
    await createFosterPlacements.up(queryInterface);
    expect(await tableExists('foster_placements')).toBe(true);

    await expect(createFosterPlacements.up(queryInterface)).resolves.not.toThrow();
    expect(await tableExists('foster_placements')).toBe(true);
  });

  it('down() refuses without the destructive-down acknowledgement', async () => {
    await createFosterPlacements.up(queryInterface);

    await expect(createFosterPlacements.down(queryInterface)).rejects.toThrow(/destructive down/i);
    expect(await tableExists('foster_placements')).toBe(true);
  });

  it('down() drops the table and its status enum type when acknowledged', async () => {
    await createFosterPlacements.up(queryInterface);
    ackKey('03-create-foster-placements');

    await createFosterPlacements.down(queryInterface);

    expect(await tableExists('foster_placements')).toBe(false);
    expect(await enumExists('enum_foster_placements_status')).toBe(false);
  });
});
