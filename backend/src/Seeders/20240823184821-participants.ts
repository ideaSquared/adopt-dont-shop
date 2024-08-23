import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  // Fetch necessary data from the database
  const users = await queryInterface.sequelize.query<{
    user_id: string
    email: string
  }>(`SELECT user_id, email FROM users`, { type: QueryTypes.SELECT })

  const conversations = await queryInterface.sequelize.query<{
    conversation_id: string
  }>(`SELECT conversation_id FROM conversations`, { type: QueryTypes.SELECT })

  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues`,
    { type: QueryTypes.SELECT },
  )

  // Create participants for conversations
  const conversationParticipants = conversations.flatMap(
    (conversation, index) => {
      return users.slice(0, 3).map((user, userIndex) => ({
        participant_id:
          'participant_' + Math.random().toString(36).slice(2, 12),
        user_id: user.user_id,
        conversation_id: conversation.conversation_id,
        participant_type: 'conversation',
        created_at: new Date(),
        updated_at: new Date(),
      }))
    },
  )

  // Create participants for rescues
  const rescueParticipants = rescues.flatMap((rescue, index) => {
    return users.slice(3, 5).map((user, userIndex) => ({
      participant_id: 'participant_' + Math.random().toString(36).slice(2, 12),
      user_id: user.user_id,
      rescue_id: rescue.rescue_id,
      participant_type: 'rescue',
      created_at: new Date(),
      updated_at: new Date(),
    }))
  })

  const participants = [...conversationParticipants, ...rescueParticipants]

  // Insert all participants into the database
  await queryInterface.bulkInsert('participants', participants)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('participants', {})
}
