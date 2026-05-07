/**
 * Tests the ein → companies_house_number / registration_number →
 * charity_registration_number backfill that runs as part of migration 05
 * (ADS-370). Uses the real Postgres connection so the regex / DO-block
 * SQL is exercised against the same dialect that runs in production.
 *
 * Setup approach:
 *   1. `sequelize.sync({force:true})` rebuilds the `rescues` table in its
 *      POST-migration shape (the Rescue model declares the new columns).
 *   2. We re-add the legacy `ein` and `registration_number` columns via
 *      raw SQL so we can insert pre-migration-shaped rows.
 *   3. We run the same backfill block the migration uses.
 *   4. We assert the new columns reflect the conforming legacy values
 *      and non-conforming legacy values are left for manual triage.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import { Rescue } from '../../models';

const BACKFILL_SQL = `
  DO $$
  DECLARE
    non_conforming RECORD;
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'rescues' AND column_name = 'ein'
    ) THEN
      UPDATE rescues
         SET companies_house_number = UPPER(ein)
       WHERE companies_house_number IS NULL
         AND ein IS NOT NULL
         AND ein ~ '^[A-Za-z0-9]{8}$';

      FOR non_conforming IN
        SELECT rescue_id, ein FROM rescues
         WHERE ein IS NOT NULL
           AND ein !~ '^[A-Za-z0-9]{8}$'
      LOOP
        RAISE NOTICE 'ADS-370: rescue % has non-conforming ein=% (not backfilled)',
          non_conforming.rescue_id, non_conforming.ein;
      END LOOP;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'rescues' AND column_name = 'registration_number'
    ) THEN
      UPDATE rescues
         SET charity_registration_number = registration_number
       WHERE charity_registration_number IS NULL
         AND registration_number IS NOT NULL
         AND registration_number ~ '^[0-9]{7}(-[0-9]{1,2})?$';

      FOR non_conforming IN
        SELECT rescue_id, registration_number FROM rescues
         WHERE registration_number IS NOT NULL
           AND registration_number !~ '^[0-9]{7}(-[0-9]{1,2})?$'
      LOOP
        RAISE NOTICE 'ADS-370: rescue % has non-conforming registration_number=% (not backfilled)',
          non_conforming.rescue_id, non_conforming.registration_number;
      END LOOP;
    END IF;
  END
  $$;
`;

const buildRescueRow = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Rescue',
  email: `rescue-${Math.random().toString(36).slice(2, 8)}@example.com`,
  phone: '555-0000',
  address: '1 Main St',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
  contact_person: 'Jane Doe',
  status: 'pending',
  ...overrides,
});

// The migration's backfill SQL is Postgres-specific (DO blocks, regex `~`,
// `RAISE NOTICE`, `information_schema` lookups). The unit-test runner uses an
// in-memory SQLite — the assertions are meaningless there because none of
// those constructs exist in SQLite. Skip on non-postgres dialects so the
// suite is a no-op locally and only runs in CI where Postgres is provisioned.
const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

describeIfPostgres('migration 05 — ein/registration_number backfill (ADS-370)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Re-create the legacy columns so we can simulate the pre-migration shape.
    await sequelize.query(`ALTER TABLE rescues ADD COLUMN IF NOT EXISTS ein VARCHAR(255)`);
    await sequelize.query(
      `ALTER TABLE rescues ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255)`
    );

    // Drop unique constraints so we can insert multiple test rows that
    // would otherwise conflict on the new columns.
    await sequelize.query(
      `ALTER TABLE rescues DROP CONSTRAINT IF EXISTS rescues_companies_house_number_unique`
    );
    await sequelize.query(
      `ALTER TABLE rescues DROP CONSTRAINT IF EXISTS rescues_charity_registration_number_unique`
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const insertLegacyRow = async (overrides: Record<string, unknown>) => {
    const row = buildRescueRow(overrides);
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map(c => (row as Record<string, unknown>)[c]);
    const result = await sequelize.query(
      `INSERT INTO rescues (${cols.join(', ')})
         VALUES (${placeholders})
         RETURNING rescue_id`,
      { bind: values as unknown as never }
    );
    return (result[0] as Array<{ rescue_id: string }>)[0].rescue_id;
  };

  const readBack = async (rescueId: string) => {
    const [rows] = await sequelize.query(
      `SELECT companies_house_number, charity_registration_number, ein, registration_number
         FROM rescues WHERE rescue_id = '${rescueId}'`
    );
    return (rows as Array<Record<string, unknown>>)[0];
  };

  it('backfills conforming Companies House numbers from ein', async () => {
    const id = await insertLegacyRow({ ein: '12345678' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.companies_house_number).toBe('12345678');
  });

  it('uppercases lowercase ein values when backfilling', async () => {
    const id = await insertLegacyRow({ ein: 'abc12345' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.companies_house_number).toBe('ABC12345');
  });

  it('leaves non-conforming ein values for manual triage', async () => {
    // Too short — 7 chars
    const id = await insertLegacyRow({ ein: '1234567' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.companies_house_number).toBeNull();
    expect(row.ein).toBe('1234567');
  });

  it('backfills conforming charity registration numbers (basic 7-digit form)', async () => {
    const id = await insertLegacyRow({ registration_number: '1234567' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.charity_registration_number).toBe('1234567');
  });

  it('backfills conforming charity registration numbers (with sub-charity suffix)', async () => {
    const id = await insertLegacyRow({ registration_number: '1234567-12' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.charity_registration_number).toBe('1234567-12');
  });

  it('leaves non-conforming registration_number values for manual triage', async () => {
    const id = await insertLegacyRow({ registration_number: 'NOT-A-NUMBER' });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.charity_registration_number).toBeNull();
    expect(row.registration_number).toBe('NOT-A-NUMBER');
  });

  it("doesn't overwrite an existing companies_house_number when ein is also populated", async () => {
    const id = await insertLegacyRow({
      ein: '99999999',
      companies_house_number: '12345678',
    });

    await sequelize.query(BACKFILL_SQL);

    const row = await readBack(id);
    expect(row.companies_house_number).toBe('12345678');
  });

  it('is a no-op when the legacy ein column does not exist', async () => {
    await sequelize.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS ein`);

    // No rows; just verify the DO block doesn't error when the column is gone.
    await expect(sequelize.query(BACKFILL_SQL)).resolves.toBeDefined();
  });
});

// Avoid unused-import lint: Rescue is referenced symbolically so the model
// is loaded before sync() runs, ensuring the `rescues` table exists.
void Rescue;
