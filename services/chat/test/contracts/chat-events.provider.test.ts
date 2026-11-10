// Provider verification: service.chat → chat.messageCreated NATS event
//
// Reads the pact files written by
// services/notifications/test/contracts/notifications-chat-message-created.consumer.test.ts and
// services/moderation/test/contracts/moderation-chat-message-created.consumer.test.ts, and proves
// chat.messageCreated carries what service.notifications and service.moderation read.
//
// The message provider runs the real sendMessage handler with a stubbed pool
// and a NATS double, and returns the payload it actually published. See
// ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

import { MESSAGES_SEND, type UserId } from '@adopt-dont-shop/lib.types';
import { ChatV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import { sendMessage, type HandlerDeps } from '../../src/grpc/handlers.js';

// Repo-root pacts/ directory: test/contracts/ → test/ → chat/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const ADOPTER = testPrincipal({ userId: 'usr-adopter' as UserId, permissions: [MESSAGES_SEND] });

// The handler's reads, answered by the SQL they run: the sender is a
// participant, the chat is an active application chat, and its participants
// are the adopter and one staff member. Writes and outbox plumbing get no rows.
async function answer(sql: string) {
  if (sql.includes('INSERT INTO messages')) {
    return {
      rows: [
        {
          message_id: 'msg-001',
          chat_id: 'chat-001',
          sender_id: 'usr-adopter',
          content: 'Is Rex still available?',
          attachments: [],
          edited_at: null,
          deleted_at: null,
          created_at: new Date('2026-06-01T00:01:00Z'),
        },
      ],
    };
  }
  if (sql.includes('SELECT participant_id FROM chat_participants')) {
    return { rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-staff' }] };
  }
  if (sql.includes('SELECT 1 AS ok FROM chats')) {
    return { rows: [{ ok: 1 }] };
  }
  if (sql.includes('FROM chats')) {
    return {
      rows: [
        {
          status: 'active',
          deleted_at: null,
          application_id: 'app-001',
          pet_id: null,
          rescue_id: 'rescue-001',
        },
      ],
    };
  }
  return { rows: [], rowCount: 1 };
}

// --- Message providers ---------------------------------------------------

// "chat.messageCreated event" — state: 'an adopter sends a message in a chat with rescue staff'
async function provideMessageCreated(): Promise<unknown> {
  const query = vi.fn(answer);
  const client = { query, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query };
  const nats = makeNatsDouble();
  const deps: HandlerDeps = {
    // Only query/connect are exercised; the rest of pg.Pool is unused here.
    pool: pool as unknown as Pool,
    nats: nats.connection,
  };

  await sendMessage(
    deps,
    ADOPTER,
    ChatV1.SendMessageRequest.fromPartial({ chatId: 'chat-001', body: 'Is Rex still available?' })
  );

  const call = nats.published.find(c => c.subject === 'chat.messageCreated');
  if (!call?.data) {
    throw new Error('nothing was published on chat.messageCreated');
  }
  const envelope: { payload: unknown } = JSON.parse(new TextDecoder().decode(call.data));
  return envelope.payload;
}

// --- Verification suite --------------------------------------------------

describe('service.chat — provider verification for chat.messageCreated', () => {
  it('fulfils the interaction declared by service.notifications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.chat',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.chat.json')],
      messageProviders: { 'chat.messageCreated event': provideMessageCreated },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });

  it('fulfils the interaction declared by service.moderation', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.chat',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.moderation-service.chat.json')],
      messageProviders: {
        'chat.messageCreated event with a message body': provideMessageCreated,
      },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
