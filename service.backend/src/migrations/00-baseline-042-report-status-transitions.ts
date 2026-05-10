import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — report_status_transitions (rebaseline 7/10).
 *
 * Frozen snapshot of `ReportStatusTransition`'s sync() output. FKs
 * (report_id with CASCADE; transitioned_by has no FK by design — see
 * the model comment) are deferred to `00-baseline-zzz-foreign-keys.ts`.
 *
 * `timestamps: false` on the model — only `transitioned_at` tracks event
 * time. No `created_at` / `updated_at` / `deleted_at` / audit columns.
 *
 * The AFTER INSERT trigger that propagates `to_status` to `reports.status`
 * is installed by the model's `installStatusTransitionTrigger` afterSync
 * hook and is not baseline DDL.
 */
const MIGRATION_KEY = '00-baseline-042-report-status-transitions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'report_status_transitions',
        {
          transition_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          report_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          from_status: {
            type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed', 'escalated'),
            allowNull: true,
          },
          to_status: {
            type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed', 'escalated'),
            allowNull: false,
          },
          transitioned_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          transitioned_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('report_status_transitions', {
        fields: ['report_id', 'transitioned_at'],
        name: 'report_status_transitions_report_id_at_idx',
        transaction,
      });
      await queryInterface.addIndex('report_status_transitions', {
        fields: ['transitioned_by'],
        name: 'report_status_transitions_transitioned_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('report_status_transitions');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_report_status_transitions_from_status');
    await dropEnumTypeIfExists(sql, 'enum_report_status_transitions_to_status');
  },
};
