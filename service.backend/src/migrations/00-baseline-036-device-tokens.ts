import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — device_tokens (rebaseline 5/10).
 *
 * Frozen snapshot of `DeviceToken`'s sync() output. FK (user_id) lands in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * `DeviceToken` does NOT use `withAuditHooks` — no `created_by`,
 * `updated_by`, or `version` columns / indexes. Paranoid (deleted_at) is
 * still on.
 *
 * The unique partial index `device_tokens_user_token_unique` enforces
 * "one active token per user+device_token" while permitting historical
 * soft-deleted rows.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'device_tokens',
        {
          token_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          device_token: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          platform: {
            type: DataTypes.ENUM('ios', 'android', 'web'),
            allowNull: false,
          },
          app_version: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          device_info: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          status: {
            type: DataTypes.ENUM('active', 'inactive', 'expired', 'invalid'),
            allowNull: false,
            defaultValue: 'active',
          },
          last_used_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          expires_at: {
            type: DataTypes.DATE,
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
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('device_tokens', {
        fields: ['user_id'],
        name: 'device_tokens_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['device_token'],
        name: 'device_tokens_token_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['platform'],
        name: 'device_tokens_platform_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['status'],
        name: 'device_tokens_status_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['last_used_at'],
        name: 'device_tokens_last_used_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['expires_at'],
        name: 'device_tokens_expires_idx',
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['user_id', 'device_token'],
        unique: true,
        name: 'device_tokens_user_token_unique',
        where: { deleted_at: null },
        transaction: t,
      });
      await queryInterface.addIndex('device_tokens', {
        fields: ['deleted_at'],
        name: 'device_tokens_deleted_at_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-036-device-tokens');
    await queryInterface.dropTable('device_tokens');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_device_tokens_platform');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_device_tokens_status');
  },
};
