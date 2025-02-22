import { QueryInterface, QueryTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Get user IDs for regular users and rescue staff
  const users = await queryInterface.sequelize.query<{ user_id: string }>(
    `SELECT user_id FROM users WHERE email IN (
      'user1@example.com',
      'user2@example.com',
      'rescue.manager@example.com',
      'staff.user@example.com'
    )`,
    { type: QueryTypes.SELECT },
  )

  const regularUser1 = users.find((u) => u.user_id)?.user_id
  const regularUser2 = users[1]?.user_id
  const rescueStaff1 = users[2]?.user_id
  const rescueStaff2 = users[3]?.user_id

  // Get existing chat IDs
  const chats = await queryInterface.sequelize.query<{ chat_id: string }>(
    `SELECT chat_id FROM chats ORDER BY created_at DESC`,
    { type: QueryTypes.SELECT },
  )

  // Create chat participants for each chat
  const chatParticipants = chats.flatMap((chat) => {
    const baseParticipants = [
      {
        chat_participant_id:
          'participant_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        participant_id: regularUser1,
        role: 'user',
        last_read_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        chat_participant_id:
          'participant_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        participant_id: rescueStaff1,
        role: 'rescue',
        last_read_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    // Add additional participants to some chats for variety
    if (Math.random() > 0.5) {
      baseParticipants.push({
        chat_participant_id:
          'participant_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        participant_id: rescueStaff2,
        role: 'rescue',
        last_read_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    return baseParticipants
  })

  await queryInterface.bulkInsert('chat_participants', chatParticipants)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('chat_participants', {})
}
