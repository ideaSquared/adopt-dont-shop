import { QueryInterface, QueryTypes } from 'sequelize'

type ChatParticipant = {
  chat_participant_id: string
  chat_id: string
  participant_id: string
  role: 'user' | 'rescue'
  last_read_at: Date
  created_at: Date
  updated_at: Date
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Get user IDs for regular users and rescue staff
  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(
    `SELECT user_id, email FROM users WHERE email IN (
      'user1@example.com',
      'user2@example.com',
      'rescue.manager@example.com',
      'staff.user@example.com',
      'staff.verifieduser@example.com',
      'rescue.manager2@example.com',
      'pet.manager@example.com'
    )`,
    { type: QueryTypes.SELECT },
  )

  const regularUser1 = users.find(
    (u) => u.email === 'user1@example.com',
  )?.user_id
  const regularUser2 = users.find(
    (u) => u.email === 'user2@example.com',
  )?.user_id
  const rescueManager1 = users.find(
    (u) => u.email === 'rescue.manager@example.com',
  )?.user_id
  const rescueManager2 = users.find(
    (u) => u.email === 'rescue.manager2@example.com',
  )?.user_id
  const staffUser = users.find(
    (u) => u.email === 'staff.user@example.com',
  )?.user_id
  const verifiedStaff = users.find(
    (u) => u.email === 'staff.verifieduser@example.com',
  )?.user_id
  const petManager = users.find(
    (u) => u.email === 'pet.manager@example.com',
  )?.user_id

  // Get existing chat IDs
  const chats = await queryInterface.sequelize.query<{ chat_id: string }>(
    `SELECT chat_id FROM chats ORDER BY created_at DESC`,
    { type: QueryTypes.SELECT },
  )

  // Create chat participants for each chat
  const chatParticipants: ChatParticipant[] = chats.flatMap((chat, index) => {
    const participants: ChatParticipant[] = []
    const now = new Date()

    // Helper function to add a participant
    const addParticipant = (
      userId: string | undefined,
      role: 'user' | 'rescue',
    ) => {
      if (userId) {
        participants.push({
          chat_participant_id:
            'participant_' + Math.random().toString(36).slice(2, 12),
          chat_id: chat.chat_id,
          participant_id: userId,
          role,
          last_read_at: now,
          created_at: now,
          updated_at: now,
        })
      }
    }

    // Add participants based on chat index (matching the chat scenarios from the chat seeder)
    if (index === 0) {
      // Active application discussion
      addParticipant(regularUser1, 'user')
      addParticipant(rescueManager1, 'rescue')
      addParticipant(staffUser, 'rescue')
    } else if (index === 1) {
      // Follow-up chat about adopted pet
      addParticipant(regularUser2, 'user')
      addParticipant(petManager, 'rescue')
      addParticipant(rescueManager1, 'rescue')
    } else if (index === 2) {
      // General inquiry about available pets
      addParticipant(regularUser1, 'user')
      addParticipant(rescueManager2, 'rescue')
      addParticipant(verifiedStaff, 'rescue')
    } else if (index === 3) {
      // Archived successful adoption
      addParticipant(regularUser2, 'user')
      addParticipant(rescueManager2, 'rescue')
      addParticipant(staffUser, 'rescue')
    } else if (index === 4) {
      // Active chat about multiple pets
      addParticipant(regularUser1, 'user')
      addParticipant(rescueManager1, 'rescue')
      addParticipant(petManager, 'rescue')
      addParticipant(staffUser, 'rescue')
    } else if (index === 5) {
      // Recently archived chat
      addParticipant(regularUser2, 'user')
      addParticipant(rescueManager2, 'rescue')
      addParticipant(staffUser, 'rescue')
    }

    return participants
  })

  await queryInterface.bulkInsert('chat_participants', chatParticipants)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('chat_participants', {})
}
