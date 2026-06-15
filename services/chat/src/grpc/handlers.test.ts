import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import type {
  ListChatsRequest,
  ListMessagesRequest,
  MarkReadRequest,
  OpenChatRequest,
  ReactRequest,
  SendMessageRequest,
} from '@adopt-dont-shop/proto';

import {
  HandlerError,
  listChats,
  listMessages,
  markRead,
  openChat,
  react,
  deleteChat,
  deleteMessage,
  getChat,
  getChatUnreadCount,
  searchChats,
  sendMessage,
} from './handlers.js';

// --- Principal fixtures ---------------------------------------------

const ADOPTER_PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['chat.create' as Permission, 'chat.read' as Permission, 'chat.send' as Permission],
};

const UNPRIVILEGED_PRINCIPAL: Principal = {
  userId: 'usr-noperm' as UserId,
  roles: ['adopter'],
  permissions: [],
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

// --- Mock factory ---------------------------------------------------

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
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    nats: nats as unknown as NatsConnection,
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

const realClientQueries = (mocks: ReturnType<typeof makeMocks>): string[] =>
  (mocks.clientMock.query.mock.calls as Array<[string]>)
    .map(([sql]) => sql.trim().split(/\s+/)[0].toUpperCase())
    .filter(op => op !== 'BEGIN' && op !== 'COMMIT' && op !== 'ROLLBACK');

// --- OpenChat -------------------------------------------------------

const BASE_OPEN: OpenChatRequest = {
  applicationId: 'app-1',
  otherUserId: 'usr-rescue',
};

describe('openChat', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when application_id is missing', async () => {
    await expect(
      openChat(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_OPEN, applicationId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when other_user_id equals the principal', async () => {
    await expect(
      openChat(mocks.deps, ADOPTER_PRINCIPAL, {
        ...BASE_OPEN,
        otherUserId: 'usr-adopter',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when the principal lacks chat.create', async () => {
    await expect(openChat(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns the existing chat without a transaction when one exists', async () => {
    // pool.query #1 = existing chat lookup
    // pool.query #2 = loadChatParticipants
    // pool.query #3 = loadLastMessagePreview
    mocks.poolScript.push({ rows: [chatRowFixture()] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    const res = await openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN);
    expect(res.created).toBe(false);
    expect(res.chat?.chatId).toBe('chat-1');
    expect(res.chat?.participantUserIds).toEqual(['usr-adopter', 'usr-rescue']);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('creates a new chat + participants and publishes chat.created', async () => {
    // existing-chat lookup → none
    mocks.poolScript.push({ rows: [] });
    // Inside withTransaction: INSERT chat, INSERT participants
    mocks.clientScript.push({ rows: [chatRowFixture({ chat_id: 'new-chat' })] });
    mocks.clientScript.push({ rows: [] });
    // After-commit: loadChatParticipants, loadLastMessagePreview
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    const res = await openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN);
    expect(res.created).toBe(true);
    expect(res.chat?.chatId).toBe('new-chat');
    expect(realClientQueries(mocks)).toEqual(['INSERT', 'INSERT']);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.created');
  });

  const insertChatParams = (mocks: ReturnType<typeof makeMocks>): unknown[] => {
    const call = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(([sql]) =>
      sql.includes('INSERT INTO chats')
    );
    if (!call) {
      throw new Error('no INSERT INTO chats call recorded');
    }
    return call[1];
  };

  it('persists the rescueId from the request on the new chat row', async () => {
    mocks.poolScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [chatRowFixture({ chat_id: 'new-chat', rescue_id: 'rsc-1' })],
    });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    await openChat(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_OPEN, rescueId: 'rsc-1' });

    expect(insertChatParams(mocks)).toContain('rsc-1');
  });

  it('falls back to the null-UUID placeholder when no rescueId is supplied', async () => {
    mocks.poolScript.push({ rows: [] });
    mocks.clientScript.push({ rows: [chatRowFixture({ chat_id: 'new-chat' })] });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    await openChat(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_OPEN, rescueId: '' });

    expect(insertChatParams(mocks)).toContain('00000000-0000-0000-0000-000000000000');
  });
});

// --- SendMessage ----------------------------------------------------

const BASE_SEND: SendMessageRequest = {
  chatId: 'chat-1',
  body: 'Hello!',
};

describe('sendMessage', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects empty body', async () => {
    await expect(
      sendMessage(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_SEND, body: '   ' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when principal lacks chat.send', async () => {
    await expect(sendMessage(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_SEND)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects when principal is not a participant', async () => {
    // isParticipantOrAdmin → empty
    mocks.poolScript.push({ rows: [] });
    await expect(sendMessage(mocks.deps, ADOPTER_PRINCIPAL, BASE_SEND)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects a body over the length limit', async () => {
    await expect(
      sendMessage(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_SEND, body: 'a'.repeat(10_001) })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects sending to a non-active (archived/locked) chat', async () => {
    // isParticipantOrAdmin → ok
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → archived chat
    mocks.poolScript.push({ rows: [{ status: 'archived', deleted_at: null }] });
    await expect(sendMessage(mocks.deps, ADOPTER_PRINCIPAL, BASE_SEND)).rejects.toMatchObject({
      code: 'FAILED_PRECONDITION',
    });
    // No write was attempted.
    expect(realClientQueries(mocks)).toEqual([]);
  });

  it('rejects sending to a soft-deleted chat', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → row with deleted_at set
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: new Date() }] });
    await expect(sendMessage(mocks.deps, ADOPTER_PRINCIPAL, BASE_SEND)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(realClientQueries(mocks)).toEqual([]);
  });

  it('inserts the message and publishes chat.messageCreated after commit', async () => {
    // isParticipantOrAdmin → one row
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → active, not deleted
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] });
    // INSERT message, UPDATE chats.updated_at, SELECT participants
    mocks.clientScript.push({ rows: [messageRowFixture()] });
    mocks.clientScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });

    const res = await sendMessage(mocks.deps, ADOPTER_PRINCIPAL, BASE_SEND);
    expect(res.message?.body).toBe('Hello world');
    expect(realClientQueries(mocks)).toEqual(['INSERT', 'UPDATE', 'SELECT']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.messageCreated');
  });
});

