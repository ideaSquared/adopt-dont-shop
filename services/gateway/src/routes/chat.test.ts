import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ListChatsRequest,
  ListMessagesRequest,
  MarkReadRequest,
  OpenChatRequest,
  ReactRequest,
  SearchChatsRequest,
  SendMessageRequest,
} from '@adopt-dont-shop/proto';

import type { ChatClient } from '../grpc-clients/chat-client.js';

import { registerChatRoutes } from './chat.js';

// --- Fixtures -------------------------------------------------------

const CHAT_FIXTURE = {
  chatId: 'chat-1',
  applicationId: 'app-1',
  participantUserIds: ['usr-1', 'usr-2'],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const MESSAGE_FIXTURE = {
  messageId: 'msg-1',
  chatId: 'chat-1',
  senderUserId: 'usr-1',
  body: 'Hello',
  reactions: [],
  createdAt: '2026-06-01T00:01:00Z',
};

function makeClient(): ChatClient & {
  openChatMock: ReturnType<typeof vi.fn>;
  sendMessageMock: ReturnType<typeof vi.fn>;
  listMessagesMock: ReturnType<typeof vi.fn>;
  listChatsMock: ReturnType<typeof vi.fn>;
  markReadMock: ReturnType<typeof vi.fn>;
  reactMock: ReturnType<typeof vi.fn>;
  searchChatsMock: ReturnType<typeof vi.fn>;
  getChatUnreadCountMock: ReturnType<typeof vi.fn>;
} {
  const openChatMock = vi.fn();
  const sendMessageMock = vi.fn();
  const listMessagesMock = vi.fn();
  const listChatsMock = vi.fn();
  const markReadMock = vi.fn();
  const reactMock = vi.fn();
  const searchChatsMock = vi.fn();
  const getChatUnreadCountMock = vi.fn();
  return {
    openChat: openChatMock,
    sendMessage: sendMessageMock,
    listMessages: listMessagesMock,
    listChats: listChatsMock,
    markRead: markReadMock,
    react: reactMock,
    searchChats: searchChatsMock,
    getChatUnreadCount: getChatUnreadCountMock,
    close: vi.fn(),
    openChatMock,
    sendMessageMock,
    listMessagesMock,
    listChatsMock,
    markReadMock,
    reactMock,
    searchChatsMock,
    getChatUnreadCountMock,
  };
}

async function buildApp(client: ChatClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerChatRoutes(app, { client });
  return app;
}

// --- GET /api/v1/chats ----------------------------------------------

describe('GET /api/v1/chats — list', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards principal headers + passes limit and cursor through', async () => {
    client.listChatsMock.mockResolvedValueOnce({ chats: [CHAT_FIXTURE] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chats?limit=10&cursor=abc&unreadOnly=true',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
      },
    });

    expect(res.statusCode).toBe(200);
    const [req, metadata] = client.listChatsMock.mock.calls[0] as [ListChatsRequest, Metadata];
    expect(req.limit).toBe(10);
    expect(req.cursor).toBe('abc');
    expect(req.unreadOnly).toBe(true);
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
  });

  it('accepts snake_case unread_only too', async () => {
    client.listChatsMock.mockResolvedValueOnce({ chats: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/chats?unread_only=true',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req] = client.listChatsMock.mock.calls[0] as [ListChatsRequest, Metadata];
    expect(req.unreadOnly).toBe(true);
  });
});

// --- POST /api/v1/chats ---------------------------------------------

