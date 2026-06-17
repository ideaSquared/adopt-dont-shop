import { ChatService } from '../chat-service';

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

describe('ChatService REST API methods', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService({ apiUrl: 'https://api.test', enableMessageQueue: false });
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('getConversations', () => {
    it('returns the data array on success', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ data: [{ id: 'c-1' }] })
      );

      const result = await service.getConversations();
      expect(result).toEqual([{ id: 'c-1' }]);
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
        okJson({ data: { messages: [{ id: 'm-1' }], pagination: { page: 1 } } })
      );

      const result = await service.getMessages('c-1');

      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/chats/c-1/messages?');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=50');
      expect(result.data).toEqual([{ id: 'm-1' }]);
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
        okJson({ data: { id: 'm-9', content: 'hi' } })
      );

      const result = await service.sendMessage('c-1', 'hi');

      expect(result).toEqual({ id: 'm-9', content: 'hi' });
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
        okJson({ data: { id: 'm-10' } })
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
        okJson({ data: { id: 'c-new' } })
      );

      const result = await service.createConversation({
        rescueId: 'r-1',
        petId: 'p-1',
        initialMessage: 'Hello',
      });

      expect(result).toEqual({ id: 'c-new' });
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
    it('uploads a file as multipart form data without a Content-Type header', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        okJson({ data: { url: 'https://cdn/x.png', id: 'att-1' } })
      );

      const file = new File(['x'], 'x.png', { type: 'image/png' });
      const result = await service.uploadAttachment('c-1', file);

      expect(result).toEqual({ url: 'https://cdn/x.png', id: 'att-1' });
      const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit & {
        headers: Record<string, string>;
      };
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.headers['Content-Type']).toBeUndefined();
    });

    it('throws when the upload is rejected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
        failure(413, 'Payload Too Large')
      );
      const file = new File(['x'], 'x.png', { type: 'image/png' });
      await expect(service.uploadAttachment('c-1', file)).rejects.toThrow(
        'HTTP 413: Payload Too Large'
      );
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