// --- ListMessages ---------------------------------------------------

describe('listMessages', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const BASE_LIST: ListMessagesRequest = { chatId: 'chat-1', limit: 0 };

  it('rejects unprivileged principals', async () => {
    await expect(listMessages(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_LIST)).rejects.toMatchObject(
      { code: 'PERMISSION_DENIED' }
    );
  });

  it('rejects a participant-scope miss (has chat.read but is not a member)', async () => {
    // isParticipantOrAdmin SELECT → no rows
    mocks.poolScript.push({ rows: [] });
    await expect(listMessages(mocks.deps, ADOPTER_PRINCIPAL, BASE_LIST)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns ordered rows with reactions aggregated', async () => {
    // isParticipantOrAdmin → ok
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // SELECT messages
    mocks.poolScript.push({
      rows: [
        messageRowFixture({ message_id: 'm-newer', created_at: new Date('2026-06-02') }),
        messageRowFixture({ message_id: 'm-older', created_at: new Date('2026-06-01') }),
      ],
    });
    // loadMessageReactions
    mocks.poolScript.push({
      rows: [
        {
          reaction_id: 'r-1',
          message_id: 'm-newer',
          user_id: 'usr-x',
          emoji: '👍',
          created_at: new Date('2026-06-02T01:00:00Z'),
        },
      ],
    });

    const res = await listMessages(mocks.deps, ADOPTER_PRINCIPAL, BASE_LIST);
    expect(res.messages).toHaveLength(2);
    expect(res.messages?.[0].messageId).toBe('m-newer');
    expect(res.messages?.[0].reactions).toHaveLength(1);
    expect(res.messages?.[0].reactions?.[0]).toMatchObject({
      emoji: '👍',
      userIds: ['usr-x'],
    });
  });

  it('rejects a limit above the max', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    await expect(
      listMessages(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_LIST, limit: 9999 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

// --- ListChats ------------------------------------------------------

describe('listChats', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const BASE: ListChatsRequest = { limit: 0, unreadOnly: false };

  it('rejects unprivileged principals', async () => {
    await expect(listChats(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns the chats joined by the principal', async () => {
    // SELECT chats
    mocks.poolScript.push({ rows: [chatRowFixture()] });
    // chatRowToProto → loadChatParticipants + loadLastMessagePreview
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    const res = await listChats(mocks.deps, ADOPTER_PRINCIPAL, BASE);
    expect(res.chats).toHaveLength(1);
    expect(res.chats?.[0].chatId).toBe('chat-1');
  });
});

// --- MarkRead -------------------------------------------------------

const BASE_MARK: MarkReadRequest = {
  chatId: 'chat-1',
  upToMessageId: 'msg-1',
};

describe('markRead', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects principals without chat.read', async () => {
    await expect(markRead(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_MARK)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects a non-participant (participant-scope miss)', async () => {
    // isParticipantOrAdmin → no rows
    mocks.poolScript.push({ rows: [] });
    await expect(markRead(mocks.deps, ADOPTER_PRINCIPAL, BASE_MARK)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects when message does not exist in chat', async () => {
    // isParticipantOrAdmin → ok
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // target message lookup → empty
    mocks.poolScript.push({ rows: [] });
    await expect(markRead(mocks.deps, ADOPTER_PRINCIPAL, BASE_MARK)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('stamps reads + bumps the participant last_read_at watermark', async () => {
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolScript.push({ rows: [{ created_at: new Date('2026-06-01T00:01:00Z') }] });
    // INSERT message_reads, UPDATE chat_participants, SELECT participants
    mocks.clientScript.push({ rows: [] });
    mocks.clientScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });

    const res = await markRead(mocks.deps, ADOPTER_PRINCIPAL, BASE_MARK);
    expect(res.upToMessageId).toBe('msg-1');
    expect(realClientQueries(mocks)).toEqual(['INSERT', 'UPDATE', 'SELECT']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.messageRead');
  });

  it('advances last_read_at to the target message timestamp (not now()) and never backwards', async () => {
    const targetCreatedAt = new Date('2026-06-01T00:01:00Z');
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolScript.push({ rows: [{ created_at: targetCreatedAt }] });
    mocks.clientScript.push({ rows: [] });
    mocks.clientScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });

    await markRead(mocks.deps, ADOPTER_PRINCIPAL, BASE_MARK);

    const updateCall = mocks.clientMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE chat_participants')
    ) as [string, unknown[]] | undefined;
    expect(updateCall).toBeDefined();
    // Watermark must be derived from the target's created_at, not wall-clock
    // now(), so a message arriving mid-mark is not silently swallowed; and it
    // must be monotonic (GREATEST) so out-of-order marks never rewind it.
    expect(updateCall?.[0]).toMatch(/GREATEST\(last_read_at,/);
    expect(updateCall?.[0]).not.toMatch(/last_read_at = now\(\)/);
    expect(updateCall?.[1]).toContain(targetCreatedAt);
  });
});

// --- React ----------------------------------------------------------

const BASE_REACT: ReactRequest = {
  messageId: 'msg-1',
  emoji: '👍',
  remove: false,
};

describe('react', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects principals without chat.send', async () => {
    await expect(react(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_REACT)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects an emoji longer than the column bound before touching the DB', async () => {
    await expect(
      react(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_REACT, emoji: 'x'.repeat(33) })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // No DB work attempted — validation precedes the message lookup.
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('rejects reacting in a chat the caller is not a member of', async () => {
    // message lookup → ok (resolves the chat)
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    // isParticipantOrAdmin → no rows
    mocks.poolScript.push({ rows: [] });
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns NOT_FOUND when the target message is missing', async () => {
    // message lookup → empty
    mocks.poolScript.push({ rows: [] });
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('uses ON CONFLICT DO NOTHING so re-reacting is idempotent', async () => {
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → active, not deleted
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({ rows: [messageRowFixture()] });
    mocks.poolScript.push({ rows: [] });

    await react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT);

    const insertCall = mocks.clientMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO message_reactions')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.[0]).toMatch(/ON CONFLICT \(message_id, user_id, emoji\) DO NOTHING/);
  });

  it('rejects adding a reaction in a non-active chat', async () => {
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → locked
    mocks.poolScript.push({ rows: [{ status: 'locked', deleted_at: null }] });
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT)).rejects.toMatchObject({
      code: 'FAILED_PRECONDITION',
    });
    expect(realClientQueries(mocks)).toEqual([]);
  });

  it('adds a reaction and publishes chat.reactionAdded', async () => {
    // message lookup → ok
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    // isParticipantOrAdmin → ok
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // ensureChatWritable → active, not deleted
    mocks.poolScript.push({ rows: [{ status: 'active', deleted_at: null }] });
    // Inside withTransaction: SELECT participants, INSERT reaction
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.clientScript.push({ rows: [] });
    // After-commit: re-fetch message, reactions
    mocks.poolScript.push({ rows: [messageRowFixture()] });
    mocks.poolScript.push({
      rows: [
        {
          reaction_id: 'r-1',
          message_id: 'msg-1',
          user_id: 'usr-adopter',
          emoji: '👍',
          created_at: new Date(),
        },
      ],
    });

    const res = await react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT);
    expect(res.message?.reactions).toHaveLength(1);
    expect(realClientQueries(mocks)).toEqual(['SELECT', 'INSERT']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.reactionAdded');
  });

  it('removes a reaction and publishes chat.reactionRemoved', async () => {
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
    // Inside withTransaction: SELECT participants, DELETE reaction
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.clientScript.push({ rows: [] });
    // Re-fetch
    mocks.poolScript.push({ rows: [messageRowFixture()] });
    mocks.poolScript.push({ rows: [] });

    const res = await react(mocks.deps, ADOPTER_PRINCIPAL, {
      ...BASE_REACT,
      remove: true,
    });
    expect(res.message?.reactions).toHaveLength(0);
    expect(realClientQueries(mocks)).toEqual(['SELECT', 'DELETE']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.reactionRemoved');
  });
});

// --- searchChats -----------------------------------------------------

describe('searchChats', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects an empty query', async () => {
    await expect(
      searchChats(mocks.deps, ADOPTER_PRINCIPAL, { query: '', page: 1, limit: 20 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a query longer than 100 chars', async () => {
    await expect(
      searchChats(mocks.deps, ADOPTER_PRINCIPAL, { query: 'a'.repeat(101), page: 1, limit: 20 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unprivileged principal', async () => {
    await expect(
      searchChats(mocks.deps, UNPRIVILEGED_PRINCIPAL, { query: 'cat', page: 1, limit: 20 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns empty hits when count is 0 (no FTS match)', async () => {
    mocks.poolScript.push({ rows: [{ total: '0' }] });

    const res = await searchChats(mocks.deps, ADOPTER_PRINCIPAL, {
      query: 'unfindable',
      page: 1,
      limit: 20,
    });

    expect(res).toEqual({ hits: [], page: 1, limit: 20, total: 0 });
  });

  it('returns hits with chat + match populated', async () => {
    // SELECT COUNT(*) — total
    mocks.poolScript.push({ rows: [{ total: '1' }] });
    // The outer ORDERED SELECT — one matching chat + message row
    mocks.poolScript.push({
      rows: [
        {
          c_chat_id: 'chat-1',
          c_application_id: 'app-1',
          c_rescue_id: '00000000-0000-0000-0000-000000000000',
          c_pet_id: null,
          c_status: 'active',
          c_created_at: new Date('2026-06-01T00:00:00Z'),
          c_updated_at: new Date('2026-06-01T00:00:00Z'),
          m_message_id: 'msg-9',
          m_chat_id: 'chat-1',
          m_sender_id: 'usr-rescue',
          m_content: 'About that adoption',
          m_edited_at: null,
          m_deleted_at: null,
          m_created_at: new Date('2026-06-01T00:30:00Z'),
        },
      ],
    });
    // Reactions lookup for matching message id
    mocks.poolScript.push({ rows: [] });
    // chatRowToProto helpers — participants then last-message-preview
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({
      rows: [
        {
          content: 'About that adoption',
          sender_id: 'usr-rescue',
          created_at: new Date('2026-06-01T00:30:00Z'),
        },
      ],
    });

    const res = await searchChats(mocks.deps, ADOPTER_PRINCIPAL, {
      query: 'adoption',
      page: 1,
      limit: 20,
    });

    expect(res.total).toBe(1);
    expect(res.hits).toHaveLength(1);
    expect(res.hits[0].chat?.chatId).toBe('chat-1');
    expect(res.hits[0].match?.messageId).toBe('msg-9');
    expect(res.hits[0].match?.body).toBe('About that adoption');
  });

  it('respects an optional rescue_id filter (binds it as a param)', async () => {
    mocks.poolScript.push({ rows: [{ total: '0' }] });

    await searchChats(mocks.deps, ADOPTER_PRINCIPAL, {
      query: 'cat',
      page: 1,
      limit: 20,
      rescueId: 'rsc-1',
    });

    const countCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('COUNT(DISTINCT c.chat_id)')
    );
    expect(countCall).toBeDefined();
    const params = countCall![1] as unknown[];
    // 'english', query, principal.userId, rescueId
    expect(params).toEqual(['english', 'cat', 'usr-adopter', 'rsc-1']);
  });

  it('passes pagination params through correctly', async () => {
    mocks.poolScript.push({ rows: [{ total: '5' }] });
    mocks.poolScript.push({ rows: [] });

    await searchChats(mocks.deps, ADOPTER_PRINCIPAL, {
      query: 'cat',
      page: 2,
      limit: 10,
    });

    // The hits SELECT receives limit + offset as the last two params.
    const hitsCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('hits') && sql.includes('LIMIT')
    );
    expect(hitsCall).toBeDefined();
    const params = hitsCall![1] as unknown[];
    expect(params[params.length - 2]).toBe(10); // limit
    expect(params[params.length - 1]).toBe(10); // offset = (page-1)*limit
  });
});

// --- getChatUnreadCount ---------------------------------------------

describe('getChatUnreadCount', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing chat_id', async () => {
    await expect(
      getChatUnreadCount(mocks.deps, ADOPTER_PRINCIPAL, { chatId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects principals without chat.read', async () => {
    await expect(
      getChatUnreadCount(mocks.deps, UNPRIVILEGED_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns NOT_FOUND (no enumeration) when caller is not a participant', async () => {
    // isParticipantOrAdmin SELECT returns no rows.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getChatUnreadCount(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the unread count for a participant', async () => {
    // Participant check passes
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ chat_participant_id: 'p-1' }],
    });
    // COUNT query
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

    const res = await getChatUnreadCount(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.unreadCount).toBe(5);

    // Confirm the binding: $1 = chatId, $2 = principal.userId.
    const countCall = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    expect(countCall[1]).toEqual(['chat-1', 'usr-adopter']);
  });

  it('returns 0 when no unread messages', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ chat_participant_id: 'p-1' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const res = await getChatUnreadCount(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.unreadCount).toBe(0);
  });
});

describe('HandlerError', () => {
  it('exposes the code on the error', () => {
    const err = new HandlerError('NOT_FOUND', 'gone');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('gone');
  });
});

// --- deleteMessage --------------------------------------------------

describe('deleteMessage', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing message_id', async () => {
    await expect(
      deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns NOT_FOUND for non-existent message', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'missing' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("rejects when a non-sender tries to delete someone else's message", async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [messageRowFixture({ sender_id: 'usr-someone-else' })],
    });

    await expect(
      deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('lets the sender soft-delete their own message and publishes chat.messageDeleted', async () => {
    // existing row → sender owns it, not yet deleted
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [messageRowFixture({ sender_id: 'usr-adopter' })],
    });
    // Inside withTransaction: UPDATE returning, SELECT participants
    mocks.clientScript.push({ rows: [messageRowFixture({ deleted_at: new Date() })] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    // After commit: reactions lookup
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1' });
    expect(res.message?.deletedAt).toBeDefined();
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.messageDeleted');
  });

  it('is idempotent on an already-deleted row (no write, no publish)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        messageRowFixture({
          sender_id: 'usr-adopter',
          deleted_at: new Date('2026-05-01T00:00:00Z'),
        }),
      ],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // reactions
    const res = await deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1' });
    expect(res.message?.deletedAt).toBeDefined();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});

// --- getChat --------------------------------------------------------

describe('getChat', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing chat_id', async () => {
    await expect(getChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects principals without chat.read', async () => {
    await expect(
      getChat(mocks.deps, UNPRIVILEGED_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns NOT_FOUND (no enumeration) for non-participants', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND when the row is soft-deleted or missing', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the chat for a participant + populates last message preview', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [chatRowFixture()] });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          content: 'Hi there',
          sender_id: 'usr-rescue',
          created_at: new Date('2026-06-05T12:00:00Z'),
        },
      ],
    });

    const res = await getChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.chat?.chatId).toBe('chat-1');
    expect(res.chat?.participantUserIds).toEqual(['usr-adopter', 'usr-rescue']);
    expect(res.chat?.lastMessagePreview).toBe('Hi there');
  });
});

