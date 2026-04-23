import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Adds a nullable rescue_id column to chat_participants so rescue-role
 * participants can be scoped to a specific rescue. Nullable to keep the
 * migration additive — existing rows are left untouched and application
 * code treats missing rescue_id as "not yet scoped" until a future backfill.
 *
 * Future work: a follow-up migration should backfill rescue_id from
 * chats.rescue_id for rows where chat_participants.role='rescue', and
 * then authorization code can start enforcing the constraint.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDescription = await queryInterface.describeTable('chat_participants');

  if (!tableDescription['rescue_id']) {
    await queryInterface.addColumn('chat_participants', 'rescue_id', {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('chat_participants', ['rescue_id'], {
      name: 'chat_participants_rescue_id_idx',
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('chat_participants', 'chat_participants_rescue_id_idx');
  await queryInterface.removeColumn('chat_participants', 'rescue_id');
}
