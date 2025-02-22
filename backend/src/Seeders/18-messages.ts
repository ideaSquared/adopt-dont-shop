import { QueryInterface, QueryTypes } from 'sequelize'

type ChatMessage = {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  content_format: 'plain' | 'markdown'
  attachments: string
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

  // Get existing chat IDs with their creation times
  const chats = await queryInterface.sequelize.query<{
    chat_id: string
    created_at: Date
    updated_at: Date
  }>(
    `SELECT chat_id, created_at, updated_at FROM chats ORDER BY created_at DESC`,
    { type: QueryTypes.SELECT },
  )

  // Helper function to create a message
  const createMessage = (
    chatId: string,
    senderId: string | undefined,
    content: string,
    timestamp: Date,
    attachments: any[] = [],
  ): ChatMessage => {
    if (!senderId) throw new Error('Sender ID is required')
    return {
      message_id: 'message_' + Math.random().toString(36).slice(2, 12),
      chat_id: chatId,
      sender_id: senderId,
      content,
      content_format:
        content.includes('#') || content.includes('*') ? 'markdown' : 'plain',
      attachments: JSON.stringify(attachments),
      created_at: timestamp,
      updated_at: timestamp,
    }
  }

  const messages: ChatMessage[] = []
  const baseDelay = 2 * 60 * 1000 // 2 minutes in milliseconds

  // Add initial messages for each chat based on their chat_id
  chats.forEach((chat) => {
    const baseTime = new Date(chat.created_at).getTime()

    if (chat.chat_id.includes('chat_max_')) {
      // Max's adoption discussion
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser1,
          "Hi! I'm very interested in adopting Max. I've just submitted my application.",
          new Date(baseTime),
        ),
        createMessage(
          chat.chat_id,
          rescueManager1,
          'Hello! Thank you for your interest in Max. I can see your application and it looks great so far. Do you have any specific questions about him?',
          new Date(baseTime + baseDelay),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          "Yes! I noticed he's good with other dogs. Could you tell me more about his energy level and exercise needs?",
          new Date(baseTime + baseDelay * 2),
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          'Hi there! I actually work directly with Max. He has moderate energy levels and needs about 1-2 hours of exercise daily. He loves playing fetch and going for walks!',
          new Date(baseTime + baseDelay * 3),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          'That sounds perfect for our lifestyle! We have a fenced yard and I work from home.',
          new Date(baseTime + baseDelay * 4),
        ),
        createMessage(
          chat.chat_id,
          rescueManager1,
          "That's great to hear! Would you be open to a home visit next week? We'd love to see your setup and introduce Max to his potential new home.",
          new Date(baseTime + baseDelay * 5),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          "Yes, absolutely! I'm available any afternoon next week. Here's a photo of our yard:",
          new Date(baseTime + baseDelay * 6),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'backyard.jpg',
              originalName: 'IMG_20240301_120000.jpg',
              mimeType: 'image/jpeg',
              size: 2048000,
              url: 'https://example.com/uploads/backyard.jpg',
            },
          ],
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          "The yard looks great! Max would love that space. I've been working on his training, and he's really good with basic commands.",
          new Date(baseTime + baseDelay * 7),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          "That's impressive! Does he have any favorite toys or games?",
          new Date(baseTime + baseDelay * 8),
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          "He absolutely loves his rope toy and tennis balls. Here's a video of him playing:",
          new Date(baseTime + baseDelay * 9),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'max_playing.mp4',
              originalName: 'VID_20240301_140000.mp4',
              mimeType: 'video/mp4',
              size: 4096000,
              url: 'https://example.com/uploads/max_playing.mp4',
            },
          ],
        ),
        // Additional messages for Max's chat
        createMessage(
          chat.chat_id,
          regularUser1,
          "He's so playful! What about his interactions with children? We occasionally have young nieces and nephews visiting.",
          new Date(baseTime + baseDelay * 10),
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          "Max is wonderful with children! He's very gentle and patient. We often have kids at the rescue, and he's always been a favorite.",
          new Date(baseTime + baseDelay * 11),
        ),
        createMessage(
          chat.chat_id,
          petManager,
          "I can confirm that. Here's a recent photo of Max during our kids' reading program:",
          new Date(baseTime + baseDelay * 12),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'max_with_kids.jpg',
              originalName: 'IMG_20240301_150000.jpg',
              mimeType: 'image/jpeg',
              size: 2048000,
              url: 'https://example.com/uploads/max_with_kids.jpg',
            },
          ],
        ),
      )
    } else if (chat.chat_id.includes('chat_luna_')) {
      // Luna's follow-up messages
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser2,
          "# 2-Week Update on Luna\n\nJust wanted to share how well Luna is settling in! She's already learned to use her new cat tree and is sleeping in our bed every night. 🐱",
          new Date(baseTime),
        ),
        createMessage(
          chat.chat_id,
          petManager,
          "That's wonderful to hear! How is she doing with the transition to her new environment?",
          new Date(baseTime + baseDelay),
        ),
        createMessage(
          chat.chat_id,
          regularUser2,
          "She's adapted amazingly well! She found her favorite sunny spot by the window and loves watching birds.",
          new Date(baseTime + baseDelay * 2),
        ),
        createMessage(
          chat.chat_id,
          rescueManager1,
          "That's exactly what we hoped for! Have you noticed any changes in her behavior since the first few days?",
          new Date(baseTime + baseDelay * 3),
        ),
        createMessage(
          chat.chat_id,
          regularUser2,
          "Yes, she's become much more confident! She now greets visitors at the door and has claimed the entire house as her territory.",
          new Date(baseTime + baseDelay * 4),
        ),
        // Additional messages for Luna's chat
        createMessage(
          chat.chat_id,
          petManager,
          "That's great progress! How is she doing with her diet? Remember she was on that special food we discussed.",
          new Date(baseTime + baseDelay * 5),
        ),
        createMessage(
          chat.chat_id,
          regularUser2,
          "She's loving the recommended food! I've been mixing in some wet food as a treat occasionally. Is that okay?",
          new Date(baseTime + baseDelay * 6),
        ),
        createMessage(
          chat.chat_id,
          petManager,
          "Yes, that's perfect! Just keep it to small amounts as treats. Here's our recommended wet food brands:",
          new Date(baseTime + baseDelay * 7),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'cat_food_recommendations.pdf',
              originalName: 'recommended_cat_food_2024.pdf',
              mimeType: 'application/pdf',
              size: 1024000,
              url: 'https://example.com/uploads/cat_food_recommendations.pdf',
            },
          ],
        ),
      )
    } else if (chat.chat_id.includes('chat_seniors_')) {
      // Senior cats inquiry - Additional messages
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser1,
          "I'm particularly interested in senior cats because I work from home and can provide a quiet, peaceful environment.",
          new Date(baseTime + baseDelay * 4),
        ),
        createMessage(
          chat.chat_id,
          verifiedStaff,
          "That's wonderful! Senior cats often get overlooked, but they make amazing companions. Would you like to know more about their medical needs?",
          new Date(baseTime + baseDelay * 5),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          'Yes, please! I want to make sure I can provide proper care.',
          new Date(baseTime + baseDelay * 6),
        ),
        createMessage(
          chat.chat_id,
          petManager,
          "Here's a detailed guide about caring for senior cats:",
          new Date(baseTime + baseDelay * 7),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'senior_cat_care.pdf',
              originalName: 'senior_cat_care_guide.pdf',
              mimeType: 'application/pdf',
              size: 1536000,
              url: 'https://example.com/uploads/senior_cat_care.pdf',
            },
          ],
        ),
      )
    } else if (chat.chat_id.includes('chat_daisy_')) {
      // Daisy's adoption chat
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser2,
          'Hi, I submitted an application for Daisy yesterday. Just wanted to check if you received it?',
          new Date(baseTime),
        ),
        // ... Add all Daisy's chat messages here
      )
    } else if (chat.chat_id.includes('chat_buddy_mittens_')) {
      // Buddy & Mittens bonded pair - Additional messages
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser1,
          "I'm curious about their daily routine. How do they interact with each other?",
          new Date(baseTime + baseDelay * 4),
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          "They're inseparable! Buddy is very protective of Mittens, and she helps keep him calm. Here's their typical day:",
          new Date(baseTime + baseDelay * 5),
        ),
        createMessage(
          chat.chat_id,
          staffUser,
          '# Daily Schedule\n- 7 AM: Wake up and breakfast\n- 8 AM: Morning walk (Buddy) while Mittens watches from the window\n- 9 AM: Play time together\n- 12 PM: Shared nap time\n- 3 PM: Individual play sessions\n- 6 PM: Evening walk and dinner\n- 8 PM: Cuddle time',
          new Date(baseTime + baseDelay * 6),
        ),
        createMessage(
          chat.chat_id,
          regularUser1,
          "That's adorable! Do they share food bowls or need separate feeding areas?",
          new Date(baseTime + baseDelay * 7),
        ),
        createMessage(
          chat.chat_id,
          petManager,
          "They each need their own feeding area, but they like to eat at the same time. Here's our feeding guide:",
          new Date(baseTime + baseDelay * 8),
          [
            {
              attachment_id: 'att_' + Math.random().toString(36).slice(2, 12),
              filename: 'feeding_guide.pdf',
              originalName: 'bonded_pair_feeding_guide.pdf',
              mimeType: 'application/pdf',
              size: 1024000,
              url: 'https://example.com/uploads/feeding_guide.pdf',
            },
          ],
        ),
      )
    } else if (chat.chat_id.includes('chat_rocky_')) {
      // Rocky's chat
      messages.push(
        createMessage(
          chat.chat_id,
          regularUser2,
          "Hi, I'm interested in adopting Rocky. Could you tell me more about him?",
          new Date(baseTime),
        ),
        // ... Add all Rocky's chat messages here
      )
    }
  })

  // Add follow-up messages to active chats
  const oneDay = 24 * 60 * 60 * 1000
  chats.forEach((chat) => {
    const lastMessageTime = new Date(chat.updated_at).getTime()
    const isActive = lastMessageTime > Date.now() - 7 * oneDay // Within last week

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
      )
    }
  })

  await queryInterface.bulkInsert('messages', messages)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('messages', {})
}
