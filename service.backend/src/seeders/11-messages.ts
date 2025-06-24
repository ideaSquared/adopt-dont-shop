import Message from '../models/Message';

const messageData = [
  // Messages for Buddy application chat
  {
    message_id: 'msg_001',
    chat_id: 'chat_buddy_john_001',
    sender_id: 'user_adopter_001',
    content: 'Hi! I submitted an application for Buddy. When might I hear back about next steps?',
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-15T14:30:00Z'),
    updated_at: new Date('2024-02-15T14:30:00Z'),
  },
  {
    message_id: 'msg_002',
    chat_id: 'chat_buddy_john_001',
    sender_id: 'user_rescue_staff_001',
    content:
      'Hi John! Thanks for your application for Buddy. We received it and will review it within 2-3 business days. Your application looks very complete!',
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-16T09:15:00Z'),
    updated_at: new Date('2024-02-16T09:15:00Z'),
  },
  {
    message_id: 'msg_003',
    chat_id: 'chat_buddy_john_001',
    sender_id: 'user_adopter_001',
    content:
      "Thank you! I have a couple of questions about Buddy's exercise needs. The profile mentions he needs 2+ hours daily - is this all active exercise or does it include mental stimulation activities?",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-16T10:30:00Z'),
    updated_at: new Date('2024-02-16T10:30:00Z'),
  },
  {
    message_id: 'msg_004',
    chat_id: 'chat_buddy_john_001',
    sender_id: 'user_rescue_staff_001',
    content:
      'Great question! The 2+ hours includes both physical exercise and mental stimulation. Buddy loves puzzle toys, training sessions, and interactive play. About 1 hour of that should be active exercise like walks or fetch, and the rest can be training, puzzle games, or just quality interaction time.',
    message_type: 'text',
    is_read: false,
    created_at: new Date('2024-02-16T15:45:00Z'),
    updated_at: new Date('2024-02-16T15:45:00Z'),
  },

  // Messages for Whiskers adoption (completed)
  {
    message_id: 'msg_005',
    chat_id: 'chat_whiskers_emily_001',
    sender_id: 'user_adopter_002',
    content:
      "Hello, I'm very interested in adopting Whiskers. I have extensive experience with senior cats and understand their special needs.",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-12T17:00:00Z'),
    updated_at: new Date('2024-02-12T17:00:00Z'),
  },
  {
    message_id: 'msg_006',
    chat_id: 'chat_whiskers_emily_001',
    sender_id: 'user_rescue_admin_001',
    content:
      "Hi Emily! That's wonderful to hear. Whiskers would benefit greatly from an experienced senior cat parent. Can you tell me about your experience with senior pets?",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-13T08:30:00Z'),
    updated_at: new Date('2024-02-13T08:30:00Z'),
  },
  {
    message_id: 'msg_007',
    chat_id: 'chat_whiskers_emily_001',
    sender_id: 'user_adopter_002',
    content:
      'I had my previous cat for 15 years until she passed from kidney disease. During her senior years, I managed her medications, special diet, and made accommodations for her arthritis. I understand the commitment senior pets require.',
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-13T12:15:00Z'),
    updated_at: new Date('2024-02-13T12:15:00Z'),
  },
  {
    message_id: 'msg_008',
    chat_id: 'chat_whiskers_emily_001',
    sender_id: 'user_rescue_admin_001',
    content:
      "That sounds perfect for Whiskers! We'd love to schedule a meet and greet. Congratulations, your application has been approved! 🎉",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-20T14:45:00Z'),
    updated_at: new Date('2024-02-20T14:45:00Z'),
  },

  // Messages for Rocky application
  {
    message_id: 'msg_009',
    chat_id: 'chat_rocky_michael_001',
    sender_id: 'user_adopter_003',
    content:
      'I submitted an application for Rocky. I have specific experience with pit bull type dogs and understand they need patient, experienced owners.',
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-14T14:00:00Z'),
    updated_at: new Date('2024-02-14T14:00:00Z'),
  },
  {
    message_id: 'msg_010',
    chat_id: 'chat_rocky_michael_001',
    sender_id: 'user_rescue_admin_002',
    content:
      "Hi Michael! Thank you for applying for Rocky. Your experience with pit bull type dogs is exactly what Rocky needs. We'd like to schedule a phone interview to discuss Rocky's specific needs. Are you available this week?",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-18T09:15:00Z'),
    updated_at: new Date('2024-02-18T09:15:00Z'),
  },
  {
    message_id: 'msg_011',
    chat_id: 'chat_rocky_michael_001',
    sender_id: 'user_adopter_003',
    content:
      "Yes, I'm flexible this week. I work from home so I can accommodate most times. What would work best for you?",
    message_type: 'text',
    is_read: false,
    created_at: new Date('2024-02-18T11:30:00Z'),
    updated_at: new Date('2024-02-18T11:30:00Z'),
  },

  // General inquiry chat
  {
    message_id: 'msg_012',
    chat_id: 'chat_general_inquiry_001',
    sender_id: 'user_adopter_004',
    content:
      "Hi, I'm interested in learning more about your adoption process. This would be my first pet.",
    message_type: 'text',
    is_read: true,
    created_at: new Date('2024-02-20T16:00:00Z'),
    updated_at: new Date('2024-02-20T16:00:00Z'),
  },
  {
    message_id: 'msg_013',
    chat_id: 'chat_general_inquiry_001',
    sender_id: 'user_rescue_staff_001',
    content:
      "Hello! We'd be happy to help you with your first pet adoption. What type of pet are you considering? We have resources for first-time pet owners.",
    message_type: 'text',
    is_read: false,
    created_at: new Date('2024-02-21T09:00:00Z'),
    updated_at: new Date('2024-02-21T09:00:00Z'),
  },
];

export async function seedMessages() {
  for (const message of messageData) {
    await Message.findOrCreate({
      where: { message_id: message.message_id },
      defaults: message,
    });
  }

  console.log(`✅ Created ${messageData.length} chat messages`);
}
