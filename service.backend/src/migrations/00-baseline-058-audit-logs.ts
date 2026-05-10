import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — audit_logs (rebaseline 10/10, platform domain).
 *
 * Frozen snapshot of `AuditLog`'s sync() output. Notable shape:
 *   - INTEGER autoincrement PK (`id`) — not a UUID. AuditLog predates the
 *     UUIDv7 standardisation and stays on bigserial-style numeric ids.
 *   - `timestamps: false` — the model writes its own `timestamp` column
 *     (event time) instead of created_at/updated_at.
 *   - No audit columns, no `version`, no soft-delete. Append-only by design.
 *
 * Trigger installed by migration 11 (`11-add-audit-log-immutable-trigger.ts`)
 * is NOT included here. Sequelize cannot represent triggers natively; they
 * live in their post-baseline migration. See design doc Q6.
 *
 * Cross-table foreign keys — none for audit_logs. The `user` column is a
 * deliberate soft reference (the user may be deleted long after the log
 * row is written; the `user_email_snapshot` keeps the trail readable).
 */
const MIGRATION_KEY = '00-baseline-058-audit-logs';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'audit_logs',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          service: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          user: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          user_email_snapshot: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          action: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          level: {
            type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR'),
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM('success', 'failure'),
            allowNull: true,
          },
          timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'GENERAL',
          },
          ip_address: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          user_agent: {
            type: DataTypes.STRING,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('audit_logs', { fields: ['timestamp'], transaction: t });
      await queryInterface.addIndex('audit_logs', { fields: ['service'], transaction: t });
      await queryInterface.addIndex('audit_logs', { fields: ['level'], transaction: t });
      await queryInterface.addIndex('audit_logs', { fields: ['status'], transaction: t });
      await queryInterface.addIndex('audit_logs', { fields: ['category'], transaction: t });
      await queryInterface.addIndex('audit_logs', {
        fields: ['user'],
        name: 'audit_logs_user_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('audit_logs');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_audit_logs_level');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_audit_logs_status');
  },
};
