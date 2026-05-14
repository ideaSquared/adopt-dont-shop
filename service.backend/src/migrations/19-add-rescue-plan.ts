import type { QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  createIndexConcurrently,
  dropEnumTypeIfExists,
  dropIndexConcurrently,
  runInTransaction,
} from './_helpers';

const MIGRATION_KEY = '19-add-rescue-plan';
const PLAN_IDX = 'rescues_plan_idx';
const ENUM_NAME = 'enum_rescues_plan';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        `DO $$
         BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${ENUM_NAME}') THEN
             CREATE TYPE "${ENUM_NAME}" AS ENUM ('free', 'growth', 'professional');
           END IF;
         END $$;`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE rescues
           ADD COLUMN IF NOT EXISTS plan "${ENUM_NAME}" NOT NULL DEFAULT 'free',
           ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ`,
        { transaction: t }
      );
    });

    // CONCURRENTLY must run outside a transaction.
    await createIndexConcurrently(queryInterface.sequelize, {
      name: PLAN_IDX,
      table: 'rescues',
      columns: ['plan'],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);

    await dropIndexConcurrently(queryInterface.sequelize, PLAN_IDX);

    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        `ALTER TABLE rescues
           DROP COLUMN IF EXISTS plan,
           DROP COLUMN IF EXISTS plan_expires_at`,
        { transaction: t }
      );
    });

    await dropEnumTypeIfExists(queryInterface.sequelize, ENUM_NAME);
  },
};
