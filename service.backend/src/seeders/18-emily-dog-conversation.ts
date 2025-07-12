import { v4 as uuidv4 } from 'uuid';

import Chat from '../models/Chat';

import ChatParticipant from '../models/ChatParticipant';

import Message from '../models/Message';

import FileUpload from '../models/FileUpload';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) conversation with Happy Tails Dog Rescue about a senior dog

const emilyDogConversationData = {
  // Chat conversation

  chat: {
    chat_id: 'chat_emily_dog_inquiry_001',

    rescue_id: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Dog Rescue

    status: ChatStatus.ACTIVE,

    created_at: new Date('2024-07-15T11:20:00Z'),

    updated_at: new Date('2024-07-16T16:30:00Z'),
  },

  // Chat participants

  participants: [
    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_dog_inquiry_001',

      participant_id: 'user_adopter_002', // Emily Davis

      role: ParticipantRole.USER,

      last_read_at: new Date('2024-07-16T16:30:00Z'),

      created_at: new Date('2024-07-15T11:20:00Z'),

      updated_at: new Date('2024-07-16T16:30:00Z'),
    },

    {
      chat_participant_id: uuidv4(),

      chat_id: 'chat_emily_dog_inquiry_001',

      participant_id: 'user_rescue_staff_002', // Mike Rodriguez from Happy Tails

      role: ParticipantRole.RESCUE,

      last_read_at: new Date('2024-07-16T15:45:00Z'),

      created_at: new Date('2024-07-15T11:20:00Z'),

      updated_at: new Date('2024-07-16T15:45:00Z'),
    },
  ],

  // Messages in the conversation

  messages: [
    {
      message_id: 'msg_emily_dog_001',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Hi! I'm interested in Charlie, the 8-year-old Golden Retriever mix you have listed. I've been considering adding a dog to my household alongside my cats. I know this would be a big change, but I've always loved goldens. Is Charlie good with cats?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-15T11:20:00Z'),

      updated_at: new Date('2024-07-15T11:20:00Z'),
    },

    {
      message_id: 'msg_emily_dog_002',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_rescue_staff_002', // Mike Rodriguez

      content:
        "Hi Emily! Charlie is such a gentle soul and yes, he's excellent with cats! His previous home had 3 cats and he was their best friend. At 8 years old, he's past the puppy energy phase and just wants to be part of a loving family. How many cats do you currently have, and what are their temperaments like?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-15T13:45:00Z'),

      updated_at: new Date('2024-07-15T13:45:00Z'),
    },

    {
      message_id: 'msg_emily_dog_003',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "I currently have two cats - Misty who I just adopted from Paws Rescue (she's 10 and very calm) and Shadow, who's 12 and quite laid-back. Both are pretty confident with new situations. I have a decent-sized yard and work from home, so Charlie wouldn't be alone much. Does he need a lot of exercise?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-15T14:30:00Z'),

      updated_at: new Date('2024-07-15T14:30:00Z'),
    },

    {
      message_id: 'msg_emily_dog_004',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_rescue_staff_002', // Mike Rodriguez

      content:
        "That sounds like a perfect setup! Charlie needs moderate exercise - a couple of walks a day and some playtime in the yard would make him very happy. He's not a high-energy dog anymore, more of a 'let's go for a nice walk then nap together' kind of guy. Would you be interested in bringing your cats for a meet-and-greet, or would you prefer to meet Charlie first?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-15T16:15:00Z'),

      updated_at: new Date('2024-07-15T16:15:00Z'),
    },

    {
      message_id: 'msg_emily_dog_005',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "I think I'd like to meet Charlie first to see if we connect, then maybe arrange a home visit if things go well? My cats are pretty adaptable but I want to make sure Charlie is the right fit before introducing everyone. When would be a good time this week?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T09:20:00Z'),

      updated_at: new Date('2024-07-16T09:20:00Z'),
    },

    {
      message_id: 'msg_emily_dog_006',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_rescue_staff_002', // Mike Rodriguez

      content:
        "That's a great approach! Charlie would love to meet you. How about Thursday evening around 5 PM? That's when he's most relaxed but still social. If you two hit it off, we can definitely arrange a home visit with your cats. Charlie is fostered nearby so we could potentially do a home trial weekend if everyone gets along well.",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T11:30:00Z'),

      updated_at: new Date('2024-07-16T11:30:00Z'),
    },

    {
      message_id: 'msg_emily_dog_007',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_adopter_002', // Emily Davis

      content:
        "Thursday at 5 PM sounds perfect! A trial weekend is exactly what I was hoping for - that would give everyone time to adjust gradually. I'm really excited about this possibility. Should I bring anything special for Charlie?",

      content_format: MessageContentFormat.PLAIN,

      is_read: true,

      created_at: new Date('2024-07-16T15:45:00Z'),

      updated_at: new Date('2024-07-16T15:45:00Z'),
    },

    {
      message_id: 'msg_emily_dog_008',

      chat_id: 'chat_emily_dog_inquiry_001',

      sender_id: 'user_rescue_staff_002', // Mike Rodriguez

      content:
        "Just bring yourself and maybe some dog treats! Charlie loves meeting new people and I have a feeling you two will be great together. He's been waiting for the right home, and a house with cats who are already calm and confident sounds ideal. See you Thursday! 🐕🐱",

      content_format: MessageContentFormat.PLAIN,

      is_read: false, // Most recent message from rescue staff, unread by Emily

      created_at: new Date('2024-07-16T16:30:00Z'),

      updated_at: new Date('2024-07-16T16:30:00Z'),
    },
  ],

  // File attachments shared in the dog conversation
  attachments: [
    {
      upload_id: uuidv4(), // Generate proper UUID
      original_filename: 'previous-dog-medical-records.pdf',
      stored_filename: 'emily-dog-conversation-document.pdf',
      file_path: 'uploads/chat/emily-dog-conversation-document.pdf',
      file_size: 524288,
      mime_type: 'application/pdf',
      url: '/uploads/chat/emily-dog-conversation-document.pdf',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_dog_inquiry_001',
      purpose: 'chat_attachment',
      metadata: {
        description:
          'Medical records from my previous senior dog to show experience with senior pet care',
        attachedToMessage: 'msg_emily_dog_003',
      },
      created_at: new Date('2024-07-15T16:45:00Z'),
      updated_at: new Date('2024-07-15T16:45:00Z'),
    },
  ],
};

