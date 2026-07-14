// Seed entry point — populates the chat.* schema with the canonical dev/e2e
// chat fixture (see seed-data.ts).
//
// Mirrors migrate.ts: invoked by `pnpm db:seed`, reuses loadConfig() +
// createDbClient. References user/rescue ids owned by the auth/rescue seeds,
// but carries no cross-schema FK so insert order across services doesn't
// matter — the root orchestrator runs chat last. The chat row is inserted
// before its participants (intra-schema FK chat_participants → chats).
//
// Idempotent: every INSERT is ON CONFLICT (<pk>) DO UPDATE.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';
import { SEED_CHATS, type SeedChat } from './seed-data.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const UPSERT_CHAT = `
  INSERT INTO chat.chats (chat_id, rescue_id, status, created_by)
  VALUES ($1, $2, 'active', $3)
  ON CONFLICT (chat_id) DO UPDATE SET
    rescue_id = EXCLUDED.rescue_id,
    status = EXCLUDED.status,
    updated_at = now()
`;

const UPSERT_PARTICIPANT = `
  INSERT INTO chat.chat_participants (
    chat_participant_id, chat_id, participant_id, role, rescue_id
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (chat_participant_id) DO UPDATE SET
    role = EXCLUDED.role,
    rescue_id = EXCLUDED.rescue_id,
    updated_at = now()
`;

export type SeedDeps = {
  query: QueryFn;
};

export const seedChats = async (deps: SeedDeps): Promise<string[]> => {
  const seeded: string[] = [];
  for (const chat of SEED_CHATS) {
    await deps.query(UPSERT_CHAT, [chat.chatId, chat.rescueId, chat.createdBy]);
    for (const p of chat.participants) {
      await deps.query(UPSERT_PARTICIPANT, [
        p.chatParticipantId,
        chat.chatId,
        p.participantId,
        p.role,
        p.rescueId,
      ]);
    }
    seeded.push(chat.chatId);
  }
  return seeded;
};

export const assertNotProduction = (): void => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Refusing to run db:seed in production. Set ALLOW_PROD_SEED=true to override.');
  }
};

const main = async (): Promise<void> => {
  assertNotProduction();
  const logger = createLogger({ serviceName: 'service.chat.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding chats', { schema: config.schema, count: SEED_CHATS.length });
    const seeded = await seedChats({
      query: (text, values) => pool.query(text, values as unknown[]),
    });
    logger.info('chat seed complete', { seeded });
  } catch (err) {
    logger.error('chat seed failed', {
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
