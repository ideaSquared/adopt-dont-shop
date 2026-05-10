import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — reports (rebaseline 7/10).
 *
 * Frozen snapshot of `Report`'s sync() output. Cross-table foreign keys
 * (reporter_id, reported_user_id, assigned_moderator, resolved_by,
 * escalated_to, created_by, updated_by) live in
 * `00-baseline-zzz-foreign-keys.ts`. Columns carry the right shape (UUID)
 * but no REFERENCES clause until the FK file lands.
 *
 * `evidence` was moved to the `moderation_evidence` polymorphic table
 * (see `00-baseline-048-moderation-evidence.ts`); no `evidence` column
 * here.
 */
const MIGRATION_KEY = '00-baseline-041-reports';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'reports',
        {
          report_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          reporter_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          reported_entity_type: {
            type: DataTypes.ENUM('user', 'rescue', 'pet', 'application', 'message', 'conversation'),
            allowNull: false,
          },
          reported_entity_id: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          reported_user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          category: {
            type: DataTypes.ENUM(
              'inappropriate_content',
              'spam',
              'harassment',
              'false_information',
              'scam',
              'animal_welfare',
              'identity_theft',
              'other'
            ),
            allowNull: false,
          },
          severity: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
            defaultValue: 'medium',
          },
          status: {
            type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed', 'escalated'),
            allowNull: false,
            defaultValue: 'pending',
          },
          title: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          assigned_moderator: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          assigned_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          resolved_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          resolved_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          resolution: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          resolution_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          escalated_to: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          escalated_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          escalation_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
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
        },
        { transaction }
      );

      await queryInterface.addIndex('reports', {
        fields: ['reporter_id'],
        name: 'reports_reporter_id_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', {
        fields: ['reported_entity_type', 'reported_entity_id'],
        transaction,
      });
      await queryInterface.addIndex('reports', {
        fields: ['reported_user_id'],
        name: 'reports_reported_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', { fields: ['category'], transaction });
      await queryInterface.addIndex('reports', { fields: ['status'], transaction });
      await queryInterface.addIndex('reports', { fields: ['severity'], transaction });
      await queryInterface.addIndex('reports', {
        fields: ['assigned_moderator'],
        name: 'reports_assigned_moderator_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', {
        fields: ['resolved_by'],
        name: 'reports_resolved_by_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', {
        fields: ['escalated_to'],
        name: 'reports_escalated_to_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', { fields: ['created_at'], transaction });
      await queryInterface.addIndex('reports', {
        fields: ['created_by'],
        name: 'reports_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('reports', {
        fields: ['updated_by'],
        name: 'reports_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('reports');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_reports_reported_entity_type');
    await dropEnumTypeIfExists(sql, 'enum_reports_category');
    await dropEnumTypeIfExists(sql, 'enum_reports_severity');
    await dropEnumTypeIfExists(sql, 'enum_reports_status');
  },
};
