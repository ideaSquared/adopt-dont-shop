import { QueryInterface, DataTypes } from 'sequelize';

/**
 * GDPR Art. 7 — consent audit trail.
 *
 * Append-only event log: each grant / withdrawal is a new row. The
 * latest row per (user_id, purpose) is the user's current state.
 *
 * Idempotency note (per-model rebaseline coexistence): the new
 * `00-baseline-055-user-consents.ts` baseline freezes today's `sync()`
 * output for `user_consents`, which DOES include the `version` column and
 * `*_created_by_idx` / `*_updated_by_idx` audit indexes that this older
 * migration omits. The two definitions intentionally diverge — the
 * baseline is source-of-truth (it mirrors what `withAuditHooks` emits
 * today), and on fresh DBs the baseline runs first. To keep this
 * migration safe to run against either schema, it now precheck-skips when
 * `user_consents` already exists. On existing DBs created by the legacy
 * monolithic `00-baseline.ts` (where neither file has run), the
 * `createTable` + `addIndex` still execute as before.
 *
 * `down()` is intentionally unchanged. Per the design doc, rollback for
 * the rebaseline-coexistent migrations is via DB backup, not
 * `db:migrate:undo`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'user_consents'`
    );
    if ((existing as unknown[]).length > 0) {
      // Table already exists (created by per-model baseline). The
      // baseline produces a superset of the columns/indexes we would have
      // added here, so there is nothing to do.
      return;
    }

    await queryInterface.createTable('user_consents', {
      consent_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      purpose: {
        type: DataTypes.ENUM('marketing_email', 'analytics', 'third_party_sharing', 'profiling'),
        allowNull: false,
      },
      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      policy_version: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
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
    });

    await queryInterface.addIndex('user_consents', ['user_id', 'purpose', 'created_at'], {
      name: 'user_consents_user_purpose_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('user_consents');
  },
};
