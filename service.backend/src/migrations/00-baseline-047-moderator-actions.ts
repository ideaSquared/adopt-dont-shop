import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — moderator_actions (rebaseline 7/10).
 *
 * Frozen snapshot of `ModeratorAction`'s sync() output. Cross-table FKs
 * (moderator_id, report_id, target_user_id, reversed_by, created_by,
 * updated_by) land in `00-baseline-999-foreign-keys.ts`.
 *
 * `paranoid: false` — append-only history of moderator decisions; no
 * `deleted_at` column. `evidence` was moved to the `moderation_evidence`
 * polymorphic table; no `evidence` column here.
 *
 * withAuditHooks contributes created_by / updated_by / version + matching
 * FK indexes.
 */
const MIGRATION_KEY = '00-baseline-047-moderator-actions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'moderator_actions',
        {
          action_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          moderator_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          report_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          target_entity_type: {
            type: DataTypes.ENUM('user', 'rescue', 'pet', 'application', 'message', 'conversation'),
            allowNull: false,
          },
          target_entity_id: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          target_user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          action_type: {
            type: DataTypes.ENUM(
              'warning_issued',
              'content_removed',
              'user_suspended',
              'user_banned',
              'account_restricted',
              'content_flagged',
              'report_dismissed',
              'escalation',
              'appeal_reviewed',
              'no_action'
            ),
            allowNull: false,
          },
          severity: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
          },
          reason: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          reversed_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          reversed_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          reversal_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          notification_sent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          internal_notes: {
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

      await queryInterface.addIndex('moderator_actions', {
        fields: ['moderator_id'],
        name: 'moderator_actions_moderator_id_idx',
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['report_id'],
        name: 'moderator_actions_report_id_idx',
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['target_entity_type', 'target_entity_id'],
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['target_user_id'],
        name: 'moderator_actions_target_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['action_type'],
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', { fields: ['severity'], transaction });
      await queryInterface.addIndex('moderator_actions', { fields: ['is_active'], transaction });
      await queryInterface.addIndex('moderator_actions', { fields: ['expires_at'], transaction });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['reversed_by'],
        name: 'moderator_actions_reversed_by_idx',
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', { fields: ['created_at'], transaction });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['created_by'],
        name: 'moderator_actions_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('moderator_actions', {
        fields: ['updated_by'],
        name: 'moderator_actions_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('moderator_actions');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_moderator_actions_target_entity_type');
    await dropEnumTypeIfExists(sql, 'enum_moderator_actions_action_type');
    await dropEnumTypeIfExists(sql, 'enum_moderator_actions_severity');
  },
};
