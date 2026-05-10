import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `ip_rules`.
 *
 * The model declares `cidr` as native Postgres CIDR (the legacy
 * `07-create-ip-rules.ts` initially used VARCHAR(64); migration 13
 * promoted it). The model has no `indexes:` block — the legacy
 * `07-create-ip-rules.ts` migration adds `ip_rules_type_active_idx` and
 * `ip_rules_expires_at_idx`. Those indexes are NOT declared on the model,
 * so a faithful `sync()` reproduction does not include them here. The
 * legacy migration 07 (kept unchanged) creates those indexes when it runs
 * against a fresh DB after this baseline.
 *
 * Cross-table FK to `users.user_id` (`created_by`) lives in
 * `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-008-ip-rules';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'ip_rules',
        {
          ip_rule_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
          },
          type: {
            type: DataTypes.ENUM('allow', 'block'),
            allowNull: false,
          },
          cidr: {
            type: DataTypes.CIDR,
            allowNull: false,
          },
          label: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          created_by: {
            type: DataTypes.UUID,
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
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('ip_rules', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_ip_rules_type');
  },
};
