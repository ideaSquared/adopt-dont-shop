// Canonical dev/e2e chat fixture for the chat.* schema.
//
// Seeds one chat between the adopter John Smith and the Paws Rescue manager,
// with both as participants, so the e2e messaging specs have a chat both sides
// can post to and read from. The chat_id is pinned to the value the e2e suite
// expects (helpers/seeds.ts SEEDED_CHAT_ID_FOR_ADOPTER).
//
// IDs are the fixed values the sibling seeds use:
//   participant John Smith       = services/auth seed (the e2e adopter)
//   participant Paws rescue mgr  = services/auth seed (rescue.manager@pawsrescue.dev)
//   rescue_id                    = Paws Rescue (services/{pets,rescue} seeds)

const PAWS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000001';
const JOHN_SMITH_USER_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';
const PAWS_MANAGER_USER_ID = 'b0000000-0000-4000-8000-000000000001';

export type SeedParticipant = {
  chatParticipantId: string;
  participantId: string;
  role: 'user' | 'rescue';
  rescueId: string | null;
};

export type SeedMessage = {
  messageId: string;
  senderId: string;
  content: string;
  minutesAgo: number;
};

export type SeedChat = {
  chatId: string;
  rescueId: string;
  createdBy: string;
  participants: readonly SeedParticipant[];
  messages: readonly SeedMessage[];
};

export const SEED_CHATS: readonly SeedChat[] = [
  {
    chatId: '7dfe4c51-930a-443b-aac5-3e42750a2f1a', // e2e SEEDED_CHAT_ID_FOR_ADOPTER
    rescueId: PAWS_RESCUE_ID,
    createdBy: JOHN_SMITH_USER_ID,
    participants: [
      {
        chatParticipantId: 'c0000000-0000-4000-8000-000000000001',
        participantId: JOHN_SMITH_USER_ID,
        role: 'user',
        rescueId: null,
      },
      {
        chatParticipantId: 'c0000000-0000-4000-8000-000000000002',
        participantId: PAWS_MANAGER_USER_ID,
        role: 'rescue',
        rescueId: PAWS_RESCUE_ID,
      },
    ],
    messages: [
      {
        messageId: 'e0000000-0000-4000-8000-000000000001',
        senderId: JOHN_SMITH_USER_ID,
        content: "Hi! I'd love to find out more about adopting one of your dogs.",
        minutesAgo: 120,
      },
      {
        messageId: 'e0000000-0000-4000-8000-000000000002',
        senderId: PAWS_MANAGER_USER_ID,
        content: 'Hello John, thanks for getting in touch. Do you have any pets at home already?',
        minutesAgo: 110,
      },
      {
        messageId: 'e0000000-0000-4000-8000-000000000003',
        senderId: JOHN_SMITH_USER_ID,
        content: 'No, just me and a secure garden. I work from home most days.',
        minutesAgo: 95,
      },
      {
        messageId: 'e0000000-0000-4000-8000-000000000004',
        senderId: PAWS_MANAGER_USER_ID,
        content: 'That sounds ideal. Would you like to arrange a meet this weekend?',
        minutesAgo: 80,
      },
    ],
  },
];
