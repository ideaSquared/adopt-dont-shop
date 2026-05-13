import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — email_templates (rebaseline 6/10).
 *
 * Frozen snapshot of `EmailTemplate`'s sync() output. Cross-table foreign
 * keys (parent_template_id self-reference, last_modified_by → users,
 * created_by/updated_by → users) live in `00-baseline-999-foreign-keys.ts`.
 * Column types still carry the right shape (UUID), but no REFERENCES
 * clause until the FK file lands.
 *
 * Three Postgres ENUMs are declared inline (type / category / status) —
 * `sync()` materialises them as `enum_email_templates_<col>` and the
 * matching `dropEnumTypeIfExists` calls in `down()` clean them up so they
 * don't leak into pg_type.
 *
 * `tags` is a Postgres TEXT[] (the model's `getArrayType` resolves to
 * `ARRAY(STRING)` outside test env).
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'email_templates',
        {
          template_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          type: {
            type: DataTypes.ENUM(
              'transactional',
              'notification',
              'marketing',
              'system',
              'administrative'
            ),
            allowNull: false,
          },
          category: {
            type: DataTypes.ENUM(
              'welcome',
              'password_reset',
              'email_verification',
              'application_update',
              'adoption_confirmation',
              'rescue_verification',
              'staff_invitation',
              'notification_digest',
              'reminder',
              'announcement',
              'newsletter',
              'system_alert'
            ),
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM('draft', 'active', 'inactive', 'archived'),
            allowNull: false,
            defaultValue: 'draft',
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
          variables: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          locale: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'en',
          },
          parent_template_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          current_version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          is_default: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
          },
          last_modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          last_used_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          usage_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          test_emails_sent: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
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
          // Audit columns (FKs in 00-baseline-999-foreign-keys.ts).
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

      await queryInterface.addIndex('email_templates', {
        fields: ['name'],
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', { fields: ['type'], transaction: t });
      await queryInterface.addIndex('email_templates', { fields: ['category'], transaction: t });
      await queryInterface.addIndex('email_templates', { fields: ['status'], transaction: t });
      await queryInterface.addIndex('email_templates', { fields: ['locale'], transaction: t });
      await queryInterface.addIndex('email_templates', { fields: ['is_default'], transaction: t });
      await queryInterface.addIndex('email_templates', {
        fields: ['last_modified_by'],
        name: 'email_templates_last_modified_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['parent_template_id'],
        name: 'email_templates_parent_template_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['last_used_at'],
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['tags'],
        using: 'gin',
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['deleted_at'],
        name: 'email_templates_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['created_by'],
        name: 'email_templates_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_templates', {
        fields: ['updated_by'],
        name: 'email_templates_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-037-email-templates');
    await queryInterface.dropTable('email_templates');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_templates_type');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_templates_category');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_email_templates_status');
  },
};
