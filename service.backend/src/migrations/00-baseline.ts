/**
 * Baseline migration — Phase 1 data model.
 *
 * Historically this used `sequelize.sync({ force: true })` which drops every
 * table on apply (catastrophic if accidentally run against a populated DB)
 * and silently drifts as the model definitions evolve.
 *
 * Two safety changes apply now (ADS-400):
 *
 * 1. `force` is removed — `sync()` is now create-if-not-exists, so applying
 *    the migration on a populated DB is a no-op rather than a wipe.
 * 2. The down-migration only runs in non-production environments. Dropping
 *    every table in production is never the right rollback path; operators
 *    should restore from backup instead.
 *
 * The longer-term fix (replacing this migration with an explicit set of
 * frozen `queryInterface.createTable(...)` calls so the produced schema is
 * deterministic and does not drift with model edits) is tracked under a
 * follow-up rebaseline ticket — touching ~60 models in a single PR is too
 * high-risk to merge alongside the rest of the audit fixes.
 */
import type { QueryInterface } from 'sequelize';
import sequelize from '../sequelize';
import '../models/index';

export default {
  up: async (_queryInterface: QueryInterface) => {
    // Idempotent: create tables that don't exist, leave existing tables alone.
    // No `force`, no `alter` — destructive ops belong in explicit forward
    // migrations, not the baseline.
    await sequelize.sync();
  },

  down: async (queryInterface: QueryInterface) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop all tables in production. Restore from backup instead.');
    }
    await queryInterface.dropAllTables();
  },
};
