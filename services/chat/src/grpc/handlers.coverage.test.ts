import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  ApplicationsV1,
  RescueV1,
  type ListChatsRequest,
  type ListMessagesRequest,
  type MarkReadRequest,
  type OpenChatRequest,
  type ReactRequest,
  type SendMessageRequest,
} from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from './applications-client.js';
import type { RescueClient } from './rescue-client.js';
import {
  deleteChat,
  deleteMessage,
  listChats,
  listMessages,
  makeOpenChat,
  markRead,
  react,
  sendMessage,
} from './handlers.js';

// Stubbed cross-service clients for makeOpenChat (ADS-918): app-1
// belongs to usr-adopter at rescue rsc-1, whose staff list contains
// usr-rescue. Mirrors handlers.test.ts.
const makeOpenChatWithStubs = (): ReturnType<typeof makeOpenChat> => {
  const applicationsClient: ApplicationsClient = {
    getApplication: vi.fn().mockResolvedValue({
      application: ApplicationsV1.Application.fromPartial({
        applicationId: 'app-1',
        adopterId: 'usr-adopter',
        rescueId: 'rsc-1',
      }),
      timeline: [],
    }),
    close: vi.fn(),
  };
  const rescueClient: RescueClient = {
    listStaffMembers: vi.fn().mockResolvedValue({
      staffMembers: [RescueV1.StaffMember.fromPartial({ userId: 'usr-rescue', rescueId: 'rsc-1' })],
    }),
    close: vi.fn(),
  };
  return makeOpenChat(applicationsClient, rescueClient);
};

// Additional behavioural coverage for the gRPC handlers — focused on the
// branches the primary handlers.test.ts leaves open: missing-argument
// guards, the super_admin participant bypass, keyset-pagination cursor
// encode/decode (next-page + malformed cursor), and the post-commit
// "insert/delete returned no rows" INTERNAL guards. All DB + NATS work is
// mocked at the boundary (pg Pool/PoolClient + a NATS publish spy); there
// is no live infrastructure.

// --- Principal fixtures ---------------------------------------------

const ADOPTER_PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [
    'chats.create' as Permission,
    'chats.read' as Permission,
    'messages.create' as Permission,
  ],
};

// super_admin bypasses the participant-membership SELECT in
// isParticipantOrAdmin regardless of explicit grants.
const SUPER_ADMIN_PRINCIPAL: Principal = {
  userId: 'usr-root' as UserId,
  roles: ['super_admin'],
  permissions: ['chats.read' as Permission, 'messages.create' as Permission],
};

// --- Row fixtures ----------------------------------------------------

const chatRowFixture = (overrides: Record<string, unknown> = {}) => ({
  chat_id: 'chat-1',
  application_id: 'app-1',
  rescue_id: '00000000-0000-0000-0000-000000000000',
  pet_id: null,
  status: 'active' as const,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

const messageRowFixture = (overrides: Record<string, unknown> = {}) => ({
  message_id: 'msg-1',
  chat_id: 'chat-1',
  sender_id: 'usr-adopter',
  content: 'Hello world',
  edited_at: null,
  deleted_at: null,
  created_at: new Date('2026-06-01T00:01:00Z'),
  ...overrides,
});

// --- Mock factory (mirrors handlers.test.ts) ------------------------

function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [] }),
  };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  return {
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
    poolScript,
    deps: {
      pool: pool as unknown as Pool,
      nats: nats as unknown as NatsConnection,
    },
  };
}

// --- missing-argument guards ----------------------------------------

