// Dev bulk-data seeder for the chat.* schema.
//
// Floods chat.chats (+ chat_participants + messages) built around the spam
// applications: each chat links an adopter (the application's user) and the
// owning rescue, then carries a believable back-and-forth of messages. Gated
// via assertSpamAllowed.
//
// Idempotent: chat / participant / message ids are deterministic (seededUuid)
// and every INSERT is ON CONFLICT DO NOTHING, so a re-run converges instead of
// piling on. Reads the (now deterministic) spam applications + staff members
// cross-schema; run after the upstream seeders via the `pnpm db:seed:dev`
// orchestrator.
//
// Volume: SPAM_CHATS (default 150), SPAM_MESSAGES (default 2000). Messages are
// spread across the chats, alternating adopter/staff senders.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  seededUuid,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Believable adopter/rescue chatter — sampled instead of faker.lorem so the
// message threads read like real adoption enquiries.
const MESSAGES = [
  'Hi! Is this pet still available for adoption?',
  'Yes, they are! Would you like to arrange a meet?',
  'That would be lovely — what times work for you this week?',
  'We’re open Saturday morning if that suits?',
  'Could you tell me a bit more about their temperament?',
  'They’re great with children and other dogs.',
  'Do they have any special dietary or medical needs?',
  'Just a routine check-up due next month, nothing major.',
  'Wonderful, we’d love to come and say hello.',
  'Brilliant — I’ll pencil you in and send the address over.',
  'Thank you so much for your help!',
  'No problem at all, see you soon!',
];

const CHAT_COLUMNS = [
  'chat_id',
  'application_id',
  'rescue_id',
  'status',
  'created_by',
  'created_at',
  'updated_at',
] as const;

const PARTICIPANT_COLUMNS = [
  'chat_participant_id',
  'chat_id',
  'participant_id',
  'role',
  'rescue_id',
  'created_at',
  'updated_at',
] as const;

const MESSAGE_COLUMNS = [
  'message_id',
  'chat_id',
  'sender_id',
  'content',
  'content_format',
  'created_at',
  'updated_at',
] as const;

// A chat needs an adopter and a rescue-side staff member to converse.
type ChatSeed = {
  applicationId: string;
  rescueId: string;
  adopterId: string;
  staffId: string;
};

type BuiltChat = {
  index: number;
  chatId: string;
  seed: ChatSeed;
};

export const spamChats = async (deps: {
  query: QueryFn;
  faker: Faker;
  chats: number;
  messages: number;
  seeds: readonly ChatSeed[];
}): Promise<{ chats: number; participants: number; messages: number }> => {
  const now = new Date();

  const built: BuiltChat[] = Array.from({ length: deps.chats }, (_, i) => ({
    index: i,
    chatId: seededUuid(`chat-${i}`),
    seed: deps.faker.helpers.arrayElement(deps.seeds),
  }));

  const chatRows = built.map(b => [
    b.chatId,
    b.seed.applicationId,
    b.seed.rescueId,
    'active',
    b.seed.adopterId,
    now,
    now,
  ]);
  await bulkInsert(
    { query: deps.query },
    'chat.chats',
    CHAT_COLUMNS,
    chatRows,
    500,
    'ON CONFLICT (chat_id) DO NOTHING'
  );

  const participantRows = built.flatMap(b => [
    [
      seededUuid(`chatpart-${b.index}-user`),
      b.chatId,
      b.seed.adopterId,
      'user',
      b.seed.rescueId,
      now,
      now,
    ],
    [
      seededUuid(`chatpart-${b.index}-rescue`),
      b.chatId,
      b.seed.staffId,
      'rescue',
      b.seed.rescueId,
      now,
      now,
    ],
  ]);
  await bulkInsert(
    { query: deps.query },
    'chat.chat_participants',
    PARTICIPANT_COLUMNS,
    participantRows,
    500,
    'ON CONFLICT (chat_participant_id) DO NOTHING'
  );

  // Spread the message budget across chats; alternate adopter/staff sender and
  // walk the scripted conversation so each thread reads naturally.
  const messageRows = Array.from({ length: deps.messages }, (_, i) => {
    const chat = built[i % built.length];
    const turn = Math.floor(i / built.length);
    const sender = turn % 2 === 0 ? chat.seed.adopterId : chat.seed.staffId;
    return [
      seededUuid(`msg-${i}`),
      chat.chatId,
      sender,
      MESSAGES[turn % MESSAGES.length],
      'plain',
      now,
      now,
    ];
  });
  await bulkInsert(
    { query: deps.query },
    'chat.messages',
    MESSAGE_COLUMNS,
    messageRows,
    500,
    'ON CONFLICT (message_id) DO NOTHING'
  );

  return {
    chats: chatRows.length,
    participants: participantRows.length,
    messages: messageRows.length,
  };
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.chat.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);
    // One staff member per rescue is enough to play the rescue side; pick the
    // first per rescue via DISTINCT ON. Join each application to that staffer.
    const result = (await query(
      `SELECT a.application_id, a.user_id AS adopter_id, a.rescue_id, s.user_id AS staff_id
       FROM applications.applications a
       JOIN LATERAL (
         SELECT user_id FROM rescue.staff_members
         WHERE rescue_id = a.rescue_id
         LIMIT 1
       ) s ON true
       JOIN auth.users u ON u.user_id = a.user_id
       WHERE u.email LIKE '%@example.test'`,
      []
    )) as {
      rows: { application_id: string; adopter_id: string; rescue_id: string; staff_id: string }[];
    };

    const seeds: ChatSeed[] = result.rows.map(r => ({
      applicationId: r.application_id,
      rescueId: r.rescue_id,
      adopterId: r.adopter_id,
      staffId: r.staff_id,
    }));

    if (seeds.length === 0) {
      throw new Error(
        'no spam applications with staffed rescues found — run the upstream spam first'
      );
    }

    const chats = spamCount('CHATS', 150);
    const messages = spamCount('MESSAGES', 2000);
    logger.info('spamming chats', { chats, messages, seeds: seeds.length });
    const out = await spamChats({ query, faker: createSpamFaker(), chats, messages, seeds });
    logger.info('chat spam complete', out);
  } catch (err) {
    logger.error('chat spam failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
