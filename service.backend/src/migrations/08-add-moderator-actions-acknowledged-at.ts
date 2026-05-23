/**
 * Add `acknowledged_at` to moderator_actions so a sanctioned user can
 * dismiss the in-app sanction banner per-sanction. The banner queries
 * GET /api/v1/auth/sanctions/active and excludes rows where this column
 * is non-NULL (the user has already acknowledged the sanction).
 *
 * Nullable timestamp — existing rows default to NULL (unacknowledged),
 * which matches behaviour for sanctions issued before this column
 * existed.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'moderator_actions',
        'acknowledged_at',
        {
          type: DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('moderator_actions', 'acknowledged_at', { transaction: t });
    });
  },
};
