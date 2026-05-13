import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Drop users.rescue_id — rescue affiliation now lives exclusively in
 * staff_members (rescueId, userId, isVerified). Keeping the column on
 * users created two sources of truth: a User row only flagged a single
 * rescue, and a row was only set for the original founder/manager, so
 * other verified staff appeared rescue-less to the auth middleware.
 *
 * From this migration onward, code must derive a user's rescue from
 * StaffMember.findOne({ userId, isVerified: true }). The auth middleware
 * does this once per request and attaches the result to req.user.rescueId.
 *
 * Idempotency note (follow-up to #451 / #454): the per-model rebaseline
 * ships `00-baseline-001-users.ts` which captures today's `User` model —
 * `rescue_id` has already been removed from the model, so the baseline
 * does NOT create that column. On a fresh DB the column never exists,
 * which makes `removeColumn('users', 'rescue_id')` error with
 * "column does not exist". Patched to raw `ALTER TABLE ... DROP COLUMN
 * IF EXISTS` so it no-ops on fresh-DB-with-baseline and still drops the
 * column on pre-rebaseline DBs.
 *
 * `down()` is intentionally unchanged.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.query('DROP INDEX IF EXISTS "users_rescue_id_idx"');
    await sequelize.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "rescue_id"');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('users', 'rescue_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('users', {
      fields: ['rescue_id'],
      name: 'users_rescue_id_idx',
    });
  },
};
