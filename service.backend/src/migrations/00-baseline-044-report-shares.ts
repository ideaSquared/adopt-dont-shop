import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — report_shares (rebaseline 7/10).
 *
 * Frozen snapshot of `ReportShare`'s sync() output. Cross-table FKs
 * (saved_report_id, shared_with_user_id, created_by, updated_by) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * `report_shares_token_hash_idx` (plain B-tree on `token_hash`) IS in the
 * model's index list and IS therefore part of `sync()` output, so it is
 * recreated here. Post-baseline migration 15 (ADS-505) drops this plain
 * index and replaces it with a partial UNIQUE index
 * (`report_shares_token_hash_unique_idx`) — that unique index is NOT in
 * the model and NOT in this baseline; it remains the responsibility of
 * migration 15. Same pattern D1 followed for `ip_rules`.
 *
 * Paranoid: deleted_at column included. withAuditHooks contributes
 * created_by / updated_by / version + FK-column indexes.
 */
const MIGRATION_KEY = '00-baseline-044-report-shares';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'report_shares',
        {
          share_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          saved_report_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          share_type: {
            type: DataTypes.ENUM('user', 'token'),
            allowNull: false,
          },
          shared_with_user_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          token_hash: {
            type: DataTypes.STRING(128),
            allowNull: true,
          },
          permission: {
            type: DataTypes.ENUM('view', 'edit'),
            allowNull: false,
            defaultValue: 'view',
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          revoked_at: {
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
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('report_shares', {
        fields: ['saved_report_id'],
        name: 'report_shares_saved_report_idx',
        transaction,
      });
      await queryInterface.addIndex('report_shares', {
        fields: ['shared_with_user_id'],
        name: 'report_shares_shared_with_user_idx',
        transaction,
      });
      await queryInterface.addIndex('report_shares', {
        fields: ['token_hash'],
        name: 'report_shares_token_hash_idx',
        transaction,
      });
      await queryInterface.addIndex('report_shares', {
        fields: ['created_by'],
        name: 'report_shares_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('report_shares', {
        fields: ['updated_by'],
        name: 'report_shares_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('report_shares');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_report_shares_share_type');
    await dropEnumTypeIfExists(sql, 'enum_report_shares_permission');
  },
};
