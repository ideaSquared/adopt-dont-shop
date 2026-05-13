import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — support_tickets (rebaseline 7/10).
 *
 * Frozen snapshot of `SupportTicket`'s sync() output. Cross-table FKs
 * (user_id, assigned_to, escalated_to, created_by, updated_by) land in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * No `paranoid: true` on the model — no `deleted_at` column.
 * `tags` is `ARRAY(STRING)` indexed with GIN. `attachments` and
 * `metadata` are JSONB with the model's defaultValue (empty array /
 * empty object).
 *
 * withAuditHooks contributes created_by / updated_by / version + matching
 * FK indexes.
 */
const MIGRATION_KEY = '00-baseline-050-support-tickets';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'support_tickets',
        {
          ticket_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          user_email: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          user_name: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          assigned_to: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM(
              'open',
              'in_progress',
              'waiting_for_user',
              'resolved',
              'closed',
              'escalated'
            ),
            allowNull: false,
            defaultValue: 'open',
          },
          priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent', 'critical'),
            allowNull: false,
            defaultValue: 'normal',
          },
          category: {
            type: DataTypes.ENUM(
              'technical_issue',
              'account_problem',
              'adoption_inquiry',
              'payment_issue',
              'feature_request',
              'report_bug',
              'general_question',
              'compliance_concern',
              'data_request',
              'other'
            ),
            allowNull: false,
          },
          subject: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
          },
          attachments: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          first_response_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          last_response_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          resolved_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          closed_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          escalated_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          escalated_to: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          escalation_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          satisfaction_rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          satisfaction_feedback: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          internal_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          due_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          estimated_resolution_time: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          actual_resolution_time: {
            type: DataTypes.INTEGER,
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

      await queryInterface.addIndex('support_tickets', {
        fields: ['user_id'],
        name: 'support_tickets_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('support_tickets', { fields: ['user_email'], transaction });
      await queryInterface.addIndex('support_tickets', {
        fields: ['assigned_to'],
        name: 'support_tickets_assigned_to_idx',
        transaction,
      });
      await queryInterface.addIndex('support_tickets', {
        fields: ['escalated_to'],
        name: 'support_tickets_escalated_to_idx',
        transaction,
      });
      await queryInterface.addIndex('support_tickets', { fields: ['status'], transaction });
      await queryInterface.addIndex('support_tickets', { fields: ['priority'], transaction });
      await queryInterface.addIndex('support_tickets', { fields: ['category'], transaction });
      await queryInterface.addIndex('support_tickets', { fields: ['created_at'], transaction });
      await queryInterface.addIndex('support_tickets', { fields: ['due_date'], transaction });
      await queryInterface.addIndex('support_tickets', {
        fields: ['tags'],
        using: 'gin',
        transaction,
      });
      await queryInterface.addIndex('support_tickets', {
        fields: ['created_by'],
        name: 'support_tickets_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('support_tickets', {
        fields: ['updated_by'],
        name: 'support_tickets_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('support_tickets');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_support_tickets_status');
    await dropEnumTypeIfExists(sql, 'enum_support_tickets_priority');
    await dropEnumTypeIfExists(sql, 'enum_support_tickets_category');
  },
};
