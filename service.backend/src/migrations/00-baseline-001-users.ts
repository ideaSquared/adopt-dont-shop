import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `users`.
 *
 * Mirrors what `sequelize.sync()` produces from `service.backend/src/models/User.ts`
 * today — column types, nullability, defaults, single-table indexes. Cross-table
 * foreign keys (`created_by`, `updated_by`) are intentionally omitted; they live
 * in `00-baseline-999-foreign-keys.ts` so each per-model file is independently
 * reorderable.
 *
 * `down` drops the table and the ENUM types created inline (`enum_users_status`,
 * `enum_users_user_type`) so we don't leak orphaned types into pg_type.
 */
const MIGRATION_KEY = '00-baseline-001-users';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'users',
        {
          user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          first_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          last_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          email: {
            type: DataTypes.CITEXT,
            allowNull: false,
            unique: true,
          },
          password: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          email_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          verification_token: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          verification_token_expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          reset_token: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          reset_token_expiration: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          reset_token_force_flag: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          phone_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
          },
          phone_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          date_of_birth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
          },
          profile_image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          bio: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM(
              'active',
              'inactive',
              'suspended',
              'pending_verification',
              'deactivated'
            ),
            allowNull: false,
            defaultValue: 'pending_verification',
          },
          user_type: {
            type: DataTypes.ENUM('adopter', 'rescue_staff', 'admin', 'moderator'),
            allowNull: false,
            defaultValue: 'adopter',
          },
          last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          login_attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          locked_until: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          two_factor_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          two_factor_secret: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          backup_codes: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
          },
          timezone: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'UTC',
          },
          language: {
            type: DataTypes.STRING(10),
            allowNull: true,
            defaultValue: 'en',
          },
          country: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          city: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          address_line_1: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          address_line_2: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          postal_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
          },
          location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: true,
          },
          terms_accepted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          privacy_policy_accepted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          application_defaults: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
          },
          profile_completion_status: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {
              basic_info: false,
              living_situation: false,
              pet_experience: false,
              references: false,
              overall_percentage: 0,
              last_updated: null,
            },
          },
          // Audit columns (FK constraints added in 00-baseline-999-foreign-keys.ts).
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
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        name: 'users_email_unique',
        transaction: t,
      });
      await queryInterface.addIndex('users', ['status'], { transaction: t });
      await queryInterface.addIndex('users', ['user_type'], { transaction: t });
      await queryInterface.addIndex('users', ['created_at'], { transaction: t });
      await queryInterface.addIndex('users', ['deleted_at'], {
        name: 'users_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('users', ['created_by'], {
        name: 'users_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('users', ['updated_by'], {
        name: 'users_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('users', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_users_status');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_users_user_type');
  },
};
