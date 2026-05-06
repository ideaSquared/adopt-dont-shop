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
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('users', 'users_rescue_id_idx').catch(() => {
      // Index may not exist on environments rebuilt from sync; ignore.
    });
    await queryInterface.removeColumn('users', 'rescue_id');
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
