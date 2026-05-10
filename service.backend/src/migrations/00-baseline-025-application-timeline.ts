import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `application_timeline` table.
 *
 * Frozen `createTable` body extracted from `models/ApplicationTimeline.ts`.
 * Append-only event log; the model opts out of paranoid soft-delete so
 * there is no `deleted_at` column. One ENUM column (event_type).
 *
 * Cross-table FK constraints land in `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-025-application-timeline';

const TIMELINE_EVENT_TYPES = [
  'stage_change',
  'status_update',
  'note_added',
  'reference_contacted',
  'reference_verified',
  'interview_scheduled',
  'interview_completed',
  'home_visit_scheduled',
  'home_visit_completed',
  'home_visit_rescheduled',
  'home_visit_cancelled',
  'score_updated',
  'document_uploaded',
  'decision_made',
  'application_approved',
  'application_rejected',
  'application_withdrawn',
  'application_reopened',
  'communication_sent',
  'communication_received',
  'system_auto_progression',
  'manual_override',
] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_timeline',
        {
          timeline_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          event_type: {
            type: DataTypes.ENUM(...TIMELINE_EVENT_TYPES),
            allowNull: false,
          },
          title: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          created_by_email_snapshot: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          created_by_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          previous_stage: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          new_stage: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          previous_status: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          new_status: {
            type: DataTypes.STRING(50),
            allowNull: true,
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('application_timeline', {
        fields: ['application_id', 'created_at'],
        name: 'application_timeline_application_id_idx',
        transaction,
      });
      // Index on event_type — name auto-generated to match what
      // `sync()` produces (no explicit name set on the model index).
      await queryInterface.addIndex('application_timeline', {
        fields: ['event_type'],
        transaction,
      });
      await queryInterface.addIndex('application_timeline', {
        fields: ['created_by'],
        name: 'application_timeline_created_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_timeline', { transaction });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_application_timeline_event_type');
  },
};
