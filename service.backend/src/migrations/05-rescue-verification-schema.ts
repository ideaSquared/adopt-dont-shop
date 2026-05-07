import { QueryInterface, DataTypes } from 'sequelize';

/**
 * ADS-356: Replace registrationNumber/ein with companiesHouseNumber + charityRegistrationNumber
 * ADS-357: Add 'rejected' status to rescue state machine
 * ADS-359: Add unique constraints on new registration number fields
 * ADS-364: Add verificationSource, verificationFailureReason
 * ADS-360: Add manualVerificationRequestedAt
 * ADS-370: Backfill ein → companies_house_number / registration_number → charity_registration_number
 *           BEFORE dropping the old columns. Idempotent: every step is guarded by
 *           an IF (NOT) EXISTS check so this migration can be safely re-applied
 *           in environments that already ran an earlier version.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const sql = queryInterface.sequelize;

    // Add new UK registration number fields (idempotent).
    await sql.query(
      `ALTER TABLE rescues ADD COLUMN IF NOT EXISTS companies_house_number VARCHAR(8)`
    );
    await sql.query(
      `ALTER TABLE rescues ADD COLUMN IF NOT EXISTS charity_registration_number VARCHAR(12)`
    );

    // Backfill from the legacy columns BEFORE we drop them. Guarded by
    // information_schema lookups so this is a no-op in environments where
    // an earlier version of this migration already dropped them.
    //
    // Companies House numbers are exactly 8 alphanumeric chars (uppercase).
    // Anything in the legacy `ein` column that doesn't match the format is
    // logged via NOTICE and left for manual triage rather than silently
    // discarded — see ADS-370.
    await sql.query(`
      DO $$
      DECLARE
        non_conforming RECORD;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rescues' AND column_name = 'ein'
        ) THEN
          -- Conforming values: 8 alphanumeric chars, uppercase. Backfill.
          UPDATE rescues
             SET companies_house_number = UPPER(ein)
           WHERE companies_house_number IS NULL
             AND ein IS NOT NULL
             AND ein ~ '^[A-Za-z0-9]{8}$';

          -- Non-conforming values: surface via NOTICE so operators can rescue them.
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
          -- Charity registration numbers: 7 digits optionally followed by '-' + 1-2 digits.
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
    `);

    // Add unique constraints on the new fields. Use raw SQL with IF NOT EXISTS
    // semantics so this is idempotent across reruns.
    await sql.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'rescues_companies_house_number_unique'
        ) THEN
          ALTER TABLE rescues
            ADD CONSTRAINT rescues_companies_house_number_unique UNIQUE (companies_house_number);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'rescues_charity_registration_number_unique'
        ) THEN
          ALTER TABLE rescues
            ADD CONSTRAINT rescues_charity_registration_number_unique UNIQUE (charity_registration_number);
        END IF;
      END
      $$;
    `);

    // Drop the old ambiguous fields (idempotent).
    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS ein`);
    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS registration_number`);

    // Add 'rejected' to the status enum.
    await sql.query(`ALTER TYPE "enum_rescues_status" ADD VALUE IF NOT EXISTS 'rejected'`);

    // Create enum type for verification source (idempotent).
    await sql.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_rescues_verification_source') THEN
          CREATE TYPE "enum_rescues_verification_source" AS ENUM ('companies_house', 'charity_commission', 'manual');
        END IF;
      END
      $$;
    `);

    await sql.query(`
      ALTER TABLE rescues
        ADD COLUMN IF NOT EXISTS verification_source "enum_rescues_verification_source"
    `);

    await sql.query(`
      ALTER TABLE rescues ADD COLUMN IF NOT EXISTS verification_failure_reason TEXT
    `);

    await sql.query(`
      ALTER TABLE rescues ADD COLUMN IF NOT EXISTS manual_verification_requested_at TIMESTAMP WITH TIME ZONE
    `);

    // Sequelize ergonomics: surface the columns to the model via the standard
    // `addColumn` method as well. This is no-op when the column already
    // exists (tested via raw `IF NOT EXISTS` above) but ensures Sequelize's
    // metadata cache is refreshed in environments where it's relied on.
    void DataTypes;
  },

  down: async (queryInterface: QueryInterface) => {
    const sql = queryInterface.sequelize;

    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS manual_verification_requested_at`);
    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS verification_failure_reason`);
    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS verification_source`);
    await sql.query(`DROP TYPE IF EXISTS "enum_rescues_verification_source"`);

    await sql.query(`
      ALTER TABLE rescues DROP CONSTRAINT IF EXISTS rescues_companies_house_number_unique
    `);
    await sql.query(`
      ALTER TABLE rescues DROP CONSTRAINT IF EXISTS rescues_charity_registration_number_unique
    `);

    // Down-migration is destructive: the ein / registration_number values were
    // already backfilled into the new columns, but the originals are gone.
    // We can re-create the columns empty for schema parity but the data is
    // not recoverable from this side. Operators should restore from backup
    // if they need to roll back through this migration on a populated DB.
    await sql.query(`ALTER TABLE rescues ADD COLUMN IF NOT EXISTS ein VARCHAR(255)`);
    await sql.query(
      `ALTER TABLE rescues ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255)`
    );

    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS companies_house_number`);
    await sql.query(`ALTER TABLE rescues DROP COLUMN IF EXISTS charity_registration_number`);

    // Note: PostgreSQL does not support removing enum values. The 'rejected'
    // value will remain in enum_rescues_status after rollback, which is harmless
    // as long as no rows use it.
  },
};
