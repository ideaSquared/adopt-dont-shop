import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) conversation with Paws Rescue Austin (special needs focus)

const emilyConversation4Data = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_special_needs_inquiry_004',

    rescue_id: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-18T13:15:00Z'),

    updated_at: new Date('2024-07-19T11:30:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_special_needs_inquiry_004',

      participant_id: 'user_adopter_002', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-19T11:30:00Z'),

      created_at: new Date('2024-07-18T13:15:00Z'),

      updated_at: new Date('2024-07-19T11:30:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_special_needs_inquiry_004',

      participant_id: 'user_rescue_staff_001', // Sarah Johnson from Paws Rescue

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-19T10:45:00Z'),

      created_at: new Date('2024-07-18T13:15:00Z'),

      updated_at: new Date('2024-07-19T10:45:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_4_001',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Hello! I saw your post about Charlie, the senior dog who needs a quiet home. My family has been considering adopting an older dog who might have a harder time finding a home. Can you tell me more about Charlie's needs and personality?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T13:15:00Z'),

      updated_at: new Date('2024-07-18T13:15:00Z'),
    },

    {
      message_id: 'msg_emily_4_002',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "Hi Emily! Thank you so much for considering Charlie - senior dogs make the most grateful companions. Charlie is 9 years old, very gentle and calm. He has mild arthritis managed with daily medication, and he loves short walks and lots of napping. He's great with kids and just wants a cozy home to spend his golden years. Do you have experience with senior pets?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T15:30:00Z'),

      updated_at: new Date('2024-07-18T15:30:00Z'),
    },

    {
      message_id: 'msg_emily_4_003',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "That sounds perfect for our family! We had our previous dog for 12 years until she passed from old age, so we understand the commitment. My kids (5 and 8) are very gentle. What kind of ongoing care does Charlie need for his arthritis? And what's his daily routine like?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T17:45:00Z'),

      updated_at: new Date('2024-07-18T17:45:00Z'),
    },

    {
      message_id: 'msg_emily_4_004',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "Charlie takes one small pill twice daily (about $30/month) and benefits from a soft bed and gentle exercise. He loves two short 15-minute walks daily and enjoys sunbathing in the yard. He's very low-maintenance otherwise - house trained, quiet, and content to be near his family. The vet estimates he has many good years left with proper care.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T19:20:00Z'),

      updated_at: new Date('2024-07-18T19:20:00Z'),
    },

    {
      message_id: 'msg_emily_4_005',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "That all sounds very manageable and we'd be honored to give Charlie a loving retirement home. We have a quiet neighborhood perfect for gentle walks and a sunny backyard he'd love. When could we meet him? We're prepared to commit to his ongoing care.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-19T08:15:00Z'),

      updated_at: new Date('2024-07-19T08:15:00Z'),
    },

    {
      message_id: 'msg_emily_4_006',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        'This is exactly what Charlie needs! Senior dogs are often overlooked, but they make the most wonderful companions. We do a thorough adoption process for our special needs animals - application, vet reference, and home visit. The adoption fee is reduced to $150 for seniors. Are you available Saturday morning to meet Charlie?',

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-19T09:30:00Z'),

      updated_at: new Date('2024-07-19T09:30:00Z'),
    },

    {
      message_id: 'msg_emily_4_007',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        'Saturday morning is perfect! We believe every dog deserves love in their golden years. Should we bring anything specific? Also, will you provide information about his current medication routine and vet records so we can ensure continuity of care?',

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-19T10:45:00Z'),

      updated_at: new Date('2024-07-19T10:45:00Z'),
    },

    {
      message_id: 'msg_emily_4_008',

      chat_id: 'chat_emily_special_needs_inquiry_004',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "Absolutely! We'll provide all his medical records, current medications, feeding schedule, and our vet's contact info. Just bring yourselves and maybe some gentle treats. Charlie is going to love having a family who understands his needs. Thank you for opening your hearts to a senior dog - you're making such a difference! See you Saturday at 10 AM. 🐕❤️",

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from rescue staff, unread by Emily

      created_at: new Date('2024-07-19T11:30:00Z'),

      updated_at: new Date('2024-07-19T11:30:00Z'),
    },
  ],
};

export async function seedEmilyConversation4() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyConversation4Data.chat.chat_id },

      defaults: emilyConversation4Data.chat,
    });

    // Create chat participants

    for (const participant of emilyConversation4Data.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyConversation4Data.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis conversation #4 with Paws Rescue Austin');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyConversation4Data.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyConversation4Data.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyConversation4Data.messages.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily conversation #4:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyConversation4()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily conversation #4 seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily conversation #4 seeding failed:', error);

      throw error;
    });
}
