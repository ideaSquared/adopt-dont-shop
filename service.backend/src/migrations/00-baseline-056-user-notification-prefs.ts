import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — user_notification_prefs (rebaseline 9/10).
 *
 * Frozen snapshot of `UserNotificationPrefs`'s sync() output. FKs (user_id,
 * created_by, updated_by) land in `00-baseline-999-foreign-keys.ts`.
 *
 * 1:1 with users — `user_id` is both the primary key and the FK to
 * `users.user_id`. A row is auto-created by `User.afterCreate` so consumers
 * can always assume the row exists. `paranoid: false` — no `deleted_at`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'user_notification_prefs',
        {
          user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          email_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          push_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          sms_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          digest_frequency: {
            type: DataTypes.ENUM('immediate', 'daily', 'weekly', 'never'),
            allowNull: false,
            defaultValue: 'weekly',
          },
          application_updates: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          pet_matches: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          rescue_updates: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          chat_messages: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          quiet_hours_start: {
            type: DataTypes.TIME,
            allowNull: true,
          },
          quiet_hours_end: {
            type: DataTypes.TIME,
            allowNull: true,
          },
          timezone: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: 'UTC',
          },
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('user_notification_prefs', {
        fields: ['created_by'],
        name: 'user_notification_prefs_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_notification_prefs', {
        fields: ['updated_by'],
        name: 'user_notification_prefs_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-056-user-notification-prefs');
    await queryInterface.dropTable('user_notification_prefs');
    await dropEnumTypeIfExists(
      queryInterface.sequelize,
      'enum_user_notification_prefs_digest_frequency'
    );
  },
};
