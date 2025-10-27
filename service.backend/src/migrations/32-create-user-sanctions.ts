import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('user_sanctions', {
    sanction_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    issued_by_role: {
      type: DataTypes.ENUM('ADMIN', 'MODERATOR', 'SUPER_ADMIN'),
      allowNull: false,
    },
    report_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'reports',
        key: 'report_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    moderator_action_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'moderator_actions',
        key: 'action_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
  });

  // Add indexes for performance
  await queryInterface.addIndex('user_sanctions', ['user_id']);
  await queryInterface.addIndex('user_sanctions', ['sanction_type']);
  await queryInterface.addIndex('user_sanctions', ['reason']);
  await queryInterface.addIndex('user_sanctions', ['is_active']);
  await queryInterface.addIndex('user_sanctions', ['start_date']);
  await queryInterface.addIndex('user_sanctions', ['end_date']);
  await queryInterface.addIndex('user_sanctions', ['issued_by']);
  await queryInterface.addIndex('user_sanctions', ['report_id']);
  await queryInterface.addIndex('user_sanctions', ['moderator_action_id']);
  await queryInterface.addIndex('user_sanctions', ['appeal_status']);
  await queryInterface.addIndex('user_sanctions', ['created_at']);
  // Composite index for finding active sanctions for a user
  await queryInterface.addIndex('user_sanctions', ['user_id', 'is_active', 'end_date']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('user_sanctions');
}