// --- deleteChat -----------------------------------------------------

describe('deleteChat', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing chat_id', async () => {
    await expect(deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects principals without chat.read', async () => {
    await expect(
      deleteChat(mocks.deps, UNPRIVILEGED_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns NOT_FOUND (no enumeration) when caller is not a participant', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND when the chat row is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is idempotent on an already-deleted chat (no write, no publish)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ ...chatRowFixture(), deleted_at: new Date('2026-06-05T12:00:00Z') }],
    });
    // chatRowToProto helpers
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.chat?.chatId).toBe('chat-1');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('soft-deletes inside withTransaction and publishes chat.deleted', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ ...chatRowFixture(), deleted_at: null }],
    });
    // Inside withTransaction: UPDATE returning + participants
    mocks.clientScript.push({ rows: [chatRowFixture()] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    // After commit chatRowToProto helpers
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await deleteChat(mocks.deps, ADOPTER_PRINCIPAL, {
      chatId: 'chat-1',
      reason: 'cleanup',
    });
    expect(res.chat?.chatId).toBe('chat-1');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('chat.deleted');
    const rawData = mocks.natsMock.publish.mock.calls[0][1];
    const dataStr =
      rawData instanceof Uint8Array ? new TextDecoder().decode(rawData) : String(rawData);
    const envelope = JSON.parse(dataStr) as {
      payload: { reason: string | null; participantUserIds: string[] };
    };
    expect(envelope.payload.reason).toBe('cleanup');
    expect(envelope.payload.participantUserIds).toEqual(['usr-adopter', 'usr-rescue']);
  });
});
