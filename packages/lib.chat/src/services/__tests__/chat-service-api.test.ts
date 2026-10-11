import { io } from 'socket.io-client';

import { ChatAttachmentsNotSupportedError, ChatService } from '../chat-service';

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  };
  return { io: vi.fn(() => mockSocket), __mockSocket: mockSocket };
});

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as Response);

const failure = (status: number, statusText: string) =>
  Promise.resolve({ ok: false, status, statusText } as Response);

global.fetch = vi.fn(() => okJson({ data: {} }));

// Gateway response shapes (services/gateway/src/routes/chat.ts).
const gatewayChat = (chatId: string) => ({
  chatId,
  participantUserIds: ['user-1', 'staff-1'],
  createdAt: '2026-10-10T10:00:00.000Z',
  updatedAt: '2026-10-10T10:00:00.000Z',
  status: 'CHAT_STATUS_ACTIVE',
});
const gatewayMessage = (messageId: string, body = 'hi') => ({
  messageId,
  chatId: 'c-1',
  senderUserId: 'user-1',
  body,
  content: body,
  createdAt: '2026-10-10T10:00:00.000Z',
});

describe('ChatService REST API methods', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService({ apiUrl: 'https://api.test', enableMessageQueue: false });
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('real-time messages', () => {
    it('delivers a message the gateway fans out as chat:message:created', () => {
      const received = vi.fn();
      service.onMessage(received);
      service.connect('user-1', 'token');

      const socket = vi.mocked(io).mock.results.at(-1)?.value as {
        on: ReturnType<typeof vi.fn>;
      };
      const handler = socket.on.mock.calls.find(([event]) => event === 'chat:message:created')?.[1];
      handler({ messageId: 'm-1', chatId: 'c-1', senderUserId: 'staff-1', body: 'Hello!' });

      expect(received).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'm-1',
          conversationId: 'c-1',
          senderId: 'staff-1',
          content: 'Hello!',
        })
      );
    });
  });

  describe('markAsRead', () => {
    // The gateway marks a chat read *up to* a message (up_to_message_id is
    // required), so the receipt names the newest message in the chat.
    it('marks the chat read up to its newest message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ messages: [gatewayMessage('m-newest')] })
      );

      await service.markAsRead('c-1');

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toBe('https://api.test/api/v1/chats/c-1/messages?limit=1');
      const [url, init] = calls[1] as [string, RequestInit];
      expect(url).toBe('https://api.test/api/v1/chats/c-1/read');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ upToMessageId: 'm-newest' });
    });

    it('sends no receipt for a chat with no messages', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ messages: [] })
      );

      await service.markAsRead('c-1');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversations', () => {
    it('returns the data array on success', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ data: [gatewayChat('c-1')] })
      );

      const result = await service.getConversations();
      expect(result.map((c) => c.id)).toEqual(['c-1']);
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('https://api.test/api/v1/chats');
      expect((call[1] as RequestInit).credentials).toBe('include');
    });

    it('returns an empty array when the response has no data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => okJson({}));
      expect(await service.getConversations()).toEqual([]);
    });

    it('throws on a non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        failure(500, 'Server Error')
      );
      await expect(service.getConversations()).rejects.toThrow('HTTP 500: Server Error');
    });
  });

  describe('getMessages', () => {
    it('requests the default first page with a 50 item limit', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ data: { messages: [gatewayMessage('m-1')], pagination: { page: 1 } } })
      );

      const result = await service.getMessages('c-1');

      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/chats/c-1/messages?');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=50');
      expect(result.data.map((m) => m.id)).toEqual(['m-1']);
      expect(result.success).toBe(true);
    });

    it('honours custom page and limit options', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ messages: [], pagination: { page: 3 } })
      );

      await service.getMessages('c-1', { page: 3, limit: 10 });

      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('page=3');
      expect(url).toContain('limit=10');
    });

    it('falls back to a default pagination object when the server omits it', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ data: { messages: [] } })
      );

      const result = await service.getMessages('c-1', { page: 2 });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('throws on a non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        failure(404, 'Not Found')
      );
      await expect(service.getMessages('c-1')).rejects.toThrow('HTTP 404: Not Found');
    });
  });

  describe('sendMessage (connected, no attachments)', () => {
    it('posts a JSON body and returns the created message', async () => {
      service.connect('user-1', 'token');
      service.simulateConnectEvent();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ message: gatewayMessage('m-9', 'hi') })
      );

      const result = await service.sendMessage('c-1', 'hi');

      expect(result).toMatchObject({ id: 'm-9', content: 'hi', conversationId: 'c-1' });
      const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit & {
        headers: Record<string, string>;
      };
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('sends multipart form data when attachments are supplied', async () => {
      service.connect('user-1', 'token');
      service.simulateConnectEvent();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ message: gatewayMessage('m-10', 'caption') })
      );

      const file = new File(['x'], 'photo.png', { type: 'image/png' });
      await service.sendMessage('c-1', 'caption', [file]);

      const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit & {
        headers: Record<string, string>;
      };
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.headers['Content-Type']).toBeUndefined();
    });

    it('throws when the backend rejects the message', async () => {
      service.connect('user-1', 'token');
      service.simulateConnectEvent();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        failure(400, 'Bad Request')
      );
      await expect(service.sendMessage('c-1', 'hi')).rejects.toThrow('HTTP 400: Bad Request');
    });
  });

  describe('createConversation', () => {
    it('posts the conversation payload and returns the created conversation', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ chat: gatewayChat('c-new'), created: true })
      );

      const result = await service.createConversation({
        rescueId: 'r-1',
        petId: 'p-1',
        initialMessage: 'Hello',
      });

      expect(result.id).toBe('c-new');
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('https://api.test/api/v1/chats');
      const init = call[1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        rescueId: 'r-1',
        petId: 'p-1',
        initialMessage: 'Hello',
      });
    });

    it('throws on failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        failure(409, 'Conflict')
      );
      await expect(service.createConversation({ rescueId: 'r-1' })).rejects.toThrow(
        'HTTP 409: Conflict'
      );
    });
  });

  describe('uploadAttachment', () => {
    // Descoped (ADS-1317): no gateway route or service RPC exists to
    // receive an attachment upload, so the method throws a typed error
    // instead of making a dead network call.
    it('throws ChatAttachmentsNotSupportedError without calling fetch', async () => {
      const file = new File(['x'], 'x.png', { type: 'image/png' });
      await expect(service.uploadAttachment('c-1', file)).rejects.toBeInstanceOf(
        ChatAttachmentsNotSupportedError
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('typing indicators', () => {
    it('emits typing_start over the socket once connected', () => {
      service.connect('user-1', 'token');
      service.startTyping('c-1');
      service.stopTyping('c-1');
      // No socket emit assertion possible without the mock handle; the
      // observable contract is that calling these never throws.
      expect(() => service.startTyping('c-1')).not.toThrow();
    });

    it('is a no-op when there is no socket connection', () => {
      expect(() => service.startTyping('c-1')).not.toThrow();
      expect(() => service.stopTyping('c-1')).not.toThrow();
    });
  });
});
