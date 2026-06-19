// Dev-only bulk-data ('spam') seeder for the chat.* schema.
//
// Floods chat.chats (+ chat_participants + messages) built around the spam
// applications: each chat links an adopter (the application's user) and the
// owning rescue, then carries a faker back-and-forth of messages. MANUAL +
// gated via assertSpamAllowed. Additive (fresh UUIDs per run).
//
// Cross-schema reads (dev-only god-access): (application_id, user_id,
// rescue_id) from applications.applications, plus a staff user_id per rescue
// from rescue.staff_members — both restricted to the spam population.
//
// Volume: SPAM_CHATS (default 150), SPAM_MESSAGES (default 2000). Messages are
// spread across the chats, alternating adopter/staff senders.

import { randomUUID } from 'node:crypto';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

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

  const built: BuiltChat[] = Array.from({ length: deps.chats }, () => ({
    chatId: randomUUID(),
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
  await bulkInsert({ query: deps.query }, 'chat.chats', CHAT_COLUMNS, chatRows);

  const participantRows = built.flatMap(b => [
    [randomUUID(), b.chatId, b.seed.adopterId, 'user', b.seed.rescueId, now, now],
    [randomUUID(), b.chatId, b.seed.staffId, 'rescue', b.seed.rescueId, now, now],
  ]);
  await bulkInsert(
    { query: deps.query },
    'chat.chat_participants',
    PARTICIPANT_COLUMNS,
    participantRows
  );

  // Spread the message budget across chats; alternate adopter/staff sender.
  const messageRows = Array.from({ length: deps.messages }, (_, i) => {
    const chat = built[i % built.length];
    const sender = i % 2 === 0 ? chat.seed.adopterId : chat.seed.staffId;
    return [randomUUID(), chat.chatId, sender, deps.faker.lorem.sentence(), 'plain', now, now];
  });
  await bulkInsert({ query: deps.query }, 'chat.messages', MESSAGE_COLUMNS, messageRows);

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