describe('POST /api/v1/chats — open', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 when the chat is freshly created', async () => {
    client.openChatMock.mockResolvedValueOnce({ chat: CHAT_FIXTURE, created: true });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { applicationId: 'app-1', otherUserId: 'usr-2' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('returns 200 when an idempotent open returns the existing chat', async () => {
    client.openChatMock.mockResolvedValueOnce({ chat: CHAT_FIXTURE, created: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { applicationId: 'app-1', otherUserId: 'usr-2' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts snake_case body fields', async () => {
    client.openChatMock.mockResolvedValueOnce({ chat: CHAT_FIXTURE, created: true });
    await app.inject({
      method: 'POST',
      url: '/api/v1/chats',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { application_id: 'app-1', other_user_id: 'usr-2' },
    });
    const [req] = client.openChatMock.mock.calls[0] as [OpenChatRequest, Metadata];
    expect(req.applicationId).toBe('app-1');
    expect(req.otherUserId).toBe('usr-2');
  });

  it('maps gRPC PERMISSION_DENIED to HTTP 403', async () => {
    client.openChatMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'forbidden',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { applicationId: 'app-1', otherUserId: 'usr-2' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'forbidden' });
  });
});

// --- POST /api/v1/chats/:id/messages --------------------------------

describe('POST /api/v1/chats/:chatId/messages — send', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with the new message', async () => {
    client.sendMessageMock.mockResolvedValueOnce({ message: MESSAGE_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/chat-1/messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { body: 'Hello' },
    });
    expect(res.statusCode).toBe(201);
    const [req] = client.sendMessageMock.mock.calls[0] as [SendMessageRequest, Metadata];
    expect(req.chatId).toBe('chat-1');
    expect(req.body).toBe('Hello');
  });

  it('accepts the monolith-named `content` field', async () => {
    client.sendMessageMock.mockResolvedValueOnce({ message: MESSAGE_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/chats/chat-1/messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { content: 'Hello' },
    });
    const [req] = client.sendMessageMock.mock.calls[0] as [SendMessageRequest, Metadata];
    expect(req.body).toBe('Hello');
  });
});

// --- GET /api/v1/chats/:id/messages ---------------------------------

describe('GET /api/v1/chats/:chatId/messages — listMessages', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes pagination params through', async () => {
    client.listMessagesMock.mockResolvedValueOnce({ messages: [MESSAGE_FIXTURE] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/chats/chat-1/messages?limit=25&cursor=xyz',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req] = client.listMessagesMock.mock.calls[0] as [ListMessagesRequest, Metadata];
    expect(req.chatId).toBe('chat-1');
    expect(req.limit).toBe(25);
    expect(req.cursor).toBe('xyz');
  });
});

// --- POST /api/v1/chats/:id/read ------------------------------------

