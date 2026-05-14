import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `application_references` table.
 *
 * Frozen `createTable` body extracted from `models/ApplicationReference.ts`.
 * One ENUM column (status). Cross-table FK constraints land in
 * `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-023-application-references';

const REFERENCE_STATUSES = ['pending', 'contacted', 'verified', 'failed'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_references',
        {
          reference_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          legacy_id: {
            type: DataTypes.STRING(64),
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          relationship: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          phone: {
            type: DataTypes.STRING(64),
            allowNull: false,
          },
          email: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM(...REFERENCE_STATUSES),
            allowNull: false,
            defaultValue: 'pending',
          },
          contacted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          contacted_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          order_index: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          created_by: { type: DataTypes.UUID, allowNull: true },
          updated_by: { type: DataTypes.UUID, allowNull: true },
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
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('application_references', {
        fields: ['application_id', 'order_index'],
        name: 'application_references_app_order_idx',
        transaction,
      });
      await queryInterface.addIndex('application_references', {
        fields: ['application_id', 'legacy_id'],
        unique: true,
        name: 'application_references_app_legacy_unique',
        transaction,
      });
      await queryInterface.addIndex('application_references', {
        fields: ['status'],
        name: 'application_references_status_idx',
        transaction,
      });
      await queryInterface.addIndex('application_references', {
        fields: ['contacted_by'],
        name: 'application_references_contacted_by_idx',
        transaction,
      });
      await queryInterface.addIndex('application_references', {
        fields: ['created_by'],
        name: 'application_references_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('application_references', {
        fields: ['updated_by'],
        name: 'application_references_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_references', { transaction });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_application_references_status');
  },
};
