import { v4 as uuidv4 } from 'uuid';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) conversation with Austin Animal Center

const emilyConversation3Data = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_cat_inquiry_003',

    rescue_id: '550e8400-e29b-41d4-a716-446655440003', // Furry Friends Portland

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-16T09:30:00Z'),

    updated_at: new Date('2024-07-17T14:20:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_cat_inquiry_003',

      participant_id: 'user_adopter_002', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-17T14:20:00Z'),

      created_at: new Date('2024-07-16T09:30:00Z'),

      updated_at: new Date('2024-07-17T14:20:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_cat_inquiry_003',

      participant_id: 'user_moderator_001', // Content Moderator from Furry Friends

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-17T13:45:00Z'),

      created_at: new Date('2024-07-16T09:30:00Z'),

      updated_at: new Date('2024-07-17T13:45:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_3_001',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Hi! I'm looking into adopting a cat for my family. We have two children and I'm wondering about cats that would be good with kids. Do you have any recommendations? We're first-time cat owners but very committed to providing a loving home.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T09:30:00Z'),

      updated_at: new Date('2024-07-16T09:30:00Z'),
    },

    {
      message_id: 'msg_emily_3_002',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_moderator_001', // Content Moderator

      content:
        "Hello Emily! That's wonderful that you're considering adoption. For families with children, I'd recommend adult cats (2+ years) who have known histories with kids. We have several great options! How old are your children, and are you looking for a more active playful cat or a calm lap cat?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T11:15:00Z'),

      updated_at: new Date('2024-07-16T11:15:00Z'),
    },

    {
      message_id: 'msg_emily_3_003',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "My kids are 5 and 8 - they're pretty gentle and respectful with animals. I think we'd like something in between - playful enough to interact with the kids but also calm enough to be a good family pet. What cats do you currently have available?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T12:30:00Z'),

      updated_at: new Date('2024-07-16T12:30:00Z'),
    },

    {
      message_id: 'msg_emily_3_004',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_moderator_001', // Content Moderator

      content:
        "Perfect ages! I have two cats in mind: Oliver, a 3-year-old orange tabby who loves gentle play and cuddles, and Luna, a 4-year-old calico who's great with kids and very social. Both are spayed/neutered, vaccinated, and have lived with children before. Would you like to meet them?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T14:45:00Z'),

      updated_at: new Date('2024-07-16T14:45:00Z'),
    },

    {
      message_id: 'msg_emily_3_005',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Both sound wonderful! I'd love to meet them both with my kids. What should we expect for the adoption process? Also, what supplies do we need to get started? We want to be fully prepared before bringing a cat home.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T16:20:00Z'),

      updated_at: new Date('2024-07-16T16:20:00Z'),
    },

    {
      message_id: 'msg_emily_3_006',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_moderator_001', // Content Moderator

      content:
        "Great question! You'll need a litter box, cat litter, food/water bowls, cat food, a scratching post, and some toys. The adoption process includes an application, brief interview, and $75 adoption fee. We can schedule a meet-and-greet tomorrow afternoon if you're available?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-17T09:00:00Z'),

      updated_at: new Date('2024-07-17T09:00:00Z'),
    },

    {
      message_id: 'msg_emily_3_007',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Tomorrow afternoon works perfectly! We can come by around 2 PM if that's good. I'll bring the kids and we can meet both Oliver and Luna. Should we bring anything specific, or just come ready to fall in love with a new family member? 😊",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-17T10:30:00Z'),

      updated_at: new Date('2024-07-17T10:30:00Z'),
    },

    {
      message_id: 'msg_emily_3_008',

      chat_id: 'chat_emily_cat_inquiry_003',

      sender_id: 'user_moderator_001', // Content Moderator

      content:
        '2 PM is perfect! Just bring yourselves and maybe a few questions about cat care - we love educating new cat families. Both Oliver and Luna will be ready to meet you in our meet-and-greet room. I have a feeling one of them will steal your hearts! Our address is 1156 W Cesar Chavez St. See you tomorrow! 🐱',

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from rescue staff, unread by Emily

      created_at: new Date('2024-07-17T14:20:00Z'),

      updated_at: new Date('2024-07-17T14:20:00Z'),
    },
  ],
};

export async function seedEmilyConversation3() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyConversation3Data.chat.chat_id },

      defaults: emilyConversation3Data.chat,
    });

    // Create chat participants

    for (const participant of emilyConversation3Data.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyConversation3Data.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis conversation #3 with Austin Animal Center');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyConversation3Data.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyConversation3Data.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyConversation3Data.messages.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily conversation #3:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyConversation3()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily conversation #3 seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily conversation #3 seeding failed:', error);

      throw error;
    });
}