describe('POST /api/v1/chats/:chatId/read — markRead', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards upToMessageId to the gRPC request', async () => {
    client.markReadMock.mockResolvedValueOnce({ upToMessageId: 'msg-1' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/chat-1/read',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { upToMessageId: 'msg-1' },
    });
    expect(res.statusCode).toBe(200);
    const [req] = client.markReadMock.mock.calls[0] as [MarkReadRequest, Metadata];
    expect(req.chatId).toBe('chat-1');
    expect(req.upToMessageId).toBe('msg-1');
  });

  it('accepts snake_case up_to_message_id', async () => {
    client.markReadMock.mockResolvedValueOnce({ upToMessageId: 'msg-1' });
    await app.inject({
      method: 'POST',
      url: '/api/v1/chats/chat-1/read',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { up_to_message_id: 'msg-1' },
    });
    const [req] = client.markReadMock.mock.calls[0] as [MarkReadRequest, Metadata];
    expect(req.upToMessageId).toBe('msg-1');
  });

  it('maps NOT_FOUND to HTTP 404', async () => {
    client.markReadMock.mockRejectedValueOnce({ code: status.NOT_FOUND, details: 'not found' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/chat-1/read',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { upToMessageId: 'gone' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// --- POST /api/v1/messages/:id/reactions -----------------------------

describe('POST /api/v1/messages/:messageId/reactions — react', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('adds a reaction', async () => {
    client.reactMock.mockResolvedValueOnce({ message: MESSAGE_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/messages/msg-1/reactions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { emoji: '👍' },
    });
    const [req] = client.reactMock.mock.calls[0] as [ReactRequest, Metadata];
    expect(req.messageId).toBe('msg-1');
    expect(req.emoji).toBe('👍');
    expect(req.remove).toBe(false);
  });

  it('removes a reaction when remove=true', async () => {
    client.reactMock.mockResolvedValueOnce({ message: MESSAGE_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/messages/msg-1/reactions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { emoji: '👍', remove: true },
    });
    const [req] = client.reactMock.mock.calls[0] as [ReactRequest, Metadata];
    expect(req.remove).toBe(true);
  });
});

// --- /api/v1/conversations alias ------------------------------------
//
// The monolith mounts the same chat routes at /api/v1/chats AND
// /api/v1/conversations. The SPA's lib.chat client uses both paths
// across views; the gateway must accept either.

describe('/api/v1/conversations — monolith alias', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/conversations routes to listChats', async () => {
    client.listChatsMock.mockResolvedValueOnce({ chats: [CHAT_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.listChatsMock).toHaveBeenCalledTimes(1);
  });

  it('POST /api/v1/conversations routes to openChat', async () => {
    client.openChatMock.mockResolvedValueOnce({ chat: CHAT_FIXTURE, created: true });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { applicationId: 'app-1', otherUserId: 'usr-2' },
    });
    expect(res.statusCode).toBe(201);
    expect(client.openChatMock).toHaveBeenCalledTimes(1);
  });

  it('GET /api/v1/conversations/:chatId/messages routes to listMessages', async () => {
    client.listMessagesMock.mockResolvedValueOnce({ messages: [MESSAGE_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations/chat-1/messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.listMessagesMock).toHaveBeenCalledTimes(1);
  });

  it('POST /api/v1/conversations/:chatId/messages routes to sendMessage', async () => {
    client.sendMessageMock.mockResolvedValueOnce({ message: MESSAGE_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/chat-1/messages',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { body: 'Hello via alias' },
    });
    expect(res.statusCode).toBe(201);
    expect(client.sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it('POST /api/v1/conversations/:chatId/read routes to markRead', async () => {
    client.markReadMock.mockResolvedValueOnce({ upToMessageId: 'msg-1' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/chat-1/read',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { upToMessageId: 'msg-1' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.markReadMock).toHaveBeenCalledTimes(1);
  });
});

// --- GET /api/v1/chats/search ---------------------------------------

describe('GET /api/v1/chats/search', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards query, page, limit, rescue_id to SearchChats', async () => {
    client.searchChatsMock.mockResolvedValueOnce({ hits: [], page: 2, limit: 10, total: 0 });

    await app.inject({
      method: 'GET',
      url: '/api/v1/chats/search?query=adoption&page=2&limit=10&rescueId=rsc-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = client.searchChatsMock.mock.calls[0] as [SearchChatsRequest, Metadata];
    expect(grpcReq.query).toBe('adoption');
    expect(grpcReq.page).toBe(2);
    expect(grpcReq.limit).toBe(10);
    expect(grpcReq.rescueId).toBe('rsc-1');
  });

  it('also accepts q + rescue_id snake_case aliases', async () => {
    client.searchChatsMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 20, total: 0 });
    await app.inject({
      method: 'GET',
      url: '/api/v1/chats/search?q=adoption&rescue_id=rsc-2',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [grpcReq] = client.searchChatsMock.mock.calls[0] as [SearchChatsRequest, Metadata];
    expect(grpcReq.query).toBe('adoption');
    expect(grpcReq.rescueId).toBe('rsc-2');
  });

  it('returns the monolith-compatible { chats, pagination } envelope', async () => {
    client.searchChatsMock.mockResolvedValueOnce({
      hits: [{ chat: CHAT_FIXTURE, match: MESSAGE_FIXTURE }],
      page: 1,
      limit: 20,
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chats/search?query=hello',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        chats: Array<{ chatId: string; matched_message: { messageId: string } | null }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.chats).toHaveLength(1);
    expect(body.data.chats[0].chatId).toBe('chat-1');
    expect(body.data.chats[0].matched_message?.messageId).toBe('msg-1');
    expect(body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400', async () => {
    client.searchChatsMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'query is required',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chats/search?query=',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('also reachable via /api/v1/conversations/search alias', async () => {
    client.searchChatsMock.mockResolvedValueOnce({ hits: [], page: 1, limit: 20, total: 0 });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations/search?query=adoption',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.searchChatsMock).toHaveBeenCalledTimes(1);
  });
});

// --- GET /api/v1/chats/:chatId/unread-count -------------------------

describe('GET /api/v1/chats/:chatId/unread-count', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns success envelope with unread count', async () => {
    client.getChatUnreadCountMock.mockResolvedValueOnce({ unreadCount: 7 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chats/chat-1/unread-count',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: { unreadCount: 7 } });
    const [grpcReq] = client.getChatUnreadCountMock.mock.calls[0] as [{ chatId: string }, Metadata];
    expect(grpcReq.chatId).toBe('chat-1');
  });

  it('maps NOT_FOUND → 404', async () => {
    client.getChatUnreadCountMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'gone',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chats/missing/unread-count',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('reachable via /api/v1/conversations alias', async () => {
    client.getChatUnreadCountMock.mockResolvedValueOnce({ unreadCount: 0 });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations/chat-1/unread-count',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.getChatUnreadCountMock).toHaveBeenCalledTimes(1);
  });
});
