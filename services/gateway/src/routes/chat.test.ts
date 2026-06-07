import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ListChatsRequest,
  ListMessagesRequest,
  MarkReadRequest,
  OpenChatRequest,
  ReactRequest,
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
} {
  const openChatMock = vi.fn();
  const sendMessageMock = vi.fn();
  const listMessagesMock = vi.fn();
  const listChatsMock = vi.fn();
  const markReadMock = vi.fn();
  const reactMock = vi.fn();
  return {
    openChat: openChatMock,
    sendMessage: sendMessageMock,
    listMessages: listMessagesMock,
    listChats: listChatsMock,
    markRead: markReadMock,
    react: reactMock,
    close: vi.fn(),
    openChatMock,
    sendMessageMock,
    listMessagesMock,
    listChatsMock,
    markReadMock,
    reactMock,
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
