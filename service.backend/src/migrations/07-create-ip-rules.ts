import { QueryInterface, DataTypes } from 'sequelize';

/**
 * ADS-108: IP allow/block lists for admin login enforcement.
 *
 * A rule matches when the request IP falls inside `cidr` (single
 * address or CIDR range, IPv4 or IPv6). `block` rules deny; `allow`
 * rules whitelist when at least one allow rule exists for the scope.
 * `expires_at` lets ops set a temporary block without scheduling a
 * cleanup; the runtime check ignores expired rows.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
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

    await queryInterface.addIndex('ip_rules', ['type', 'is_active'], {
      name: 'ip_rules_type_active_idx',
    });
    await queryInterface.addIndex('ip_rules', ['expires_at'], {
      name: 'ip_rules_expires_at_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('ip_rules');
  },
};
