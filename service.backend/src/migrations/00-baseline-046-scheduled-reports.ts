import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — scheduled_reports (rebaseline 7/10).
 *
 * Frozen snapshot of `ScheduledReport`'s sync() output. Cross-table FKs
 * (saved_report_id, created_by, updated_by) land in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * Paranoid: deleted_at column included. withAuditHooks contributes
 * created_by / updated_by / version + matching FK indexes.
 */
const MIGRATION_KEY = '00-baseline-046-scheduled-reports';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'scheduled_reports',
        {
          schedule_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          saved_report_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          cron: {
            type: DataTypes.STRING(120),
            allowNull: false,
          },
          timezone: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: 'UTC',
          },
          recipients: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          format: {
            type: DataTypes.ENUM('pdf', 'csv', 'inline-html'),
            allowNull: false,
            defaultValue: 'pdf',
          },
          is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          last_run_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          next_run_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          last_status: {
            type: DataTypes.ENUM('pending', 'success', 'failed'),
            allowNull: true,
          },
          last_error: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          repeat_job_key: {
            type: DataTypes.STRING(255),
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

      await queryInterface.addIndex('scheduled_reports', {
        fields: ['saved_report_id'],
        name: 'scheduled_reports_saved_report_idx',
        transaction,
      });
      await queryInterface.addIndex('scheduled_reports', {
        fields: ['is_enabled', 'next_run_at'],
        name: 'scheduled_reports_enabled_next_run_idx',
        transaction,
      });
      await queryInterface.addIndex('scheduled_reports', {
        fields: ['created_by'],
        name: 'scheduled_reports_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('scheduled_reports', {
        fields: ['updated_by'],
        name: 'scheduled_reports_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('scheduled_reports');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_scheduled_reports_format');
    await dropEnumTypeIfExists(sql, 'enum_scheduled_reports_last_status');
  },
};
