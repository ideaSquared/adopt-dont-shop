import { Op, QueryInterface, QueryTypes } from 'sequelize'

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
    `SELECT chat_id FROM chats ORDER BY created_at DESC LIMIT 3`,
    { type: QueryTypes.SELECT },
  )

  // Add additional messages to existing chats
  const additionalMessages = [
    {
      message_id: 'message_' + Math.random().toString(36).slice(2, 12),
      chat_id: chats[0].chat_id,
      sender_id: regularUser1,
      content:
        '# My Pet Preferences\n\n- Medium to large size\n- Good with children\n- Active lifestyle',
      content_format: 'markdown',
      attachments: JSON.stringify([]),
      created_at: new Date('2024-02-01T10:15:00Z'),
      updated_at: new Date('2024-02-01T10:15:00Z'),
    },
    {
      message_id: 'message_' + Math.random().toString(36).slice(2, 12),
      chat_id: chats[1].chat_id,
      sender_id: rescueStaff2,
      content: "Here's Max's latest photo and medical records",
      content_format: 'plain',
      attachments: JSON.stringify([
        {
          attachment_id: 'att_1',
          filename: 'max_photo.jpg',
          originalName: 'max_recent.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          url: 'https://example.com/uploads/max_photo.jpg',
        },
        {
          attachment_id: 'att_2',
          filename: 'max_medical.pdf',
          originalName: 'medical_records.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          url: 'https://example.com/uploads/max_medical.pdf',
        },
      ]),
      created_at: new Date('2024-02-02T11:20:00Z'),
      updated_at: new Date('2024-02-02T11:20:00Z'),
    },
    {
      message_id: 'message_' + Math.random().toString(36).slice(2, 12),
      chat_id: chats[2].chat_id,
      sender_id: regularUser2,
      content:
        "I adopted a 10-year-old cat last year. They're wonderful companions!",
      content_format: 'plain',
      attachments: JSON.stringify([]),
      created_at: new Date('2024-02-03T12:05:00Z'),
      updated_at: new Date('2024-02-03T12:05:00Z'),
    },
  ]

  await queryInterface.bulkInsert('messages', additionalMessages)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // We don't want to delete all messages, just the ones we added
  const createdAt = new Date('2024-02-01T10:15:00Z')
  await queryInterface.bulkDelete('messages', {
    created_at: {
      [Op.gte]: createdAt,
    },
  })
}
