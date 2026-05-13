import { DataTypes, type QueryInterface } from 'sequelize';

/**
 * ADS-108: IP allow/block lists for admin login enforcement.
 *
 * A rule matches when the request IP falls inside `cidr` (single
 * address or CIDR range, IPv4 or IPv6). `block` rules deny; `allow`
 * rules whitelist when at least one allow rule exists for the scope.
 * `expires_at` lets ops set a temporary block without scheduling a
 * cleanup; the runtime check ignores expired rows.
 *
 * Idempotency note (follow-up to #451 / #454): the per-model rebaseline
 * ships `00-baseline-008-ip-rules.ts`, which creates the same table for
 * fresh DBs. On a fresh DB the baseline runs first and this migration's
 * `createTable` would collide. Wrapped in an `information_schema.tables`
 * precheck so it no-ops when the table already exists, mirroring the
 * pattern PR #451 used for migration 12. Indexes also gated by
 * `CREATE INDEX IF NOT EXISTS`.
 *
 * `down()` is intentionally unchanged.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;

    const [existing] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'ip_rules'`
    );
    const tableAlreadyExists = (existing as unknown[]).length > 0;

    if (!tableAlreadyExists) {
      await queryInterface.createTable('ip_rules', {
        ip_rule_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        type: {
          type: DataTypes.ENUM('allow', 'block'),
          allowNull: false,
        },
        cidr: {
          type: DataTypes.STRING(64),
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
    }

    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "ip_rules_type_active_idx" ON "ip_rules" ("type", "is_active")'
    );
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "ip_rules_expires_at_idx" ON "ip_rules" ("expires_at")'
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('ip_rules');
  },
};
