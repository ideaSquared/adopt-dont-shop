import { QueryInterface, QueryTypes } from 'sequelize'

type MessageAttachment = {
  attachment_id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

type ChatMessage = {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  content_format: 'plain' | 'markdown'
  attachments: MessageAttachment[]
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

  // Validate that we have users to work with
  if (users.length === 0) {
    throw new Error(
      'No users found in the database. Please ensure the users seeder has been run first.',
    )
  }

  // Log found users for debugging
  console.log(
    'Found users:',
    users.map((u) => ({ email: u.email, id: u.user_id })),
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

  // Get existing chat IDs with their creation times
  const chats = await queryInterface.sequelize.query<{
    chat_id: string
    created_at: Date
    updated_at: Date
  }>(
    `SELECT chat_id, created_at, updated_at FROM chats ORDER BY created_at DESC`,
    { type: QueryTypes.SELECT },
  )

  // Validate that we have chats to work with
  if (chats.length === 0) {
    throw new Error(
      'No chats found in the database. Please ensure the chats seeder has been run first.',
    )
  }

  // Log found chats for debugging
  console.log(
    'Found chats:',
    chats.map((c) => c.chat_id),
  )

  // Helper function to create a message
  const createMessage = (
    chatId: string,
    senderId: string | undefined,
    content: string,
    timestamp: Date,
    attachments: MessageAttachment[] = [],
  ): Omit<ChatMessage, 'message_id'> => {
    if (!senderId) throw new Error('Sender ID is required')
    return {
      chat_id: chatId,
      sender_id: senderId,
      content,
      content_format:
        content.includes('#') || content.includes('*') ? 'markdown' : 'plain',
      attachments: attachments,
      created_at: timestamp,
      updated_at: timestamp,
    }
  }

  const messages: Omit<ChatMessage, 'message_id'>[] = []
  const baseDelay = 2 * 60 * 1000 // 2 minutes in milliseconds

  // Add initial messages for each chat based on their chat_id
  chats.forEach((chat, index) => {
    const baseTime = new Date(chat.created_at).getTime()
    const isEvenChat = index % 2 === 0

    // Create initial messages for each chat
    messages.push(
      createMessage(
        chat.chat_id,
        isEvenChat ? regularUser1 : regularUser2,
        "Hi! I'm interested in adopting a pet. I've been looking through your available animals.",
        new Date(baseTime),
      ),
      createMessage(
        chat.chat_id,
        rescueManager1,
        'Hello! Thank you for your interest. What kind of pet are you looking for? We have several lovely animals available for adoption.',
        new Date(baseTime + baseDelay),
      ),
      createMessage(
        chat.chat_id,
        isEvenChat ? regularUser1 : regularUser2,
        "I'm particularly interested in a pet that would be good with children and other pets. Do you have any recommendations?",
        new Date(baseTime + baseDelay * 2),
      ),
      createMessage(
        chat.chat_id,
        staffUser,
        'We have several pets that would be perfect for a family environment! Let me share some information about our well-socialized pets.',
        new Date(baseTime + baseDelay * 3),
      ),
      createMessage(
        chat.chat_id,
        isEvenChat ? regularUser1 : regularUser2,
        'That sounds great! Could you tell me more about their energy levels and daily care requirements?',
        new Date(baseTime + baseDelay * 4),
      ),
      createMessage(
        chat.chat_id,
        petManager,
        "Here's our comprehensive guide about pet care and what to expect:",
        new Date(baseTime + baseDelay * 5),
        [
          {
            attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
            filename: 'pet_care_guide.pdf',
            originalName: 'comprehensive_pet_care_guide.pdf',
            mimeType: 'application/pdf',
            size: 2048000,
            url: 'https://example.com/uploads/pet_care_guide.pdf',
          },
        ],
      ),
      createMessage(
        chat.chat_id,
        isEvenChat ? regularUser1 : regularUser2,
        'Thank you for the guide! Would it be possible to schedule a visit to meet some of the pets in person?',
        new Date(baseTime + baseDelay * 6),
      ),
      createMessage(
        chat.chat_id,
        rescueManager1,
        'Of course! We have visiting hours every day from 10 AM to 4 PM. Would you like to schedule a specific time?',
        new Date(baseTime + baseDelay * 7),
      ),
    )
  })

  // Add follow-up messages to active chats
  const oneDay = 24 * 60 * 60 * 1000
  chats.forEach((chat) => {
    const lastMessageTime = new Date(chat.updated_at).getTime()
    const isActive = true // Make all chats active for seeding purposes

    if (isActive) {
      messages.push(
        createMessage(
          chat.chat_id,
          petManager,
          "# Weekly Care Reminder\n\nDon't forget to:\n- Update vaccination records\n- Schedule regular vet check-ups\n- Keep medical documents organized\n- Report any health concerns promptly",
          new Date(lastMessageTime + oneDay),
        ),
        createMessage(
          chat.chat_id,
          rescueManager1,
          "Just checking in! How's everything going with the adoption process? Let us know if you need any additional information or support.",
          new Date(lastMessageTime + oneDay + 3600000),
        ),
        createMessage(
          chat.chat_id,
          verifiedStaff,
          "Here's our latest guide on pet care and training resources:",
          new Date(lastMessageTime + oneDay + 7200000),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'pet_care_guide_2024.pdf',
              originalName: 'comprehensive_pet_care_guide.pdf',
              mimeType: 'application/pdf',
              size: 2048000,
              url: 'https://example.com/uploads/pet_care_guide_2024.pdf',
            },
          ],
        ),
        // Add comprehensive Markdown test message
        createMessage(
          chat.chat_id,
          staffUser,
          `# Markdown Formatting Guide

## Text Formatting

Here's how to use **bold**, *italic*, and ~~strikethrough~~ text.
You can also use _underline_ for emphasis.

## Lists

Unordered list:
* First item
* Second item
* Third item with **bold** text

Numbered list:
1. First step
2. Second step
3. Third step with *italic* text

## Code Examples

Inline code: \`npm install\`

Code block:
\`\`\`
function greet(name) {
  return "Hello, " + name + "!";
}
\`\`\`

## Links

Visit our [adoption page](https://example.com/adopt) for more information.

## Headers

### Level 3 Header
#### Level 4 Header

## Mixed Formatting

* List with [link](https://example.com)
* Item with \`inline code\`
* **Bold item** with *italic* text

Remember to check our documentation for more details!`,
          new Date(lastMessageTime + oneDay + 10800000),
        ),
      )
    }
  })

  // Add validation and debug logging
  if (messages.length === 0) {
    throw new Error('No messages to insert - the messages array is empty')
  }

  // Transform messages array to match the model requirements
  const messagesToInsert = messages.map((msg) => {
    // Validate required fields
    if (!msg.chat_id) throw new Error('chat_id is required')
    if (!msg.sender_id) throw new Error('sender_id is required')
    if (!msg.content) throw new Error('content is required')
    if (!msg.content_format) throw new Error('content_format is required')

    // Convert attachments to JSONB string
    const attachmentsJson = JSON.stringify(msg.attachments || [])

    return {
      chat_id: msg.chat_id,
      sender_id: msg.sender_id,
      content: msg.content,
      content_format: msg.content_format,
      attachments: attachmentsJson,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
    }
  })

  // Log the first message for debugging
  console.log(
    'First message to insert:',
    JSON.stringify(messagesToInsert[0], null, 2),
  )
  console.log('Total messages to insert:', messagesToInsert.length)

  try {
    await queryInterface.bulkInsert('messages', messagesToInsert, {})
  } catch (error) {
    console.error('Error details:', {
      error,
      firstMessage: messagesToInsert[0],
      messageCount: messagesToInsert.length,
    })
    throw error
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('messages', {})
}