describe('handler argument validation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('openChat rejects a missing other_user_id', async () => {
    const req: OpenChatRequest = { applicationId: 'app-1', otherUserId: '' };
    await expect(makeOpenChatWithStubs()(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject(
      {
        code: 'INVALID_ARGUMENT',
      }
    );
  });

  it('sendMessage rejects a missing chat_id', async () => {
    const req: SendMessageRequest = { chatId: '', body: 'hi' };
    await expect(sendMessage(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('listMessages rejects a missing chat_id', async () => {
    const req: ListMessagesRequest = { chatId: '', limit: 0 };
    await expect(listMessages(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('markRead rejects a missing chat_id', async () => {
    const req: MarkReadRequest = { chatId: '', upToMessageId: 'msg-1' };
    await expect(markRead(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('markRead rejects a missing up_to_message_id', async () => {
    const req: MarkReadRequest = { chatId: 'chat-1', upToMessageId: '' };
    await expect(markRead(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('react rejects a missing message_id', async () => {
    const req: ReactRequest = { messageId: '', emoji: '👍', remove: false };
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('react rejects a missing emoji', async () => {
    const req: ReactRequest = { messageId: 'msg-1', emoji: '', remove: false };
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});

// --- super_admin participant bypass ---------------------------------

describe('super_admin participant bypass', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lists messages for a super_admin without a membership lookup', async () => {
    // No chat_participants SELECT is scripted: the bypass short-circuits it.
    // Only the messages SELECT + reactions SELECT run.
    mocks.poolScript.push({ rows: [messageRowFixture()] });
    mocks.poolScript.push({ rows: [] });

    const res = await listMessages(mocks.deps, SUPER_ADMIN_PRINCIPAL, {
      chatId: 'chat-1',
      limit: 0,
    });

    expect(res.messages).toHaveLength(1);
    // The participant-membership SELECT was never issued: the first pool
    // query is the messages SELECT itself.
    const firstSql = (mocks.poolMock.query.mock.calls[0] as [string])[0];
    expect(firstSql).toMatch(/FROM messages/);
    expect(firstSql).not.toMatch(/FROM chat_participants/);
  });
});

// --- keyset pagination cursors --------------------------------------

describe('keyset pagination cursors', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('listMessages emits a nextCursor when a full page is returned', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] }); // participant check
    mocks.poolScript.push({
      rows: [messageRowFixture({ message_id: 'm-last' })],
    });
    mocks.poolScript.push({ rows: [] }); // reactions

    const res = await listMessages(mocks.deps, ADOPTER_PRINCIPAL, {
      chatId: 'chat-1',
      limit: 1, // exactly one row back → page is "full" → cursor emitted
    });

    expect(res.nextCursor).toBeDefined();
    const decoded = JSON.parse(
      Buffer.from(res.nextCursor as string, 'base64url').toString('utf8')
    ) as { createdAt: string; messageId: string };
    expect(decoded.messageId).toBe('m-last');
  });

  it('listMessages decodes a supplied cursor and binds it into the keyset SQL', async () => {
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-06-01T00:00:00.000Z', messageId: 'm-prev' }),
      'utf8'
    ).toString('base64url');

    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolScript.push({ rows: [] }); // no further rows
    mocks.poolScript.push({ rows: [] }); // reactions (empty list)

    await listMessages(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1', limit: 50, cursor });

    const messagesCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('FROM messages') && sql.includes('<')
    ) as [string, unknown[]] | undefined;
    expect(messagesCall).toBeDefined();
    // The keyset comparison binds the decoded cursor fields.
    expect(messagesCall?.[1]).toContain('2026-06-01T00:00:00.000Z');
    expect(messagesCall?.[1]).toContain('m-prev');
  });

  it('listMessages rejects a malformed cursor', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    await expect(
      listMessages(mocks.deps, ADOPTER_PRINCIPAL, {
        chatId: 'chat-1',
        limit: 50,
        cursor: '!!!not-base64-json!!!',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('listChats emits a nextCursor when a full page is returned', async () => {
    // SELECT chats → exactly one row (limit 1 → full page)
    mocks.poolScript.push({ rows: [chatRowFixture({ chat_id: 'chat-last' })] });
    // chatRowToProto helpers: participants then last-message-preview
    mocks.poolScript.push({ rows: [{ participant_id: 'usr-adopter' }] });
    mocks.poolScript.push({ rows: [] });

    const req: ListChatsRequest = { limit: 1, unreadOnly: false };
    const res = await listChats(mocks.deps, ADOPTER_PRINCIPAL, req);

    expect(res.nextCursor).toBeDefined();
    const decoded = JSON.parse(
      Buffer.from(res.nextCursor as string, 'base64url').toString('utf8')
    ) as { updatedAt: string; chatId: string };
    expect(decoded.chatId).toBe('chat-last');
  });

  it('listChats decodes a supplied cursor and binds it into the keyset SQL', async () => {
    const cursor = Buffer.from(
      JSON.stringify({ updatedAt: '2026-06-01T00:00:00.000Z', chatId: 'chat-prev' }),
      'utf8'
    ).toString('base64url');
    mocks.poolScript.push({ rows: [] }); // SELECT chats → none

    await listChats(mocks.deps, ADOPTER_PRINCIPAL, { limit: 20, unreadOnly: false, cursor });

    const chatsCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(chatsCall[0]).toMatch(/c\.updated_at, c\.chat_id\) </);
    expect(chatsCall[1]).toContain('2026-06-01T00:00:00.000Z');
    expect(chatsCall[1]).toContain('chat-prev');
  });
});

// --- post-commit "no rows" INTERNAL guards --------------------------

describe('post-commit INTERNAL guards', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sendMessage throws INTERNAL when the INSERT returns no rows', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] }); // participant
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] }); // writable
    mocks.clientScript.push({ rows: [] }); // INSERT message → no rows
    mocks.clientScript.push({ rows: [] }); // UPDATE chats
    mocks.clientScript.push({ rows: [] }); // SELECT participants

    await expect(
      sendMessage(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1', body: 'hi' })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('react throws INTERNAL when the message vanishes after the mutation commits', async () => {
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] }); // message lookup
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] }); // participant
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] }); // writable
    mocks.clientScript.push({ rows: [{ participant_id: 'usr-adopter' }] }); // SELECT participants
    mocks.clientScript.push({ rows: [] }); // INSERT reaction
    mocks.poolScript.push({ rows: [] }); // re-fetch message → gone

    await expect(
      react(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1', emoji: '👍', remove: false })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('deleteMessage throws INTERNAL when the UPDATE returns no rows', async () => {
    mocks.poolScript.push({ rows: [messageRowFixture({ sender_id: 'usr-adopter' })] }); // existing
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] }); // writable
    mocks.clientScript.push({ rows: [] }); // UPDATE → no rows
    mocks.clientScript.push({ rows: [{ participant_id: 'usr-adopter' }] }); // participants

    await expect(
      deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1' })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('deleteChat throws INTERNAL when the UPDATE returns no rows', async () => {
    // Deleting is a staff/safety-team primitive (ADS-923) — use the
    // super_admin fixture so the privilege gate passes without needing
    // a participant-membership lookup.
    mocks.poolScript.push({ rows: [{ ...chatRowFixture(), deleted_at: null }] }); // existing
    mocks.clientScript.push({ rows: [] }); // UPDATE → no rows
    mocks.clientScript.push({ rows: [{ participant_id: 'usr-adopter' }] }); // participants

    await expect(
      deleteChat(mocks.deps, SUPER_ADMIN_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});

// --- openChat INTERNAL guard ----------------------------------------

describe('openChat insert guard', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('throws INTERNAL when the chat INSERT returns no rows', async () => {
    mocks.poolScript.push({ rows: [] }); // existing-chat lookup → none
    mocks.clientScript.push({ rows: [] }); // INSERT chat → no rows
    mocks.clientScript.push({ rows: [] }); // INSERT participants

    await expect(
      makeOpenChatWithStubs()(mocks.deps, ADOPTER_PRINCIPAL, {
        applicationId: 'app-1',
        otherUserId: 'usr-rescue',
      })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});
