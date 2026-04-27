import Message from '../models/Message';
import MessageReaction from '../models/MessageReaction';
import MessageRead from '../models/MessageRead';
import { MessageContentFormat } from '../types/chat';

// Message.read_status[] moved to the message_reads table (plan 2.1).
// Seeders inline the read receipts alongside each message for
// readability; seedMessages() splits them out and bulk-inserts to the
// typed table after the parent rows exist.
type SeedReadStatus = {
  user_id: string;
  read_at: Date;
};

const messageData = [
  // Messages for Buddy application chat
  {
    message_id: 'c8002a4a-c4d3-48c1-a7f6-0a8227cfb04b',
    chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    sender_id: '98915d9e-69ed-46b2-a897-57d8469ff360',
    content: 'Hi! I submitted an application for Buddy. When might I hear back about next steps?',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '378118eb-9e97-4940-adeb-0a53b252b057',
        read_at: new Date('2024-02-15T14:35:00Z'),
      },
    ],
    created_at: new Date('2024-02-15T14:30:00Z'),
    updated_at: new Date('2024-02-15T14:30:00Z'),
  },
  {
    message_id: '850667c6-9182-4fa0-ab7c-2b84d746dce0',
    chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    sender_id: '378118eb-9e97-4940-adeb-0a53b252b057',
    content:
      'Hi John! Thanks for your application for Buddy. We received it and will review it within 2-3 business days. Your application looks very complete!',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '98915d9e-69ed-46b2-a897-57d8469ff360',
        read_at: new Date('2024-02-16T09:20:00Z'),
      },
    ],
    created_at: new Date('2024-02-16T09:15:00Z'),
    updated_at: new Date('2024-02-16T09:15:00Z'),
  },
  {
    message_id: 'ccc3aeac-1808-4a01-a7bd-a8b5c87c90a8',
    chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    sender_id: '98915d9e-69ed-46b2-a897-57d8469ff360',
    content:
      "Thank you! I have a couple of questions about Buddy's exercise needs. The profile mentions he needs 2+ hours daily - is this all active exercise or does it include mental stimulation activities?",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '378118eb-9e97-4940-adeb-0a53b252b057',
        read_at: new Date('2024-02-16T10:35:00Z'),
      },
    ],
    created_at: new Date('2024-02-16T10:30:00Z'),
    updated_at: new Date('2024-02-16T10:30:00Z'),
  },
  {
    message_id: 'e92cca74-3fb1-40f7-a25f-18e2dfe334cc',
    chat_id: '7dfe4c51-930a-443b-aac5-3e42750a2f1a',
    sender_id: '378118eb-9e97-4940-adeb-0a53b252b057',
    content:
      'Great question! The 2+ hours includes both physical exercise and mental stimulation. Buddy loves puzzle toys, training sessions, and interactive play. About 1 hour of that should be active exercise like walks or fetch, and the rest can be training, puzzle games, or just quality interaction time.',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [],
    created_at: new Date('2024-02-16T15:45:00Z'),
    updated_at: new Date('2024-02-16T15:45:00Z'),
  },

  // Messages for Whiskers adoption (completed)
  {
    message_id: 'f842cc3c-8997-4fb4-ae71-c9c26f1deaf7',
    chat_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    sender_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    content:
      "Hello, I'm very interested in adopting Whiskers. I have extensive experience with senior cats and understand their special needs.",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
        read_at: new Date('2024-02-12T17:05:00Z'),
      },
    ],
    created_at: new Date('2024-02-12T17:00:00Z'),
    updated_at: new Date('2024-02-12T17:00:00Z'),
  },
  {
    message_id: '5d1814c1-7b79-4a99-a778-fa72aa409b72',
    chat_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    sender_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
    content:
      "Hi Emily! That's wonderful to hear. Whiskers would benefit greatly from an experienced senior cat parent. Can you tell me about your experience with senior pets?",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
        read_at: new Date('2024-02-13T08:35:00Z'),
      },
    ],
    created_at: new Date('2024-02-13T08:30:00Z'),
    updated_at: new Date('2024-02-13T08:30:00Z'),
  },
  {
    message_id: '4da24580-fa2a-4f5a-aae9-6aff3b8e1e12',
    chat_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    sender_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    content:
      'I had my previous cat for 15 years until she passed from kidney disease. During her senior years, I managed her medications, special diet, and made accommodations for her arthritis. I understand the commitment senior pets require.',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
        read_at: new Date('2024-02-13T12:20:00Z'),
      },
    ],
    created_at: new Date('2024-02-13T12:15:00Z'),
    updated_at: new Date('2024-02-13T12:15:00Z'),
  },
  {
    message_id: '7cac2e15-0917-45a4-adbe-39324fd6e40e',
    chat_id: '0b18f8ee-3ce4-4b96-a0e8-f745ec48a617',
    sender_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
    content:
      "That sounds perfect for Whiskers! We'd love to schedule a meet and greet. Congratulations, your application has been approved! 🎉",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    // Reactions seeded separately into message_reactions (plan 2.1).
    read_status: [
      {
        user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
        read_at: new Date('2024-02-20T14:47:00Z'),
      },
    ],
    created_at: new Date('2024-02-20T14:45:00Z'),
    updated_at: new Date('2024-02-20T14:45:00Z'),
  },

  // Messages for Rocky application
  {
    message_id: '657ff62b-d76b-43c8-aa69-dde757cb2b7c',
    chat_id: '807793ed-dc1e-4bbc-a035-d9033a3378bf',
    sender_id: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
    content:
      'I submitted an application for Rocky. I have specific experience with pit bull type dogs and understand they need patient, experienced owners.',
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: 'c283bd85-11ce-4494-add0-b06896d38e2d',
        read_at: new Date('2024-02-14T14:05:00Z'),
      },
    ],
    created_at: new Date('2024-02-14T14:00:00Z'),
    updated_at: new Date('2024-02-14T14:00:00Z'),
  },
  {
    message_id: '0d9f201d-3bf1-4d12-aa73-3351e260eed2',
    chat_id: '807793ed-dc1e-4bbc-a035-d9033a3378bf',
    sender_id: 'c283bd85-11ce-4494-add0-b06896d38e2d',
    content:
      "Hi Michael! Thank you for applying for Rocky. Your experience with pit bull type dogs is exactly what Rocky needs. We'd like to schedule a phone interview to discuss Rocky's specific needs. Are you available this week?",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
        read_at: new Date('2024-02-18T09:20:00Z'),
      },
    ],
    created_at: new Date('2024-02-18T09:15:00Z'),
    updated_at: new Date('2024-02-18T09:15:00Z'),
  },
  {
    message_id: 'ecb17d17-c079-46ef-a55f-6630823833af',
    chat_id: '807793ed-dc1e-4bbc-a035-d9033a3378bf',
    sender_id: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
    content:
      "Yes, I'm flexible this week. I work from home so I can accommodate most times. What would work best for you?",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [],
    created_at: new Date('2024-02-18T11:30:00Z'),
    updated_at: new Date('2024-02-18T11:30:00Z'),
  },

  // General inquiry chat
  {
    message_id: '8a5eed7d-30fa-4fa8-abb4-5361f0967e26',
    chat_id: 'a8ce10ca-8043-4d1c-a1c8-c453b3d9f4dd',
    sender_id: '5f0c8a14-a37f-469e-a0fe-222db23d4fbd',
    content:
      "Hi, I'm interested in learning more about your adoption process. This would be my first pet.",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [
      {
        user_id: '378118eb-9e97-4940-adeb-0a53b252b057',
        read_at: new Date('2024-02-20T16:05:00Z'),
      },
    ],
    created_at: new Date('2024-02-20T16:00:00Z'),
    updated_at: new Date('2024-02-20T16:00:00Z'),
  },
  {
    message_id: '71718d90-c7b3-434f-ab89-dc6679769e14',
    chat_id: 'a8ce10ca-8043-4d1c-a1c8-c453b3d9f4dd',
    sender_id: '378118eb-9e97-4940-adeb-0a53b252b057',
    content:
      "Hello! We'd be happy to help you with your first pet adoption. What type of pet are you considering? We have resources for first-time pet owners.",
    content_format: MessageContentFormat.PLAIN,
    attachments: [],
    read_status: [],
    created_at: new Date('2024-02-21T09:00:00Z'),
    updated_at: new Date('2024-02-21T09:00:00Z'),
  },
];

export async function seedMessages() {
  for (const messageDatum of messageData) {
    const { read_status, ...messageFields } = messageDatum as typeof messageDatum & {
      read_status: SeedReadStatus[];
    };

    await Message.findOrCreate({
      paranoid: false,
      where: { message_id: messageDatum.message_id },
      defaults: messageFields,
    });

    for (const status of read_status) {
      await MessageRead.findOrCreate({
        where: { message_id: messageDatum.message_id, user_id: status.user_id },
        defaults: {
          message_id: messageDatum.message_id,
          user_id: status.user_id,
          read_at: status.read_at,
        },
      });
    }
  }

  // Seed the one historical reaction in this dataset (plan 2.1).
  await MessageReaction.findOrCreate({
    where: {
      message_id: '7cac2e15-0917-45a4-adbe-39324fd6e40e',
      user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
      emoji: '❤️',
    },
    defaults: {
      message_id: '7cac2e15-0917-45a4-adbe-39324fd6e40e',
      user_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
      emoji: '❤️',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${messageData.length} chat messages`);
}
