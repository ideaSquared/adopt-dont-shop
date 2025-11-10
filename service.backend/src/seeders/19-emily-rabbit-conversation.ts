import { v4 as uuidv4 } from 'uuid';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import FileUpload from '../models/FileUpload';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) conversation with Bunny Haven Rabbit Rescue

const emilyRabbitConversationData = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_rabbit_inquiry_001',

    rescue_id: '550e8400-e29b-41d4-a716-446655440003', // Bunny Haven Rabbit Rescue

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-18T09:30:00Z'),

    updated_at: new Date('2024-07-19T13:45:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_rabbit_inquiry_001',

      participant_id: 'user_adopter_002', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-19T13:45:00Z'),

      created_at: new Date('2024-07-18T09:30:00Z'),

      updated_at: new Date('2024-07-19T13:45:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_rabbit_inquiry_001',

      participant_id: 'user_rescue_staff_003', // Lisa Chen from Bunny Haven

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-19T12:20:00Z'),

      created_at: new Date('2024-07-18T09:30:00Z'),

      updated_at: new Date('2024-07-19T12:20:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_rabbit_001',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Hello! I'm considering adopting a rabbit as I've heard they can be wonderful indoor companions. I have cats and I'm wondering if it's possible for them to coexist peacefully? I saw your bonded pair Luna and Stella and I'm curious about their needs.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T09:30:00Z'),

      updated_at: new Date('2024-07-18T09:30:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_002',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_rescue_staff_003', // Lisa Chen

      content:
        "Hi Emily! It's wonderful that you're considering rabbits. Luna and Stella are indeed a bonded pair - they must be adopted together. Rabbits and cats can coexist, but it requires careful introduction and supervision. The cats need to be calm and not overly predatory. How do your cats typically react to small animals?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T11:15:00Z'),

      updated_at: new Date('2024-07-18T11:15:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_003',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "My cats are both seniors (10 and 12) and very mellow. They've never shown hunting instincts - they mostly ignore birds outside and are generally uninterested in anything that moves quickly. I'd definitely want to set up a separate safe space for the rabbits. What kind of housing and care do Luna and Stella need?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T12:45:00Z'),

      updated_at: new Date('2024-07-18T12:45:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_004',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_rescue_staff_003', // Lisa Chen

      content:
        "That sounds very promising! Senior cats are often ideal companions for rabbits. Luna and Stella need a large exercise pen (at least 4x4 feet) with hiding spots, plus daily supervised floor time for exercise. They're litter trained and need fresh hay, pellets, and vegetables daily. They're both spayed and very social with humans. Would you like to meet them?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T14:20:00Z'),

      updated_at: new Date('2024-07-18T14:20:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_005',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Yes, I'd love to meet them! I've been researching rabbit care and I think I could provide a good home. I work from home so they wouldn't be alone much. What's the adoption process like? And is there anything special I should know about caring for a bonded pair?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-18T16:10:00Z'),

      updated_at: new Date('2024-07-18T16:10:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_006',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_rescue_staff_003', // Lisa Chen

      content:
        "Bonded pairs are actually easier in some ways - they keep each other company and play together! The adoption fee is $120 for both. We do require a home visit to ensure the setup is safe. Luna is more outgoing while Stella is shy but sweet. They've been together for 2 years. How about Sunday afternoon for a meet-and-greet?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-19T08:45:00Z'),

      updated_at: new Date('2024-07-19T08:45:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_007',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Sunday afternoon works perfectly! I'm excited to meet them both. I've already started looking into bunny-proofing my house and setting up a proper space. Should I have the setup ready before the home visit, or do you prefer to advise on the best arrangement first?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-19T10:30:00Z'),

      updated_at: new Date('2024-07-19T10:30:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_008',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_rescue_staff_003', // Lisa Chen

      content:
        "I'd love to advise on the setup during the home visit! Every house is different and I can help you choose the best spot and arrangement. For Sunday, just come as you are - bring any questions you have. Luna and Stella are going to love meeting you! See you at 2 PM at our facility. 🐰🐰",

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from rescue staff, unread by Emily

      created_at: new Date('2024-07-19T12:20:00Z'),

      updated_at: new Date('2024-07-19T12:20:00Z'),
    },

    {
      message_id: 'msg_emily_rabbit_009',

      chat_id: 'chat_emily_rabbit_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Perfect! I'll see you Sunday at 2 PM. Thank you so much for all the information. I have a feeling this is going to be a wonderful addition to my little zoo at home! 😊",

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from Emily

      created_at: new Date('2024-07-19T13:45:00Z'),

      updated_at: new Date('2024-07-19T13:45:00Z'),
    },
  ],

  // File attachments shared in the rabbit conversation
  attachments: [
    {
      upload_id: uuidv4(), // Generate proper UUID
      original_filename: 'rabbit-housing-area.jpg',
      stored_filename: 'emily-rabbit-conversation-sample.jpg',
      file_path: 'uploads/chat/emily-rabbit-conversation-sample.jpg',
      file_size: 89421,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-rabbit-conversation-sample.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_rabbit_inquiry_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of my rabbit housing setup and exercise area',
        attachedToMessage: 'msg_emily_rabbit_003',
      },
      created_at: new Date('2024-07-18T15:30:00Z'),
      updated_at: new Date('2024-07-18T15:30:00Z'),
    },
  ],
};

export async function seedEmilyRabbitConversation() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyRabbitConversationData.chat.chat_id },

      defaults: emilyRabbitConversationData.chat,
    });

    // Create chat participants

    for (const participant of emilyRabbitConversationData.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyRabbitConversationData.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // Create file attachments
    for (const attachment of emilyRabbitConversationData.attachments) {
      await FileUpload.findOrCreate({
        where: { stored_filename: attachment.stored_filename },
        defaults: attachment,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis rabbit conversation with Bunny Haven Rabbit Rescue');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyRabbitConversationData.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyRabbitConversationData.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyRabbitConversationData.messages.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Attachments: ${emilyRabbitConversationData.attachments.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily rabbit conversation:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyRabbitConversation()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily rabbit conversation seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily rabbit conversation seeding failed:', error);

      throw error;
    });
}
