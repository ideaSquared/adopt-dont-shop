import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — email_preferences (rebaseline 6/10).
 *
 * Frozen snapshot of `EmailPreference`'s sync() output. FKs (user_id →
 * users with CASCADE, created_by/updated_by → users) live in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * Two Postgres ENUMs declared inline (email_format / digest_frequency).
 * The `preferences` JSONB column stores an array of NotificationPreference
 * objects — per-key validation lives on the model.
 *
 * Both `user_id` and `unsubscribe_token` carry the column-level UNIQUE
 * constraint AND a separate named unique index, mirroring `sync()`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'email_preferences',
        {
          preference_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
          },
          is_email_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          global_unsubscribe: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          preferences: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          language: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'en',
          },
          timezone: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'UTC',
          },
          email_format: {
            type: DataTypes.ENUM('html', 'text', 'both'),
            allowNull: false,
            defaultValue: 'html',
          },
          digest_frequency: {
            type: DataTypes.ENUM('immediate', 'daily', 'weekly', 'monthly', 'never'),
            allowNull: false,
            defaultValue: 'weekly',
          },
          digest_time: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: '09:00',
          },
          unsubscribe_token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          last_digest_sent: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          bounce_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          last_bounce_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          is_blacklisted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          blacklist_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          blacklisted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
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
          // Audit columns (FKs in 00-baseline-zzz-foreign-keys.ts).
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
        },
        { transaction: t }
      );

      await queryInterface.addIndex('email_preferences', {
        fields: ['user_id'],
        unique: true,
        name: 'email_preferences_user_id_unique',
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['unsubscribe_token'],
        unique: true,
        name: 'email_preferences_unsubscribe_token_unique',
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['is_email_enabled'],
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['global_unsubscribe'],
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['is_blacklisted'],
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['digest_frequency'],
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['last_digest_sent'],
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['created_by'],
        name: 'email_preferences_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_preferences', {
        fields: ['updated_by'],
        name: 'email_preferences_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-040-email-preferences');
    await queryInterface.dropTable('email_preferences');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_preferences_email_format');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_preferences_digest_frequency');
  },
};
