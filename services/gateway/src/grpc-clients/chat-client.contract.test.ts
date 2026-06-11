// Contract tests for the gateway chat-client.
//
// Boots a real @grpc/grpc-js Server with ChatV1.ChatServiceService and
// verifies:
//   1. Happy-path read: listChats() — response round-trips.
//   2. Happy-path write: openChat() — request fields arrive and
//      response round-trips.
//   3. Error contract: NOT_FOUND surfaces with .code intact.

import {
  Metadata,
  Server,
  ServerCredentials,
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  ChatV1,
  type ListChatsRequest,
  type ListChatsResponse,
  type OpenChatRequest,
  type OpenChatResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createChatClient } from './chat-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<unknown>) =>
  cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null);

const makeHandlers = (overrides: Partial<ChatV1.ChatServiceServer>): ChatV1.ChatServiceServer => ({
  openChat: unimplemented,
  sendMessage: unimplemented,
  listMessages: unimplemented,
  listChats: unimplemented,
  markRead: unimplemented,
  react: unimplemented,
  searchChats: unimplemented,
  getChatUnreadCount: unimplemented,
  deleteMessage: unimplemented,
  getChat: unimplemented,
  deleteChat: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('chat-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: ChatV1.ChatServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(ChatV1.ChatServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: listChats ───────────────────────────────────────────

  it('listChats — request arrives and typed response round-trips', async () => {
    const want: ListChatsResponse = {
      chats: [
        {
          chatId: 'chat-001',
          applicationId: 'app-1',
          participantUserIds: ['user-a', 'user-b'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      nextCursor: '',
    };

    let handlerCalled = false;

    port = await startServer(
      makeHandlers({
        listChats: (
          _call: ServerUnaryCall<ListChatsRequest, ListChatsResponse>,
          cb: sendUnaryData<ListChatsResponse>
        ) => {
          handlerCalled = true;
          cb(null, want);
        },
      })
    );

    const client = createChatClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.listChats({ limit: 10 }, new Metadata());
      expect(handlerCalled).toBe(true);
      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].chatId).toBe('chat-001');
    } finally {
      client.close();
    }
  });

  // ── 2. Write: openChat ───────────────────────────────────────────

  it('openChat — request fields arrive and response round-trips', async () => {
    const want: OpenChatResponse = {
      chat: {
        chatId: 'chat-new',
        applicationId: 'app-2',
        participantUserIds: ['user-a', 'user-b'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      created: true,
    };

    let capturedApplicationId = '';
    let capturedOtherUserId = '';

    port = await startServer(
      makeHandlers({
        openChat: (
          call: ServerUnaryCall<OpenChatRequest, OpenChatResponse>,
          cb: sendUnaryData<OpenChatResponse>
        ) => {
          capturedApplicationId = call.request.applicationId;
          capturedOtherUserId = call.request.otherUserId;
          cb(null, want);
        },
      })
    );

    const client = createChatClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.openChat(
        { applicationId: 'app-2', otherUserId: 'user-b' },
        new Metadata()
      );
      expect(capturedApplicationId).toBe('app-2');
      expect(capturedOtherUserId).toBe('user-b');
      expect(result.chat?.chatId).toBe('chat-new');
      expect(result.created).toBe(true);
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('openChat — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        openChat: (
          _call: ServerUnaryCall<OpenChatRequest, OpenChatResponse>,
          cb: sendUnaryData<OpenChatResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'application not found'), null);
        },
      })
    );

    const client = createChatClient({ address: `127.0.0.1:${port}` });
    try {
      await client.openChat({ applicationId: 'missing', otherUserId: 'user-b' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });
});
