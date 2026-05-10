import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — email_queue (rebaseline 6/10).
 *
 * Frozen snapshot of `EmailQueue`'s sync() output. FKs (template_id →
 * email_templates, user_id → users, created_by/updated_by → users) live in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * Append-only delivery queue with its own `status` ENUM column —
 * `paranoid: false` on the model, so no `deleted_at`. The retention job
 * hard-archives sent rows.
 *
 * Three Postgres ENUMs declared inline (type / priority / status). The
 * 9-value `status` enum captures the full delivery lifecycle (queued →
 * sending → sent → delivered → opened → clicked, plus failed / bounced /
 * unsubscribed terminal states).
 *
 * `attachments` is JSONB allowNull: false WITHOUT a default — the model
 * declares no defaultValue, so callers must supply the column on insert.
 * `cc_emails`, `bcc_emails`, `tags` are TEXT[] (Postgres native arrays
 * via `getArrayType` outside the test env).
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'email_queue',
        {
          email_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          template_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          from_email: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          from_name: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          to_email: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          to_name: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          cc_emails: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
          },
          bcc_emails: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
          },
          reply_to_email: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          subject: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          html_content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          text_content: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          template_data: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          attachments: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          type: {
            type: DataTypes.ENUM('transactional', 'notification', 'marketing', 'system'),
            allowNull: false,
          },
          priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            allowNull: false,
            defaultValue: 'normal',
          },
          status: {
            type: DataTypes.ENUM(
              'queued',
              'sending',
              'sent',
              'delivered',
              'opened',
              'clicked',
              'failed',
              'bounced',
              'unsubscribed'
            ),
            allowNull: false,
            defaultValue: 'queued',
          },
          scheduled_for: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          max_retries: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
          },
          current_retries: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          last_attempt_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          sent_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          failure_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          provider_id: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          provider_message_id: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          tracking: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          campaign_id: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
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
          // Audit columns (FKs in 00-baseline-zzz-foreign-keys.ts).
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
        { transaction: t }
      );

      await queryInterface.addIndex('email_queue', { fields: ['status'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['priority'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['type'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['to_email'], transaction: t });
      await queryInterface.addIndex('email_queue', {
        fields: ['user_id'],
        name: 'email_queue_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_queue', {
        fields: ['template_id'],
        name: 'email_queue_template_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_queue', { fields: ['campaign_id'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['scheduled_for'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['sent_at'], transaction: t });
      await queryInterface.addIndex('email_queue', { fields: ['created_at'], transaction: t });
      await queryInterface.addIndex('email_queue', {
        fields: ['tags'],
        using: 'gin',
        transaction: t,
      });
      await queryInterface.addIndex('email_queue', {
        fields: ['status', 'priority', 'scheduled_for'],
        name: 'email_queue_processing_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_queue', {
        fields: ['created_by'],
        name: 'email_queue_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_queue', {
        fields: ['updated_by'],
        name: 'email_queue_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-039-email-queue');
    await queryInterface.dropTable('email_queue');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_queue_type');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_queue_priority');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_queue_status');
  },
};
