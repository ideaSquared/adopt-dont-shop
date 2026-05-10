import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — swipe_actions (rebaseline 8/10).
 *
 * Frozen snapshot of `SwipeAction`'s sync() output. Cross-table foreign keys
 * (session_id, pet_id, user_id) live in `00-baseline-zzz-foreign-keys.ts` so
 * each per-model file is independently orderable. The columns themselves
 * carry the right shape (UUID), but no REFERENCES clause until the FK file
 * lands.
 *
 * `SwipeAction` is non-paranoid (no `deleted_at`) and does NOT use
 * `withAuditHooks` — no `created_by` / `updated_by` / `version` columns or
 * audit indexes. High-volume behavioural log per the model comment.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'swipe_actions',
        {
          swipe_action_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          session_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          action: {
            type: DataTypes.ENUM('like', 'pass', 'super_like', 'info'),
            allowNull: false,
          },
          timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          response_time: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          device_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          coordinates: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          gesture_data: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('swipe_actions', {
        fields: ['session_id'],
        name: 'idx_swipe_actions_session',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_actions', {
        fields: ['pet_id'],
        name: 'idx_swipe_actions_pet',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_actions', {
        fields: ['user_id', 'action'],
        name: 'idx_swipe_actions_user_action',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_actions', {
        fields: ['timestamp'],
        name: 'idx_swipe_actions_timestamp',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_actions', {
        fields: ['action', 'timestamp'],
        name: 'idx_swipe_actions_action_time',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-052-swipe-actions');
    await queryInterface.dropTable('swipe_actions');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_swipe_actions_action');
  },
};
