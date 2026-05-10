import { type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

/**
 * ADS-502: `revoked_tokens` is missing `updated_at` even though the global
 * Sequelize `define` block sets `timestamps: true`.
 *
 * The current `RevokedToken` model overrides with `timestamps: false`, so
 * today the schema and model agree. But anyone changing the model to the
 * project default (or adding a hook that touches `updatedAt`) would hit a
 * silent column-not-found error. Adding the column up front aligns the
 * table with the platform-wide convention and removes the foot-gun.
 *
 * `revoked_at` continues to act as the "created at" — a token row is
 * inserted exactly once when revoked. `updated_at` exists for forward
 * compatibility and tracks any future status flips (e.g. unrevoke).
 *
 * Idempotency note (per-model rebaseline coexistence): the new
 * `00-baseline-007-revoked-tokens.ts` baseline freezes today's `sync()`
 * output, which already includes `updated_at`. On fresh DBs the baseline
 * runs first, so a bare `addColumn` here would fail with "column already
 * exists". The body therefore uses raw SQL `ADD COLUMN IF NOT EXISTS`,
 * which is a no-op if the column is already there and still creates it on
 * existing DBs that ran the legacy monolithic `00-baseline.ts`.
 *
 * `down()` is intentionally unchanged. Per the design doc, rollback for
 * the rebaseline-coexistent migrations is via DB backup, not
 * `db:migrate:undo`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        `ALTER TABLE "revoked_tokens"
           ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('revoked_tokens', 'updated_at', { transaction: t });
    });
  },
};
