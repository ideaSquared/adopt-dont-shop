import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
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
  HandlerError,
  listChats,
  listMessages,
  makeOpenChat,
  markRead,
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
  permissions: [
    'chats.create' as Permission,
    'chats.read' as Permission,
    'messages.create' as Permission,
  ],
};

const UNPRIVILEGED_PRINCIPAL: Principal = {
  userId: 'usr-noperm' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const OTHER_RESCUE_STAFF_PRINCIPAL: Principal = {
  userId: 'usr-other-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: ['chats.read' as Permission, 'chats.create' as Permission],
  rescueId: 'rsc-other' as RescueId,
};

// Staff of the rescue the chatRowFixture below belongs to (null-UUID).
const RESCUE_STAFF_PRINCIPAL: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: ['chats.read' as Permission, 'chats.create' as Permission],
  rescueId: '00000000-0000-0000-0000-000000000000' as RescueId,
};

const MODERATOR_PRINCIPAL: Principal = {
  userId: 'usr-moderator' as UserId,
  roles: ['moderator'],
  permissions: ['chats.read' as Permission],
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

// The rescue that owns application app-1 in the stubbed cross-service
// world below. usr-adopter is its adopter; usr-rescue is on its staff.
const APP_RESCUE_ID = 'rsc-1';

// Stub the two cross-service clients OpenChat consults (ADS-918):
// service.applications resolves app-1 → {usr-adopter, rsc-1} and
// service.rescue lists rsc-1's staff (just usr-rescue).
function makeCrossServiceStubs() {
  const getApplication = vi.fn().mockResolvedValue({
    application: ApplicationsV1.Application.fromPartial({
      applicationId: 'app-1',
      adopterId: 'usr-adopter',
      rescueId: APP_RESCUE_ID,
    }),
    timeline: [],
  });
  const listStaffMembers = vi.fn().mockResolvedValue({
    staffMembers: [
      RescueV1.StaffMember.fromPartial({ userId: 'usr-rescue', rescueId: APP_RESCUE_ID }),
    ],
  });
  const applicationsClient: ApplicationsClient = { getApplication, close: vi.fn() };
  const rescueClient: RescueClient = { listStaffMembers, close: vi.fn() };
  return { applicationsClient, rescueClient, getApplication, listStaffMembers };
}

describe('openChat', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let stubs: ReturnType<typeof makeCrossServiceStubs>;
  let openChat: ReturnType<typeof makeOpenChat>;
  beforeEach(() => {
    mocks = makeMocks();
    stubs = makeCrossServiceStubs();
    openChat = makeOpenChat(stubs.applicationsClient, stubs.rescueClient);
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

  // ADS-918: rescue_id always comes from the resolved application — a
  // request-supplied rescueId (cross-tenant pollution vector) is ignored.
  it('stamps the application’s rescue_id on the new chat, ignoring a mismatched request rescueId', async () => {
    mocks.poolScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [chatRowFixture({ chat_id: 'new-chat', rescue_id: APP_RESCUE_ID })],
    });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    await openChat(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_OPEN, rescueId: 'rsc-victim' });

    expect(insertChatParams(mocks)).toContain(APP_RESCUE_ID);
    expect(insertChatParams(mocks)).not.toContain('rsc-victim');
  });

  // ADS-918: an adopter may only open a chat with staff of the rescue
  // that owns their application — any other user id is rejected before
  // any DB write happens.
  it('rejects an adopter whose other_user_id is not on the rescue’s staff list', async () => {
    await expect(
      openChat(mocks.deps, ADOPTER_PRINCIPAL, { ...BASE_OPEN, otherUserId: 'usr-random' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('rejects a caller who is neither the application adopter nor staff of its rescue', async () => {
    const stranger: Principal = {
      userId: 'usr-stranger' as UserId,
      roles: ['adopter'],
      permissions: ['chats.create' as Permission, 'chats.read' as Permission],
    };
    await expect(openChat(mocks.deps, stranger, BASE_OPEN)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('lets staff of the application’s rescue open a chat with the adopter', async () => {
    const staff: Principal = {
      userId: 'usr-rescue' as UserId,
      roles: ['rescue_staff'],
      permissions: ['chats.create' as Permission, 'chats.read' as Permission],
      rescueId: APP_RESCUE_ID as RescueId,
    };
    mocks.poolScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [chatRowFixture({ chat_id: 'new-chat', rescue_id: APP_RESCUE_ID })],
    });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-rescue' }, { participant_id: 'usr-adopter' }],
    });
    mocks.poolScript.push({ rows: [] });

    const res = await openChat(mocks.deps, staff, { ...BASE_OPEN, otherUserId: 'usr-adopter' });
    expect(res.created).toBe(true);
    // Staff never need the staff-list lookup — the adopter check is
    // against the resolved application directly.
    expect(stubs.listStaffMembers).not.toHaveBeenCalled();
  });

  it('rejects staff opening a chat with someone other than the application adopter', async () => {
    const staff: Principal = {
      userId: 'usr-rescue' as UserId,
      roles: ['rescue_staff'],
      permissions: ['chats.create' as Permission, 'chats.read' as Permission],
      rescueId: APP_RESCUE_ID as RescueId,
    };
    await expect(
      openChat(mocks.deps, staff, { ...BASE_OPEN, otherUserId: 'usr-unrelated' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('rejects staff of a different rescue than the application’s', async () => {
    await expect(
      openChat(mocks.deps, OTHER_RESCUE_STAFF_PRINCIPAL, {
        ...BASE_OPEN,
        otherUserId: 'usr-adopter',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('maps an application NOT_FOUND to INVALID_ARGUMENT', async () => {
    stubs.getApplication.mockRejectedValueOnce({ code: 5 });
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('propagates a PERMISSION_DENIED from the applications service', async () => {
    stubs.getApplication.mockRejectedValueOnce({ code: 7 });
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps any other applications-service failure to INTERNAL', async () => {
    stubs.getApplication.mockRejectedValueOnce({ code: 14 });
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });

  // ADS-978: resolveOpenChatRescueId's adopter-initiated branch wraps
  // listStaffMembers the same way getApplication above is wrapped, so a
  // downstream failure never surfaces as an opaque INTERNAL with the raw
  // @grpc/grpc-js message attached.
  it('maps an UNAVAILABLE from listStaffMembers to a stable INTERNAL message', async () => {
    stubs.listStaffMembers.mockRejectedValueOnce(
      Object.assign(new Error('14 UNAVAILABLE: no connection established'), { code: 14 })
    );
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'failed to resolve rescue staff',
    });
  });

  it('maps a PERMISSION_DENIED from listStaffMembers to a distinct, stable INTERNAL message', async () => {
    stubs.listStaffMembers.mockRejectedValueOnce(
      Object.assign(new Error('7 PERMISSION_DENIED: x-principal-token rejected'), { code: 7 })
    );
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'INTERNAL',
      message: 'failed to resolve rescue staff (auth)',
    });
  });

  it('treats a response without an application as INVALID_ARGUMENT', async () => {
    stubs.getApplication.mockResolvedValueOnce({ application: undefined, timeline: [] });
    await expect(openChat(mocks.deps, ADOPTER_PRINCIPAL, BASE_OPEN)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('lets super_admin open a chat without an adopter/staff relationship', async () => {
    const root: Principal = {
      userId: 'usr-root' as UserId,
      roles: ['super_admin'],
      permissions: [],
    };
    mocks.poolScript.push({ rows: [] });
    mocks.clientScript.push({
      rows: [chatRowFixture({ chat_id: 'new-chat', rescue_id: APP_RESCUE_ID })],
    });
    mocks.clientScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [{ participant_id: 'usr-root' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolScript.push({ rows: [] });

    const res = await openChat(mocks.deps, root, { ...BASE_OPEN, otherUserId: 'usr-anyone' });
    expect(res.created).toBe(true);
    expect(stubs.listStaffMembers).not.toHaveBeenCalled();
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
    // ensureChatWritable → active chat
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ status: 'active', deleted_at: null }] });
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

  it('rejects a sender deleting their message in a closed (archived) chat', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [messageRowFixture({ sender_id: 'usr-adopter' })],
    });
    // ensureChatWritable → archived chat
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ status: 'archived', deleted_at: null }],
    });

    await expect(
      deleteMessage(mocks.deps, ADOPTER_PRINCIPAL, { messageId: 'msg-1' })
    ).rejects.toMatchObject({ code: 'FAILED_PRECONDITION' });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('lets a delete:any moderator delete a message in a closed chat', async () => {
    const moderator: Principal = {
      userId: 'usr-mod' as UserId,
      roles: ['moderator'],
      permissions: ['chat.message.delete:any' as Permission],
    };
    // existing row → owned by someone else, not yet deleted
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [messageRowFixture({ sender_id: 'usr-adopter' })],
    });
    // No ensureChatWritable lookup happens for delete:any — straight to tx.
    mocks.clientScript.push({ rows: [messageRowFixture({ deleted_at: new Date() })] });
    mocks.clientScript.push({ rows: [{ participant_id: 'usr-adopter' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // reactions

    const res = await deleteMessage(mocks.deps, moderator, { messageId: 'msg-1' });
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

  it('returns NOT_FOUND when the chat row is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND (no enumeration) when a non-privileged, non-participant caller tries to delete', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [chatRowFixture()] }); // chat exists
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // not a participant
    await expect(
      deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // ADS-923: an adopter participant must not be able to erase the whole
  // chat, even though they hold chats.read and are a genuine participant.
  it('rejects an adopter participant with PERMISSION_DENIED (cannot erase shared evidence)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [chatRowFixture()] }); // chat exists
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ chat_participant_id: 'p-1' }] }); // is a participant
    await expect(
      deleteChat(mocks.deps, ADOPTER_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('rejects rescue staff from a different rescue than the chat (NOT_FOUND, non-participant)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [chatRowFixture()] }); // chat exists
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // not a participant either
    await expect(
      deleteChat(mocks.deps, OTHER_RESCUE_STAFF_PRINCIPAL, { chatId: 'chat-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is idempotent on an already-deleted chat (no write, no publish)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ ...chatRowFixture(), deleted_at: new Date('2026-06-05T12:00:00Z') }],
    });
    // chatRowToProto helpers
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await deleteChat(mocks.deps, MODERATOR_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.chat?.chatId).toBe('chat-1');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('rescue staff of the chat’s own rescue can soft-delete and publish chat.deleted', async () => {
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

    const res = await deleteChat(mocks.deps, RESCUE_STAFF_PRINCIPAL, {
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

  it('a moderator can soft-delete a chat they are not a participant of', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ ...chatRowFixture(), deleted_at: null }],
    });
    mocks.clientScript.push({ rows: [chatRowFixture()] });
    mocks.clientScript.push({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ participant_id: 'usr-adopter' }, { participant_id: 'usr-rescue' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await deleteChat(mocks.deps, MODERATOR_PRINCIPAL, { chatId: 'chat-1' });
    expect(res.chat?.chatId).toBe('chat-1');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
  });
});
