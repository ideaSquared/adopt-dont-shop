import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) —
 * `home_visit_status_transitions` table.
 *
 * Frozen `createTable` body extracted from
 * `models/HomeVisitStatusTransition.ts`. Append-only event log
 * (`timestamps: false`); two ENUM columns sharing the same value set
 * but Postgres gives each its own type. The model intentionally has no
 * Sequelize-level FK constraint on `transitioned_by` — the association
 * uses `constraints: false` so the actor reference is preserved when
 * the user is deleted (forensic). Cross-table FK to `home_visits` lives
 * in `00-baseline-999-foreign-keys.ts`.
 *
 * The AFTER INSERT trigger that propagates `to_status` onto
 * `home_visits.status` is installed by the model's `afterSync` hook
 * and is out of scope here — same arrangement as the application
 * status-transitions baseline.
 */
const MIGRATION_KEY = '00-baseline-028-home-visit-status-transitions';

const HOME_VISIT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'home_visit_status_transitions',
        {
          transition_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          visit_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          from_status: {
            type: DataTypes.ENUM(...HOME_VISIT_STATUSES),
            allowNull: true,
          },
          to_status: {
            type: DataTypes.ENUM(...HOME_VISIT_STATUSES),
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

      await queryInterface.addIndex('home_visit_status_transitions', {
        fields: ['visit_id', 'transitioned_at'],
        name: 'home_visit_status_transitions_visit_id_at_idx',
        transaction,
      });
      await queryInterface.addIndex('home_visit_status_transitions', {
        fields: ['transitioned_by'],
        name: 'home_visit_status_transitions_transitioned_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('home_visit_status_transitions', { transaction });
    });
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_home_visit_status_transitions_from_status');
    await dropEnumTypeIfExists(sql, 'enum_home_visit_status_transitions_to_status');
  },
};
