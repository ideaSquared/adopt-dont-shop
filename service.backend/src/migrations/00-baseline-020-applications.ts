import { DataTypes, Op, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `applications` table.
 *
 * Frozen `createTable` body extracted from `models/Application.ts` as it
 * stood at the rebaseline cut. Mirrors what `sequelize.sync()` produces
 * today; landing this file plus its sibling `00-baseline-NNN-*.ts` files
 * gives fresh databases an explicit, reviewable schema diff in place of
 * the implicit `sync()` call in `00-baseline.ts`.
 *
 * Cross-table foreign-key constraints are NOT declared here — they are
 * batched into `00-baseline-zzz-foreign-keys.ts` so per-model files are
 * independently reorderable. Indexes covering FK columns ARE created
 * here (they are plain B-tree indexes, not constraints).
 *
 * `down()` drops the table and its dialect-private ENUM types. It is
 * gated by `assertDestructiveDownAcknowledged` because rebuilding the
 * table from scratch would erase data.
 */
const MIGRATION_KEY = '00-baseline-020-applications';

const APPLICATION_STATUSES = ['submitted', 'approved', 'rejected', 'withdrawn'] as const;
const APPLICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const APPLICATION_STAGES = [
  'pending',
  'reviewing',
  'visiting',
  'deciding',
  'resolved',
  'withdrawn',
] as const;
const APPLICATION_OUTCOMES = ['approved', 'rejected', 'withdrawn'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'applications',
        {
          application_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM(...APPLICATION_STATUSES),
            allowNull: false,
            defaultValue: 'submitted',
          },
          priority: {
            type: DataTypes.ENUM(...APPLICATION_PRIORITIES),
            allowNull: false,
            defaultValue: 'normal',
          },
          stage: {
            type: DataTypes.ENUM(...APPLICATION_STAGES),
            allowNull: false,
            defaultValue: 'pending',
          },
          final_outcome: {
            type: DataTypes.ENUM(...APPLICATION_OUTCOMES),
            allowNull: true,
          },
          review_started_at: { type: DataTypes.DATE, allowNull: true },
          visit_scheduled_at: { type: DataTypes.DATE, allowNull: true },
          visit_completed_at: { type: DataTypes.DATE, allowNull: true },
          resolved_at: { type: DataTypes.DATE, allowNull: true },
          withdrawal_reason: { type: DataTypes.TEXT, allowNull: true },
          rejection_reason: { type: DataTypes.TEXT, allowNull: true },
          actioned_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          actioned_at: { type: DataTypes.DATE, allowNull: true },
          documents: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          requires_coppa_consent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          parental_consent_given_at: { type: DataTypes.DATE, allowNull: true },
          references_consented: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          interview_notes: { type: DataTypes.TEXT, allowNull: true },
          home_visit_notes: { type: DataTypes.TEXT, allowNull: true },
          score: { type: DataTypes.INTEGER, allowNull: true },
          tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
          notes: { type: DataTypes.TEXT, allowNull: true },
          submitted_at: { type: DataTypes.DATE, allowNull: true },
          reviewed_at: { type: DataTypes.DATE, allowNull: true },
          decision_at: { type: DataTypes.DATE, allowNull: true },
          expires_at: { type: DataTypes.DATE, allowNull: true },
          follow_up_date: { type: DataTypes.DATE, allowNull: true },
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
          deleted_at: { type: DataTypes.DATE, allowNull: true },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('applications', {
        fields: ['user_id'],
        name: 'applications_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['pet_id'],
        name: 'applications_pet_id_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['rescue_id'],
        name: 'applications_rescue_id_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['actioned_by'],
        name: 'applications_actioned_by_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['status'],
        name: 'applications_status_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['priority'],
        name: 'applications_priority_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['created_at'],
        name: 'applications_created_at_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['submitted_at'],
        name: 'applications_submitted_at_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['expires_at'],
        name: 'applications_expires_at_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['follow_up_date'],
        name: 'applications_follow_up_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['user_id', 'pet_id'],
        unique: true,
        name: 'applications_user_pet_unique',
        where: {
          deleted_at: null,
          status: { [Op.not]: ['rejected', 'withdrawn'] },
        },
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['rescue_id', 'status', { name: 'created_at', order: 'DESC' }],
        name: 'applications_rescue_status_created_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['deleted_at'],
        name: 'applications_deleted_at_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['created_by'],
        name: 'applications_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('applications', {
        fields: ['updated_by'],
        name: 'applications_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('applications', { transaction });
    });
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_applications_status');
    await dropEnumTypeIfExists(sql, 'enum_applications_priority');
    await dropEnumTypeIfExists(sql, 'enum_applications_stage');
    await dropEnumTypeIfExists(sql, 'enum_applications_final_outcome');
  },
};
