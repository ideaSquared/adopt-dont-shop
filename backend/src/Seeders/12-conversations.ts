import { QueryInterface, QueryTypes } from 'sequelize'

export async function seed(queryInterface: QueryInterface) {
  const users = await queryInterface.sequelize.query<{ user_id: string }>(
    `SELECT user_id FROM users`,
    { type: QueryTypes.SELECT },
  )

  const pets = await queryInterface.sequelize.query<{ pet_id: string }>(
    `SELECT pet_id FROM pets`,
    { type: QueryTypes.SELECT },
  )

  // Create 10 conversations
  const conversations = Array.from({ length: 10 }, (_, index) => ({
    conversation_id: 'conversation_' + Math.random().toString(36).slice(2, 12),
    started_by: users[index % users.length].user_id, // Cycle through users
    pet_id: pets[index % pets.length].pet_id, // Cycle through pets
    last_message: `Last message text ${index + 1}`,
    last_message_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  }))

  await queryInterface.bulkInsert('conversations', conversations)

  // Fetch the inserted conversations
  const insertedConversations = await queryInterface.sequelize.query<{
    conversation_id: string
  }>(`SELECT conversation_id FROM conversations`, { type: QueryTypes.SELECT })

  // Create 5-10 messages for each conversation
  const messages = insertedConversations.flatMap((conversation, index) => {
    const numMessages = Math.floor(Math.random() * 6) + 5 // Random number between 5 and 10

    return Array.from({ length: numMessages }, (_, messageIndex) => ({
      message_id: 'message_' + Math.random().toString(36).slice(2, 12),
      conversation_id: conversation.conversation_id,
      sender_id: users[(index + messageIndex) % users.length].user_id, // Cycle through users
      message_text: `Message text ${messageIndex + 1} in conversation ${
        index + 1
      }`,
      sent_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }))
  })

  await queryInterface.bulkInsert('messages', messages)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('messages', {})
  await queryInterface.bulkDelete('conversations', {})
}

