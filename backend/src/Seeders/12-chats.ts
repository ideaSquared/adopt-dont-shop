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

  // Get some application IDs
  const applications = await queryInterface.sequelize.query<{
    application_id: string
  }>(`SELECT application_id FROM applications LIMIT 3`, {
    type: QueryTypes.SELECT,
  })

  // Get rescue IDs
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues LIMIT 2`,
    { type: QueryTypes.SELECT },
  )

  if (!rescues.length) {
    throw new Error('No rescues found in the database')
  }

  // Create chats with meaningful data
  const chats = [
    {
      chat_id: 'chat_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[0]?.application_id || null,
      rescue_id: rescues[0].rescue_id,
      status: 'active',
      created_at: new Date('2024-02-01T10:00:00Z'),
      updated_at: new Date('2024-02-01T10:00:00Z'),
    },
    {
      chat_id: 'chat_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[1]?.application_id || null,
      rescue_id: rescues[0].rescue_id,
      status: 'active',
      created_at: new Date('2024-02-02T11:00:00Z'),
      updated_at: new Date('2024-02-02T11:00:00Z'),
    },
    {
      chat_id: 'chat_' + Math.random().toString(36).slice(2, 12),
      application_id: null, // General chat not tied to application
      rescue_id: rescues[1].rescue_id,
      status: 'active',
      created_at: new Date('2024-02-03T12:00:00Z'),
      updated_at: new Date('2024-02-03T12:00:00Z'),
    },
    {
      chat_id: 'chat_' + Math.random().toString(36).slice(2, 12),
      application_id: applications[2]?.application_id || null,
      rescue_id: rescues[1].rescue_id,
      status: 'archived',
      created_at: new Date('2024-02-04T13:00:00Z'),
      updated_at: new Date('2024-02-04T13:00:00Z'),
    },
  ]

  await queryInterface.bulkInsert('chats', chats)

  // Create messages for each chat
  const regularUser1 = users.find((u) => u.user_id)?.user_id
  const regularUser2 = users[1]?.user_id
  const rescueStaff1 = users[2]?.user_id
  const rescueStaff2 = users[3]?.user_id

  const messages = chats.flatMap((chat, index) => {
    // Create a conversation flow for each chat
    const baseMessages = [
      {
        message_id: 'message_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        sender_id: regularUser1,
        content: "Hi, I'm interested in adopting a pet!",
        content_format: 'plain',
        attachments: JSON.stringify([]),
        created_at: new Date(chat.created_at.getTime() + 1000),
        updated_at: new Date(chat.created_at.getTime() + 1000),
      },
      {
        message_id: 'message_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        sender_id: rescueStaff1,
        content: "That's wonderful! What kind of pet are you looking for?",
        content_format: 'plain',
        attachments: JSON.stringify([]),
        created_at: new Date(chat.created_at.getTime() + 2000),
        updated_at: new Date(chat.created_at.getTime() + 2000),
      },
      {
        message_id: 'message_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        sender_id: regularUser1,
        content: "I'm looking for a dog that's good with children.",
        content_format: 'plain',
        attachments: JSON.stringify([]),
        created_at: new Date(chat.created_at.getTime() + 3000),
        updated_at: new Date(chat.created_at.getTime() + 3000),
      },
    ]

    // Add some variation based on chat status
    if (chat.status === 'archived') {
      baseMessages.push({
        message_id: 'message_' + Math.random().toString(36).slice(2, 12),
        chat_id: chat.chat_id,
        sender_id: rescueStaff1,
        content:
          "I'm marking this chat as archived as the adoption process is complete.",
        content_format: 'plain',
        attachments: JSON.stringify([]),
        created_at: new Date(chat.created_at.getTime() + 4000),
        updated_at: new Date(chat.created_at.getTime() + 4000),
      })
    }

    return baseMessages
  })

  await queryInterface.bulkInsert('messages', messages)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Delete in correct order due to foreign key constraints
  await queryInterface.bulkDelete('messages', {})
  await queryInterface.bulkDelete('chats', {})
}