export async function seedEmilyDogConversation() {
  try {
    // Create the chat

    await Chat.findOrCreate({
      where: { chat_id: emilyDogConversationData.chat.chat_id },

      defaults: emilyDogConversationData.chat,
    });

    // Create chat participants

    for (const participant of emilyDogConversationData.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,

          participant_id: participant.participant_id,
        },

        defaults: participant,
      });
    }

    // Create messages

    for (const message of emilyDogConversationData.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },

        defaults: message,
      });
    }

    // Create file attachments
    for (const attachment of emilyDogConversationData.attachments) {
      await FileUpload.findOrCreate({
        where: { upload_id: attachment.upload_id },
        defaults: attachment,
      });
    }

    // eslint-disable-next-line no-console

    console.log('✅ Created Emily Davis dog conversation with Happy Tails Dog Rescue');

    // eslint-disable-next-line no-console

    console.log(`   - Chat ID: ${emilyDogConversationData.chat.chat_id}`);

    // eslint-disable-next-line no-console

    console.log(`   - Participants: ${emilyDogConversationData.participants.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Messages: ${emilyDogConversationData.messages.length}`);

    // eslint-disable-next-line no-console

    console.log(`   - Attachments: ${emilyDogConversationData.attachments.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console

    console.error('❌ Error creating Emily dog conversation:', error);

    throw error;
  }
}

// Allow this seeder to be run independently

if (require.main === module) {
  seedEmilyDogConversation()
    .then(() => {
      // eslint-disable-next-line no-console

      console.log('🎉 Emily dog conversation seeding completed successfully!');

      throw new Error('Seeding completed - exiting process');
    })

    .catch(error => {
      // eslint-disable-next-line no-console

      console.error('💥 Emily dog conversation seeding failed:', error);

      throw error;
    });
}
