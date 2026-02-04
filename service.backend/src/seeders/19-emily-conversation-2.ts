import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import FileUpload from '../models/FileUpload';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_0000adopt02) conversation with Happy Tails Dog Rescue

const emilyConversation2Data = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_dog_inquiry_002',

    rescue_id: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Dog Rescue

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-14T11:20:00Z'),

    updated_at: new Date('2024-07-15T16:45:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_dog_inquiry_002',

      participant_id: 'user_0000adopt02', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-15T16:45:00Z'),

      created_at: new Date('2024-07-14T11:20:00Z'),

      updated_at: new Date('2024-07-15T16:45:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_dog_inquiry_002',

      participant_id: 'user_0000rscad02', // Maria Garcia from Happy Tails

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-15T15:30:00Z'),

      created_at: new Date('2024-07-14T11:20:00Z'),

      updated_at: new Date('2024-07-15T15:30:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_2_001',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000adopt02', // Emily Davis

      content:
        "Hello! I'm interested in learning more about Bella, the 2-year-old Golden Retriever mix you have listed. I have two young children (ages 5 and 8) and we're looking for a gentle, family-friendly dog. Is Bella good with kids?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-14T11:20:00Z'),

      updated_at: new Date('2024-07-14T11:20:00Z'),
    },

    {
      message_id: 'msg_emily_2_002',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000rscad02', // Maria Garcia

      content:
        "Hi Emily! Bella would be absolutely perfect for your family. She's wonderful with children - very patient and gentle. She came from a home with kids and loves to play fetch and give cuddles. She's medium energy, so great for active families but also happy to relax. Do you have experience with dogs?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-14T13:45:00Z'),

      updated_at: new Date('2024-07-14T13:45:00Z'),
    },

    {
      message_id: 'msg_emily_2_003',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000adopt02', // Emily Davis

      content:
        "That sounds wonderful! I grew up with dogs and had a Lab for 12 years before she passed last year. The kids have been asking for a dog ever since. We have a fenced backyard and live near a dog park. What's Bella's personality like? Is she house trained?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-14T14:30:00Z'),

      updated_at: new Date('2024-07-14T14:30:00Z'),
    },

    {
      message_id: 'msg_emily_2_004',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000rscad02', // Maria Garcia

      content:
        "Bella is such a sweetheart! She's fully house trained, knows sit, stay, and down. She's very social and loves meeting new people and dogs. She's not destructive and does well when left alone for work hours. She does shed seasonally, just so you know. Would you like to bring the kids to meet her?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-14T16:15:00Z'),

      updated_at: new Date('2024-07-14T16:15:00Z'),
    },

    {
      message_id: 'msg_emily_2_005',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000adopt02', // Emily Davis

      content:
        "The kids would be thrilled to meet her! We're definitely okay with shedding - we had that with our Lab too. Are there any specific requirements for adoption? We're available this weekend if that works for a meet and greet.",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-15T08:20:00Z'),

      updated_at: new Date('2024-07-15T08:20:00Z'),
    },

    {
      message_id: 'msg_emily_2_006',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000rscad02', // Maria Garcia

      content:
        "Sunday at 2 PM would be great! We'll do a meet and greet with the whole family. Our adoption process includes an application, reference check, and home visit. The adoption fee is $350. If Bella's a good fit, we can start the paperwork right away. Should I put you down for Sunday?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-15T11:30:00Z'),

      updated_at: new Date('2024-07-15T11:30:00Z'),
    },

    {
      message_id: 'msg_emily_2_007',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000adopt02', // Emily Davis

      content:
        "Perfect! Sunday at 2 PM works great for us. I'll bring the kids and we're all really excited. Quick question - does Bella need any special diet or medications? Also, do you provide any transition supplies to help her settle in?",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [],

      created_at: new Date('2024-07-15T15:30:00Z'),

      updated_at: new Date('2024-07-15T15:30:00Z'),
    },

    {
      message_id: 'msg_emily_2_008',

      chat_id: 'chat_emily_dog_inquiry_002',

      sender_id: 'user_0000rscad02', // Maria Garcia

      content:
        "Bella's very healthy - no special diet or meds needed! We'll provide you with a starter bag of her current food, her favorite toy, and a blanket that smells like our facility to help with the transition. We also give all adopters a welcome packet with training tips and local vet recommendations. See you Sunday! 🐾",

      content_format: MessageContentFormat.PLAIN,

      attachments: [],
      reactions: [],
      read_status: [], // Most recent message from rescue staff, unread by Emily

      created_at: new Date('2024-07-15T16:45:00Z'),

      updated_at: new Date('2024-07-15T16:45:00Z'),
    },
  ],

  // File attachments shared in the conversation
  attachments: [
    {
      upload_id: uuidv4(), // Generate proper UUID
      original_filename: 'backyard-dog-area.jpg',
      stored_filename: 'emily-dog-conversation-2-sample.jpg',
      file_path: 'uploads/chat/emily-dog-conversation-2-sample.jpg',
      file_size: 145632,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-dog-conversation-2-sample.jpg',
      uploaded_by: 'user_0000adopt02', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_dog_inquiry_002',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of my backyard setup for a senior dog',
        attachedToMessage: 'msg_emily_dog_2_002',
      },
      created_at: new Date('2024-07-14T14:30:00Z'),
      updated_at: new Date('2024-07-14T14:30:00Z'),
    },
  ],
};

export async function seedEmilyConversation2() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyConversation2Data.chat.chat_id },

      defaults: emilyConversation2Data.chat,
    });

    // Create chat participants

    for (const participant of emilyConversation2Data.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyConversation2Data.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // Create file attachments
    for (const attachment of emilyConversation2Data.attachments) {
      await FileUpload.findOrCreate({
        where: { stored_filename: attachment.stored_filename },
        defaults: attachment,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis conversation #2 with Happy Tails Dog Rescue');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyConversation2Data.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyConversation2Data.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyConversation2Data.messages.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Attachments: ${emilyConversation2Data.attachments.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily conversation #2:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyConversation2()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily conversation #2 seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily conversation #2 seeding failed:', error);

      throw error;
    });
}
