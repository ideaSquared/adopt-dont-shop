import { DataTypes, Op, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — notifications (rebaseline 5/10).
 *
 * Frozen snapshot of `Notification`'s sync() output. FK (user_id,
 * created_by, updated_by) lands in `00-baseline-zzz-foreign-keys.ts`.
 *
 * Several columns use Postgres ENUMs (type / channel / priority / status /
 * related_entity_type) — declared with the same value lists the model
 * declares today.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'notifications',
        {
          notification_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          type: {
            type: DataTypes.ENUM(
              'application_status',
              'message_received',
              'pet_available',
              'interview_scheduled',
              'home_visit_scheduled',
              'adoption_approved',
              'adoption_rejected',
              'reference_request',
              'system_announcement',
              'account_security',
              'reminder',
              'marketing',
              'rescue_invitation',
              'staff_assignment',
              'pet_update',
              'follow_up'
            ),
            allowNull: false,
          },
          channel: {
            type: DataTypes.ENUM('in_app', 'email', 'push', 'sms'),
            allowNull: false,
          },
          priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            allowNull: false,
            defaultValue: 'normal',
          },
          status: {
            type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
          },
          title: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          message: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          data: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          template_id: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          template_variables: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          related_entity_type: {
            type: DataTypes.ENUM(
              'application',
              'pet',
              'message',
              'user',
              'rescue',
              'conversation',
              'interview',
              'home_visit',
              'reminder',
              'announcement',
              'adoption',
              'event',
              'reference',
              'security'
            ),
            allowNull: true,
          },
          related_entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          scheduled_for: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          sent_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          delivered_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          read_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          clicked_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          retry_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          max_retries: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
          },
          error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          external_id: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'External service ID for tracking delivery status',
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
        },
        { transaction: t }
      );

      await queryInterface.addIndex('notifications', {
        fields: ['user_id'],
        name: 'notifications_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['type'],
        name: 'notifications_type_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['channel'],
        name: 'notifications_channel_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['status'],
        name: 'notifications_status_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['priority'],
        name: 'notifications_priority_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['scheduled_for'],
        name: 'notifications_scheduled_for_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['created_at'],
        name: 'notifications_created_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['expires_at'],
        name: 'notifications_expires_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['user_id', 'read_at'],
        name: 'notifications_user_read_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['related_entity_type', 'related_entity_id'],
        name: 'notifications_related_entity_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['external_id'],
        name: 'notifications_external_id_idx',
        where: { external_id: { [Op.ne]: null } },
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['user_id', 'status', { name: 'created_at', order: 'DESC' }],
        name: 'notifications_user_status_created_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['deleted_at'],
        name: 'notifications_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['created_by'],
        name: 'notifications_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('notifications', {
        fields: ['updated_by'],
        name: 'notifications_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-035-notifications');
    await queryInterface.dropTable('notifications');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_notifications_type');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_notifications_channel');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_notifications_priority');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_notifications_status');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_notifications_related_entity_type');
  },
};
