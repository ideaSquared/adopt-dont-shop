import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — support_ticket_responses (rebaseline 7/10).
 *
 * Frozen snapshot of `SupportTicketResponse`'s sync() output. Cross-table
 * FKs (ticket_id with CASCADE, responder_id, created_by, updated_by)
 * land in `00-baseline-999-foreign-keys.ts`.
 *
 * Paranoid: deleted_at column included; the model declares an explicit
 * deleted_at field plus a `support_ticket_responses_deleted_at_idx`.
 *
 * `attachments` JSONB is the only nullable JSON in this domain — the
 * model declares `allowNull: true` (no default).
 *
 * withAuditHooks contributes created_by / updated_by / version + matching
 * FK indexes.
 */
const MIGRATION_KEY = '00-baseline-051-support-ticket-responses';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'support_ticket_responses',
        {
          response_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          ticket_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          responder_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          responder_type: {
            type: DataTypes.ENUM('staff', 'user'),
            allowNull: false,
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          attachments: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          is_internal: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
          deleted_at: {
            type: DataTypes.DATE,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['ticket_id'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['responder_id'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['created_at'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['responder_type'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['is_internal'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['ticket_id', 'created_at'],
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['deleted_at'],
        name: 'support_ticket_responses_deleted_at_idx',
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['created_by'],
        name: 'support_ticket_responses_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('support_ticket_responses', {
        fields: ['updated_by'],
        name: 'support_ticket_responses_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('support_ticket_responses');
    await dropEnumTypeIfExists(
      queryInterface.sequelize,
      'enum_support_ticket_responses_responder_type'
    );
  },
};
