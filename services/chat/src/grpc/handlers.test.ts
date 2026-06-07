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
  const nats = { publish: vi.fn() };
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

  it('inserts the message and publishes chat.messageCreated after commit', async () => {
    // isParticipantOrAdmin → one row
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
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

  it('returns NOT_FOUND when the target message is missing', async () => {
    // message lookup → empty
    mocks.poolScript.push({ rows: [] });
    await expect(react(mocks.deps, ADOPTER_PRINCIPAL, BASE_REACT)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('adds a reaction and publishes chat.reactionAdded', async () => {
    // message lookup → ok
    mocks.poolScript.push({ rows: [{ chat_id: 'chat-1' }] });
    // isParticipantOrAdmin → ok
    mocks.poolScript.push({ rows: [{ chat_participant_id: 'p-1' }] });
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

describe('HandlerError', () => {
  it('exposes the code on the error', () => {
    const err = new HandlerError('NOT_FOUND', 'gone');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('gone');
  });
});
