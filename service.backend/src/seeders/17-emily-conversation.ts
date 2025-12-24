import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import FileUpload from '../models/FileUpload';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) conversation with Paws Rescue Austin

const emilyConversationData = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_general_inquiry_001',

    rescue_id: '550e8400-e29b-41d4-a716-446655440001', // Paws Rescue Austin

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-08T14:30:00Z'),

    updated_at: new Date('2024-07-10T09:15:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_general_inquiry_001',

      participant_id: 'user_adopter_002', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-10T09:15:00Z'),

      created_at: new Date('2024-07-08T14:30:00Z'),

      updated_at: new Date('2024-07-10T09:15:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_general_inquiry_001',

      participant_id: 'user_rescue_staff_001', // Sarah Johnson from Paws Rescue

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-09T16:45:00Z'),

      created_at: new Date('2024-07-08T14:30:00Z'),

      updated_at: new Date('2024-07-09T16:45:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_001',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Hello! I'm interested in learning more about your cat adoption process. I recently lost my senior cat and I'm looking to adopt another one, preferably a calmer, older cat.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-08T14:30:00Z'),

      updated_at: new Date('2024-07-08T14:30:00Z'),
    },

    {
      message_id: 'msg_emily_002',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "Hi Emily! I'm so sorry for the loss of your senior cat. It's wonderful that you're looking to give another cat a loving home. We have several calm, older cats who would benefit from an experienced owner like yourself. Do you have any specific preferences for age, gender, or special needs?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-08T15:45:00Z'),

      updated_at: new Date('2024-07-08T15:45:00Z'),
    },

    {
      message_id: 'msg_emily_003',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Thank you for your kind words. I'm very open to special needs cats - my previous cat had kidney disease in her final years, so I'm experienced with medication schedules and special diets. I prefer female cats if possible, and age 8+ would be perfect. Do you have any available that might be a good match?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-08T16:20:00Z'),

      updated_at: new Date('2024-07-08T16:20:00Z'),
    },

    {
      message_id: 'msg_emily_004',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "That experience with senior cat care is exactly what some of our cats need! I have a few wonderful ladies in mind. There's Misty, a 10-year-old calico who needs daily medication for arthritis, and Shadows, a 12-year-old black cat who is very gentle but needs a special diet. Would you like to schedule a meet-and-greet this weekend?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-09T09:30:00Z'),

      updated_at: new Date('2024-07-09T09:30:00Z'),
    },

    {
      message_id: 'msg_emily_005',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Both sound wonderful! I'd love to meet them both. Saturday afternoon would work well for me if you have availability. Should I bring anything specific or fill out any paperwork beforehand?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-09T11:15:00Z'),

      updated_at: new Date('2024-07-09T11:15:00Z'),
    },

    {
      message_id: 'msg_emily_006',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_rescue_staff_001', // Sarah Johnson

      content:
        "Perfect! Saturday at 2 PM would be great. I'll have our adoption application ready for you to fill out if you connect with one of them. Just bring a valid ID and we can handle everything else during your visit. Our address is 1234 Animal Way, Austin, TX. Looking forward to meeting you!",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-09T16:45:00Z'),

      updated_at: new Date('2024-07-09T16:45:00Z'),
    },

    {
      message_id: 'msg_emily_007',

      chat_id: 'chat_emily_general_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Excellent! I'll see you Saturday at 2 PM. I'm really excited to meet Misty and Shadows. Thank you so much for your help - this rescue seems like exactly the kind of place I want to support. 😊",

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from Emily, unread by rescue staff

      created_at: new Date('2024-07-10T09:15:00Z'),

      updated_at: new Date('2024-07-10T09:15:00Z'),
    },
  ],

  // File attachments shared in the conversation
  attachments: [
    {
      upload_id: uuidv4(), // Generate proper UUID
      original_filename: 'my-previous-cat.jpg',
      stored_filename: 'emily-conversation-1-sample.jpg',
      file_path: 'uploads/chat/emily-conversation-1-sample.jpg',
      file_size: 145632,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-conversation-1-sample.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_general_inquiry_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of my previous senior cat to show experience with older cats',
        attachedToMessage: 'msg_emily_003',
      },
      created_at: new Date('2024-07-08T16:25:00Z'),
      updated_at: new Date('2024-07-08T16:25:00Z'),
    },
    {
      upload_id: uuidv4(), // Generate proper UUID
      original_filename: 'cat-area-setup.jpg',
      stored_filename: 'emily-conversation-1-sample-thumb.jpg',
      file_path: 'uploads/chat/emily-conversation-1-sample-thumb.jpg',
      file_size: 89421,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-conversation-1-sample-thumb.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_general_inquiry_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of my home setup for a senior cat',
        attachedToMessage: 'msg_emily_005',
      },
      created_at: new Date('2024-07-09T11:18:00Z'),
      updated_at: new Date('2024-07-09T11:18:00Z'),
    },
  ],
};

export async function seedEmilyConversation() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyConversationData.chat.chat_id },

      defaults: emilyConversationData.chat,
    });

    // Create chat participants

    for (const participant of emilyConversationData.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyConversationData.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // Create file attachments
    for (const attachment of emilyConversationData.attachments) {
      await FileUpload.findOrCreate({
        where: { stored_filename: attachment.stored_filename },
        defaults: attachment,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis conversation with Paws Rescue Austin');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyConversationData.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyConversationData.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyConversationData.messages.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Attachments: ${emilyConversationData.attachments.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily conversation:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyConversation()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily conversation seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily conversation seeding failed:', error);

      throw error;
    });
}
