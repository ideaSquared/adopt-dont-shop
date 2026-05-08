import { QueryInterface, DataTypes } from 'sequelize';

/**
 * GDPR Art. 7 — consent audit trail.
 *
 * Append-only event log: each grant / withdrawal is a new row. The
 * latest row per (user_id, purpose) is the user's current state.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
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
