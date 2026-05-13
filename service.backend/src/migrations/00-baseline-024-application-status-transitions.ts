import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) —
 * `application_status_transitions` table.
 *
 * Frozen `createTable` body extracted from
 * `models/ApplicationStatusTransition.ts`. Append-only event log:
 * `timestamps: false` in the model — only `transitioned_at` (set on
 * insert via `defaultValue: NOW`) tracks event time. Two ENUM columns
 * (from_status, to_status) sharing the same set of values but Postgres
 * gives each its own type.
 *
 * The AFTER INSERT trigger that denormalises `to_status` onto
 * `applications.status` is installed by the model's `afterSync` hook;
 * it lives outside the per-model baseline because the trigger depends
 * on `applications` already existing. Equivalent rebaselining of the
 * trigger DDL would belong with the FK-batch file or a follow-up
 * migration.
 *
 * Cross-table FK constraints land in `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-024-application-status-transitions';

const APPLICATION_STATUSES = ['submitted', 'approved', 'rejected', 'withdrawn'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_status_transitions',
        {
          transition_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          from_status: {
            type: DataTypes.ENUM(...APPLICATION_STATUSES),
            allowNull: true,
          },
          to_status: {
            type: DataTypes.ENUM(...APPLICATION_STATUSES),
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

      await queryInterface.addIndex('application_status_transitions', {
        fields: ['application_id', 'transitioned_at'],
        name: 'application_status_transitions_app_id_at_idx',
        transaction,
      });
      await queryInterface.addIndex('application_status_transitions', {
        fields: ['transitioned_by'],
        name: 'application_status_transitions_transitioned_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_status_transitions', { transaction });
    });
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_application_status_transitions_from_status');
    await dropEnumTypeIfExists(sql, 'enum_application_status_transitions_to_status');
  },
};
