import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — saved_reports (rebaseline 7/10).
 *
 * Frozen snapshot of `SavedReport`'s sync() output. Cross-table FKs
 * (user_id, rescue_id, template_id, created_by, updated_by) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * Paranoid: deleted_at column included. withAuditHooks contributes
 * created_by / updated_by / version + matching FK indexes.
 */
const MIGRATION_KEY = '00-baseline-045-saved-reports';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'saved_reports',
        {
          saved_report_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          template_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          config: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          is_archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.addIndex('saved_reports', {
        fields: ['rescue_id', 'user_id'],
        name: 'saved_reports_rescue_user_idx',
        transaction,
      });
      await queryInterface.addIndex('saved_reports', {
        fields: ['template_id'],
        name: 'saved_reports_template_idx',
        transaction,
      });
      await queryInterface.addIndex('saved_reports', {
        fields: ['is_archived'],
        name: 'saved_reports_archived_idx',
        transaction,
      });
      await queryInterface.addIndex('saved_reports', {
        fields: ['created_by'],
        name: 'saved_reports_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('saved_reports', {
        fields: ['updated_by'],
        name: 'saved_reports_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('saved_reports');
  },
};
