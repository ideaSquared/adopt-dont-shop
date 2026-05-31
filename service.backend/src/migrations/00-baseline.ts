/**
 * Baseline migration — Phase 1 data model.
 *
 * Historically this called `sequelize.sync()` to materialise the whole model
 * graph. That made `db:migrate` from a clean database fail (ADS-784):
 *
 *  - `sync()` is model-driven, so it tried to create indexes for columns that
 *    only later forward migrations add (e.g. `chats.assigned_to` from
 *    `09-add-chats-assigned-to`), aborting with `42703 undefined_column`.
 *  - It also created tables that have their own later `createTable` migrations
 *    (`foster_placements`, `two_factor_recoveries`, `application_drafts`),
 *    so those migrations then collided.
 *
 * The schema is now fully described by the explicit `00-baseline-0NN-*.ts`
 * files (including `062-adopter-match-profile` and `063-user-preferences`,
 * which were previously only created by this sync). This migration is kept as
 * a no-op so its `SequelizeMeta` row is preserved on databases that already
 * applied it; the numbered baselines + forward migrations are the source of
 * truth.
 */
import type { QueryInterface } from 'sequelize';

export default {
  up: async (_queryInterface: QueryInterface) => {
    // No-op: the explicit numbered baseline migrations create the schema.
    // (Previously `await sequelize.sync()` — removed under ADS-784.)
  },

  down: async (queryInterface: QueryInterface) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop all tables in production. Restore from backup instead.');
    }
    await queryInterface.dropAllTables();
  },
};
