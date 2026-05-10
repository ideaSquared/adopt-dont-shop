import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — swipe_sessions (rebaseline 8/10).
 *
 * Frozen snapshot of `SwipeSession`'s sync() output. Cross-table foreign key
 * (user_id) lives in `00-baseline-zzz-foreign-keys.ts` so each per-model
 * file is independently orderable. The column itself carries the right
 * shape (UUID), but no REFERENCES clause until the FK file lands.
 *
 * `SwipeSession` is non-paranoid (no `deleted_at`) and does NOT use
 * `withAuditHooks` — no `created_by` / `updated_by` / `version` columns or
 * audit indexes. Behavioural session log per the model comment.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'swipe_sessions',
        {
          session_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          start_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          end_time: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          total_swipes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          likes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          passes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          super_likes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          filters: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          ip_address: {
            type: DataTypes.INET,
            allowNull: true,
          },
          user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          device_type: {
            type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
            allowNull: true,
            defaultValue: 'unknown',
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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

      await queryInterface.addIndex('swipe_sessions', {
        fields: ['user_id', 'is_active'],
        name: 'idx_swipe_sessions_user_active',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_sessions', {
        fields: ['start_time'],
        name: 'idx_swipe_sessions_start_time',
        transaction: t,
      });
      await queryInterface.addIndex('swipe_sessions', {
        fields: ['session_id'],
        unique: true,
        name: 'idx_swipe_sessions_session_id',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-053-swipe-sessions');
    await queryInterface.dropTable('swipe_sessions');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_swipe_sessions_device_type');
  },
};
