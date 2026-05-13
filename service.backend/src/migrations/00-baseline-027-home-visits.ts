import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `home_visits` table.
 *
 * Frozen `createTable` body extracted from `models/HomeVisit.ts`. Two
 * ENUM columns (status, outcome). Cross-table FK constraints land in
 * `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-027-home-visits';

const HOME_VISIT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
const HOME_VISIT_OUTCOMES = ['approved', 'rejected', 'conditional'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'home_visits',
        {
          visit_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          scheduled_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
          },
          scheduled_time: {
            type: DataTypes.TIME,
            allowNull: false,
          },
          assigned_staff: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM(...HOME_VISIT_STATUSES),
            allowNull: false,
            defaultValue: 'scheduled',
          },
          notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          outcome: {
            type: DataTypes.ENUM(...HOME_VISIT_OUTCOMES),
            allowNull: true,
          },
          outcome_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          reschedule_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          cancelled_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
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

      await queryInterface.addIndex('home_visits', {
        fields: ['application_id'],
        name: 'home_visits_application_id_idx',
        transaction,
      });
      // Indexes without explicit names — match what `sync()` auto-generates.
      await queryInterface.addIndex('home_visits', {
        fields: ['status'],
        transaction,
      });
      await queryInterface.addIndex('home_visits', {
        fields: ['assigned_staff'],
        transaction,
      });
      await queryInterface.addIndex('home_visits', {
        fields: ['scheduled_date'],
        transaction,
      });
      await queryInterface.addIndex('home_visits', {
        fields: ['created_by'],
        name: 'home_visits_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('home_visits', {
        fields: ['updated_by'],
        name: 'home_visits_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('home_visits', { transaction });
    });
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_home_visits_status');
    await dropEnumTypeIfExists(sql, 'enum_home_visits_outcome');
  },
};
