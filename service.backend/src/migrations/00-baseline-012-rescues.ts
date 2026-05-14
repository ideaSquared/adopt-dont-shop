import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 2/10): `rescues`.
 *
 * Mirrors what `sequelize.sync()` produces from `service.backend/src/models/Rescue.ts`
 * today — column types, nullability, defaults, single-table indexes. Cross-table
 * foreign keys (`verified_by`, `created_by`, `updated_by`) are intentionally
 * omitted; they live in `00-baseline-999-foreign-keys.ts` so each per-model file
 * is independently reorderable.
 *
 * `down` drops the table and the ENUM types created inline (`enum_rescues_status`,
 * `enum_rescues_verification_source`) so we don't leak orphaned types into pg_type.
 */
const MIGRATION_KEY = '00-baseline-012-rescues';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'rescues',
        {
          rescue_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          email: {
            type: DataTypes.CITEXT,
            allowNull: false,
            unique: true,
          },
          phone: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          address: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          city: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          // Model attribute `county` maps to legacy column `state` (see Rescue.ts).
          state: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          // Model attribute `postcode` maps to legacy column `zip_code`.
          zip_code: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          country: {
            type: DataTypes.CHAR(2),
            allowNull: false,
            defaultValue: 'GB',
          },
          website: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          mission: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          companies_house_number: {
            type: DataTypes.STRING(8),
            allowNull: true,
            unique: true,
          },
          charity_registration_number: {
            type: DataTypes.STRING(12),
            allowNull: true,
            unique: true,
          },
          contact_person: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          contact_title: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          contact_email: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          contact_phone: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM('pending', 'verified', 'suspended', 'inactive', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
          },
          verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          // FK to users.user_id deferred to 00-baseline-999-foreign-keys.ts.
          verified_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          verification_source: {
            type: DataTypes.ENUM('companies_house', 'charity_commission', 'manual'),
            allowNull: true,
          },
          verification_failure_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          manual_verification_requested_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
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

      await queryInterface.addIndex('rescues', ['verified_by'], {
        name: 'rescues_verified_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('rescues', ['deleted_at'], {
        name: 'rescues_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('rescues', ['created_by'], {
        name: 'rescues_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('rescues', ['updated_by'], {
        name: 'rescues_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('rescues', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_rescues_status');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_rescues_verification_source');
  },
};
