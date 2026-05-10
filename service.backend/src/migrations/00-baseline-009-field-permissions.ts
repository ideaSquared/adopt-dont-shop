import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `field_permissions`.
 *
 * Model has `paranoid: true` so the table includes `deleted_at`. The
 * model's `indexes:` block declares both a unique composite (the only
 * cross-column index) and three single-column lookup indexes — all stay
 * here in the baseline because none cross tables.
 */
const MIGRATION_KEY = '00-baseline-009-field-permissions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'field_permissions',
        {
          field_permission_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          resource: {
            type: DataTypes.ENUM('users', 'pets', 'applications', 'rescues'),
            allowNull: false,
          },
          field_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          role: {
            type: DataTypes.STRING(50),
            allowNull: false,
          },
          access_level: {
            type: DataTypes.ENUM('none', 'read', 'write'),
            allowNull: false,
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

      await queryInterface.addIndex('field_permissions', ['resource', 'field_name', 'role'], {
        unique: true,
        name: 'unique_field_permission',
        transaction: t,
      });
      await queryInterface.addIndex('field_permissions', ['resource'], { transaction: t });
      await queryInterface.addIndex('field_permissions', ['role'], { transaction: t });
      await queryInterface.addIndex('field_permissions', ['resource', 'role'], { transaction: t });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('field_permissions', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_field_permissions_resource');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_field_permissions_access_level');
  },
};
