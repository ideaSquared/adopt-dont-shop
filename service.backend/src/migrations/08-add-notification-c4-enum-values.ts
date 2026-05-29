/**
 * Add dedicated `enum_notifications_type` values for the three C4
 * notification flows (PR #676) and backfill any rows that landed under
 * the temporary `system_announcement` fallback.
 *
 * Why the two-phase shape:
 *   `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction
 *   that subsequently references the new value (Postgres error
 *   "unsafe use of new value of enum type"). The enum mutations
 *   therefore run on the raw connection without a transaction wrapper,
 *   and the backfill `UPDATE`s run in a separate transaction once the
 *   new labels are committed.
 *
 * Why the backfill SQL filters by `data` discriminators:
 *   The C4 work shipped before the enum migration was possible, so the
 *   three flows tagged their notifications with `data.event`,
 *   `data.resolution`, and `data.actionType` to discriminate within the
 *   single `system_announcement` value. Those discriminators are the
 *   only way to identify which existing rows belong to which new typed
 *   value.
 *
 * Down:
 *   Postgres has no `DROP VALUE` for enum types prior to PG 15, and
 *   even on PG 15+ it only works when no rows reference the value.
 *   We therefore only revert the backfill (typed rows -> back to
 *   `system_announcement`); the new enum labels remain in pg_type.
 *   This is the documented limitation from `_helpers.ts`.
 */
import type { QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const sequelize = queryInterface.sequelize;

    // Phase 1: add the new enum values. Each runs as its own statement
    // outside a transaction so the labels are committed before the
    // backfill references them.
    await sequelize.query(
      `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'rescue_verified'`
    );
    await sequelize.query(
      `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'moderation_report_resolved'`
    );
    await sequelize.query(
      `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'user_sanctioned'`
    );

    // Phase 2: backfill C4 rows that landed under the temporary
    // `system_announcement` fallback. Wrapped in a transaction so a
    // partial failure leaves the table consistent.
    await runInTransaction(queryInterface, async t => {
      await sequelize.query(
        `UPDATE notifications
           SET type = 'rescue_verified'
         WHERE type = 'system_announcement'
           AND data->>'event' = 'rescue_verified'`,
        { transaction: t }
      );
      await sequelize.query(
        `UPDATE notifications
           SET type = 'moderation_report_resolved'
         WHERE type = 'system_announcement'
           AND data->>'resolution' IN ('resolved', 'dismissed', 'escalated')`,
        { transaction: t }
      );
      await sequelize.query(
        `UPDATE notifications
           SET type = 'user_sanctioned'
         WHERE type = 'system_announcement'
           AND data->>'actionType' IS NOT NULL`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Revert the backfill only. Pre-PG15 has no DROP VALUE for enums,
    // and even on PG15+ DROP VALUE fails if rows still reference the
    // value. Leaving the labels in pg_type is harmless: nothing reads
    // them once the rows revert.
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        `UPDATE notifications
           SET type = 'system_announcement'
         WHERE type IN ('rescue_verified', 'moderation_report_resolved', 'user_sanctioned')`,
        { transaction: t }
      );
    });
  },
};
