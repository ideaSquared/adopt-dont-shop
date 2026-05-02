import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('messages', 'is_flagged', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn('messages', 'flag_reason', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('messages', 'flag_severity', {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
  });

  await queryInterface.addColumn('messages', 'moderation_status', {
    type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
    allowNull: true,
  });

  await queryInterface.addColumn('messages', 'flagged_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await queryInterface.addIndex('messages', ['is_flagged'], {
    name: 'messages_is_flagged_idx',
  });
  await queryInterface.addIndex('messages', ['flag_severity'], {
    name: 'messages_flag_severity_idx',
  });
  await queryInterface.addIndex('messages', ['moderation_status'], {
    name: 'messages_moderation_status_idx',
  });
  await queryInterface.addIndex('messages', ['is_flagged', 'moderation_status'], {
    name: 'messages_flagged_queue_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('messages', 'messages_flagged_queue_idx');
  await queryInterface.removeIndex('messages', 'messages_moderation_status_idx');
  await queryInterface.removeIndex('messages', 'messages_flag_severity_idx');
  await queryInterface.removeIndex('messages', 'messages_is_flagged_idx');

  await queryInterface.removeColumn('messages', 'flagged_at');
  await queryInterface.removeColumn('messages', 'moderation_status');
  await queryInterface.removeColumn('messages', 'flag_severity');
  await queryInterface.removeColumn('messages', 'flag_reason');
  await queryInterface.removeColumn('messages', 'is_flagged');
}
