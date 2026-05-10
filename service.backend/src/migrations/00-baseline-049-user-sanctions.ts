import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — user_sanctions (rebaseline 7/10).
 *
 * Frozen snapshot of `UserSanction`'s sync() output. Cross-table FKs
 * (user_id, issued_by, report_id, moderator_action_id, appeal_resolved_by,
 * revoked_by, created_by, updated_by) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * `paranoid: false` — append-only sanction history. Lifting a sanction is
 * a new row, not a soft-delete on the original. No `deleted_at` column.
 *
 * withAuditHooks contributes created_by / updated_by / version + matching
 * FK indexes.
 */
const MIGRATION_KEY = '00-baseline-049-user-sanctions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'user_sanctions',
        {
          sanction_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          sanction_type: {
            type: DataTypes.ENUM(
              'warning',
              'restriction',
              'temporary_ban',
              'permanent_ban',
              'messaging_restriction',
              'posting_restriction',
              'application_restriction'
            ),
            allowNull: false,
          },
          reason: {
            type: DataTypes.ENUM(
              'harassment',
              'spam',
              'inappropriate_content',
              'terms_violation',
              'scam_attempt',
              'false_information',
              'animal_welfare_concern',
              'repeated_violations',
              'other'
            ),
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          start_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          end_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          issued_by: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          issued_by_role: {
            type: DataTypes.ENUM('ADMIN', 'MODERATOR', 'SUPER_ADMIN'),
            allowNull: false,
          },
          report_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          moderator_action_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          appealed_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          appeal_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          appeal_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: true,
          },
          appeal_resolved_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          appeal_resolved_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          appeal_resolution: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          revoked_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          revoked_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          revocation_reason: {
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
          warning_count: {
            type: DataTypes.INTEGER,
            allowNull: true,
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

      await queryInterface.addIndex('user_sanctions', {
        fields: ['user_id'],
        name: 'user_sanctions_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', { fields: ['sanction_type'], transaction });
      await queryInterface.addIndex('user_sanctions', { fields: ['reason'], transaction });
      await queryInterface.addIndex('user_sanctions', { fields: ['is_active'], transaction });
      await queryInterface.addIndex('user_sanctions', { fields: ['start_date'], transaction });
      await queryInterface.addIndex('user_sanctions', { fields: ['end_date'], transaction });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['issued_by'],
        name: 'user_sanctions_issued_by_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['report_id'],
        name: 'user_sanctions_report_id_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['moderator_action_id'],
        name: 'user_sanctions_moderator_action_id_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['appeal_resolved_by'],
        name: 'user_sanctions_appeal_resolved_by_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['revoked_by'],
        name: 'user_sanctions_revoked_by_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', { fields: ['appeal_status'], transaction });
      await queryInterface.addIndex('user_sanctions', { fields: ['created_at'], transaction });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['user_id', 'is_active', 'end_date'],
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['created_by'],
        name: 'user_sanctions_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('user_sanctions', {
        fields: ['updated_by'],
        name: 'user_sanctions_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('user_sanctions');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_user_sanctions_sanction_type');
    await dropEnumTypeIfExists(sql, 'enum_user_sanctions_reason');
    await dropEnumTypeIfExists(sql, 'enum_user_sanctions_issued_by_role');
    await dropEnumTypeIfExists(sql, 'enum_user_sanctions_appeal_status');
  },
};
