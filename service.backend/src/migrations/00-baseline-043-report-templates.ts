import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — report_templates (rebaseline 7/10).
 *
 * Frozen snapshot of `ReportTemplate`'s sync() output. Cross-table FKs
 * (rescue_id, created_by, updated_by) land in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * Paranoid: deleted_at column included. withAuditHooks contributes
 * created_by / updated_by / version + matching FK indexes.
 */
const MIGRATION_KEY = '00-baseline-043-report-templates';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'report_templates',
        {
          template_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          category: {
            type: DataTypes.ENUM('adoption', 'engagement', 'operations', 'fundraising', 'custom'),
            allowNull: false,
          },
          config: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          is_system: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: true,
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
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('report_templates', {
        fields: ['category'],
        name: 'report_templates_category_idx',
        transaction,
      });
      await queryInterface.addIndex('report_templates', {
        fields: ['is_system'],
        name: 'report_templates_is_system_idx',
        transaction,
      });
      await queryInterface.addIndex('report_templates', {
        fields: ['rescue_id'],
        name: 'report_templates_rescue_idx',
        transaction,
      });
      await queryInterface.addIndex('report_templates', {
        fields: ['created_by'],
        name: 'report_templates_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('report_templates', {
        fields: ['updated_by'],
        name: 'report_templates_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('report_templates');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_report_templates_category');
  },
};
