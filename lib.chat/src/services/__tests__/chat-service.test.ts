import { ChatService } from '../chat-service';
import { ConnectionStatus } from '../../types';

// Mock socket.io-client
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

  return {
    io: vi.fn(() => mockSocket),
    __mockSocket: mockSocket,
  };
});

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: {} }),
    status: 200,
    statusText: 'OK',
  } as Response)
);

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService({
      debug: false,
    });
  });

  afterEach(() => {
    service.clearCache();
    service.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should initialize with custom config', () => {
      const customService = new ChatService({
        debug: true,
        apiUrl: 'https://test.example.com',
      });

      const config = customService.getConfig();
      expect(config.debug).toBe(true);
      expect(config.apiUrl).toBe('https://test.example.com');
    });

    it('should initialize with custom socket URL', () => {
      const customService = new ChatService({
        socketUrl: 'wss://socket.example.com',
      });

      const config = customService.getConfig();
      expect(config.socketUrl).toBe('wss://socket.example.com');
    });

    it('should initialize with reconnection config', () => {
      const customService = new ChatService({
        reconnection: {
          enabled: true,
          initialDelay: 500,
          maxDelay: 10000,
        },
      });

      const config = customService.getConfig();
      expect(config.reconnection?.enabled).toBe(true);
      expect(config.reconnection?.initialDelay).toBe(500);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      service.updateConfig({ debug: true });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
    });

    it('should return current configuration', () => {
      const config = service.getConfig();
      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('apiUrl');
      expect(config).toHaveProperty('debug');
    });
  });

  describe('cache management', () => {
    it('should clear cache without errors', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('Socket.IO connection - establishment and authentication', () => {
    it('should establish connection with authentication token', () => {
      const userId = 'user-123';
      const token = 'test-jwt-token';

      service.connect(userId, token);

      const status = service.getConnectionStatus();
      expect(status).toBeDefined();
    });

    it('should track connection status as connecting when connect is called', () => {
      const userId = 'user-123';
      const token = 'test-jwt-token';

      service.connect(userId, token);

      const status = service.getConnectionStatus();
      expect(['connecting', 'connected']).toContain(status);
    });

    it('should provide connection status getter', () => {
      const status = service.getConnectionStatus();
      expect(status).toBe('disconnected');
    });

    it('should allow subscribing to connection status changes', () => {
      return new Promise<void>((resolve) => {
        const statusCallback = vi.fn((status: ConnectionStatus) => {
          expect(['disconnected', 'connecting', 'connected']).toContain(status);
          resolve();
        });

        service.onConnectionStatusChange(statusCallback);
        service.connect('user-123', 'token');
      });
    });

    it('should disconnect cleanly', () => {
      service.connect('user-123', 'token');
      service.disconnect();

      const status = service.getConnectionStatus();
      expect(status).toBe('disconnected');
    });

    it('should handle connection errors gracefully', () => {
      const errorCallback = vi.fn((error: Error) => {
        expect(error).toBeDefined();
        expect(error.message).toBeTruthy();
      });

      service.onConnectionError(errorCallback);

      // Trigger an error manually
      service.simulateError(new Error('Test connection error'));

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should not attempt connection without authentication token', () => {
      expect(() => {
        service.connect('user-123', '');
      }).toThrow();
    });

    it('should not attempt connection without user ID', () => {
      expect(() => {
        service.connect('', 'token');
      }).toThrow();
    });

    it('should allow multiple connection status listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.onConnectionStatusChange(listener1);
      service.onConnectionStatusChange(listener2);

      service.connect('user-123', 'token');

      // Both listeners should be called
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove connection status listeners', () => {
      const listener = vi.fn();

      service.onConnectionStatusChange(listener);
      service.offConnectionStatusChange(listener);

      service.connect('user-123', 'token');

      // Listener should not be called after removal
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Socket.IO connection - reconnection with exponential backoff', () => {
    it('should automatically reconnect when connection is lost', () => {
      return new Promise<void>((resolve) => {
        const reconnectCallback = vi.fn(() => {
          expect(reconnectCallback).toHaveBeenCalled();
          resolve();
        });

        service.onConnectionStatusChange((status) => {
          if (status === 'reconnecting') {
            reconnectCallback();
          }
        });

        service.connect('user-123', 'token');
        // Simulate disconnect
        service.simulateDisconnect();
      });
    });

    it('should use exponential backoff for reconnection attempts', () => {
      const customService = new ChatService({
        reconnection: {
          enabled: true,
          initialDelay: 100,
          maxDelay: 5000,
          backoffMultiplier: 2,
          maxAttempts: 5,
        },
      });

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to capture delays
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0);
      }) as unknown as typeof setTimeout;

      customService.connect('user-123', 'token');
      customService.simulateDisconnect();

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;

      // Verify exponential backoff pattern
      if (delays.length >= 2) {
        expect(delays[1]).toBeGreaterThan(delays[0]);
      }
    });

    it('should respect maximum reconnection attempts', () => {
      const customService = new ChatService({
        reconnection: {
          enabled: true,
          maxAttempts: 3,
        },
      });

      let reconnectCount = 0;
      customService.onConnectionStatusChange((status) => {
        if (status === 'reconnecting') {
          reconnectCount++;
        }
      });

      customService.connect('user-123', 'token');

      // Simulate multiple disconnects
      for (let i = 0; i < 5; i++) {
        customService.simulateDisconnect();
      }

      // Should not exceed max attempts
      expect(reconnectCount).toBeLessThanOrEqual(3);
    });

    it('should reset reconnection attempts on successful connection', () => {
      service.connect('user-123', 'token');
      service.simulateDisconnect();
      service.simulateReconnect();

      const attempts = service.getReconnectionAttempts();
      expect(attempts).toBe(0);
    });

    it('should allow disabling automatic reconnection', () => {
      const customService = new ChatService({
        reconnection: {
          enabled: false,
        },
      });

      const statusCallback = vi.fn();
      customService.onConnectionStatusChange(statusCallback);

      customService.connect('user-123', 'token');
      customService.simulateDisconnect();

      // Should not attempt reconnection
      const reconnectingCalls = statusCallback.mock.calls.filter(
        (call) => call[0] === 'reconnecting'
      );
      expect(reconnectingCalls.length).toBe(0);
    });

    it('should respect maximum reconnection delay', () => {
      const customService = new ChatService({
        reconnection: {
          enabled: true,
          initialDelay: 100,
          maxDelay: 1000,
          backoffMultiplier: 10,
        },
      });

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0);
      }) as unknown as typeof setTimeout;

      customService.connect('user-123', 'token');

      // Simulate multiple disconnects
      for (let i = 0; i < 3; i++) {
        customService.simulateDisconnect();
      }

      global.setTimeout = originalSetTimeout;

      // All delays should be <= maxDelay
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Socket.IO connection - message queuing during disconnection', () => {
    it('should queue messages when disconnected', () => {
      const message = {
        conversationId: 'conv-123',
        content: 'Test message',
      };

      service.sendMessage(message.conversationId, message.content);

      const queuedMessages = service.getQueuedMessages();
      expect(queuedMessages.length).toBeGreaterThan(0);
      expect(queuedMessages[0].content).toBe(message.content);
    });

    it('should send queued messages when connection is restored', async () => {
      const message1 = 'Message 1';
      const message2 = 'Message 2';

      // Queue messages while disconnected
      await service.sendMessage('conv-123', message1);
      await service.sendMessage('conv-123', message2);

      const queuedBeforeConnect = service.getQueuedMessages();
      expect(queuedBeforeConnect.length).toBe(2);

      // Connect and simulate successful connection
      service.connect('user-123', 'token');
      service.simulateConnectEvent();

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const queuedAfterConnect = service.getQueuedMessages();
      expect(queuedAfterConnect.length).toBe(0);
    });

    it('should respect maximum queue size', () => {
      const customService = new ChatService({
        enableMessageQueue: true,
        maxQueueSize: 3,
      });

      // Try to queue 5 messages
      for (let i = 0; i < 5; i++) {
        customService.sendMessage('conv-123', `Message ${i}`);
      }

      const queuedMessages = customService.getQueuedMessages();
      expect(queuedMessages.length).toBeLessThanOrEqual(3);
    });

    it('should track retry count for queued messages', () => {
      service.sendMessage('conv-123', 'Test message');

      const queuedMessages = service.getQueuedMessages();
      expect(queuedMessages[0].retryCount).toBe(0);
    });

    it('should allow clearing message queue', () => {
      service.sendMessage('conv-123', 'Message 1');
      service.sendMessage('conv-123', 'Message 2');

      service.clearMessageQueue();

      const queuedMessages = service.getQueuedMessages();
      expect(queuedMessages.length).toBe(0);
    });

    it('should not queue messages when message queuing is disabled', () => {
      const customService = new ChatService({
        enableMessageQueue: false,
      });

      customService.sendMessage('conv-123', 'Test message');

      const queuedMessages = customService.getQueuedMessages();
      expect(queuedMessages.length).toBe(0);
    });

    it('should preserve message order in queue', () => {
      service.sendMessage('conv-123', 'First');
      service.sendMessage('conv-123', 'Second');
      service.sendMessage('conv-123', 'Third');

      const queuedMessages = service.getQueuedMessages();
      expect(queuedMessages[0].content).toBe('First');
      expect(queuedMessages[1].content).toBe('Second');
      expect(queuedMessages[2].content).toBe('Third');
    });
  });

  describe('Socket.IO connection - real-time event handlers', () => {
    it('should receive new messages in real-time', () => {
      return new Promise<void>((resolve) => {
        service.connect('user-123', 'token');

        service.onMessage((message) => {
          expect(message).toBeDefined();
          expect(message.content).toBeTruthy();
          resolve();
        });

        // Simulate receiving a message
        service.simulateIncomingMessage({
          id: 'msg-123',
          conversationId: 'conv-123',
          senderId: 'user-456',
          senderName: 'Test User',
          content: 'Hello!',
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'sent',
        });
      });
    });

    it('should receive typing indicators in real-time', () => {
      return new Promise<void>((resolve) => {
        service.connect('user-123', 'token');

        service.onTyping((typing) => {
          expect(typing).toBeDefined();
          expect(typing.userId).toBeTruthy();
          resolve();
        });

        service.simulateTypingIndicator({
          conversationId: 'conv-123',
          userId: 'user-456',
          userName: 'Test User',
          startedAt: new Date().toISOString(),
        });
      });
    });

    it('should handle connection events', () => {
      return new Promise<void>((resolve) => {
        service.onConnectionStatusChange((status) => {
          if (status === 'connected') {
            resolve();
          }
        });

        service.connect('user-123', 'token');
        service.simulateConnectEvent();
      });
    });

    it('should handle disconnection events', () => {
      return new Promise<void>((resolve) => {
        service.connect('user-123', 'token');

        service.onConnectionStatusChange((status) => {
          if (status === 'disconnected') {
            resolve();
          }
        });

        service.simulateDisconnect();
      });
    });

    it('should handle error events', () => {
      return new Promise<void>((resolve) => {
        service.onConnectionError((error) => {
          expect(error).toBeDefined();
          expect(error.message).toBe('Connection failed');
          resolve();
        });

        service.simulateError(new Error('Connection failed'));
      });
    });

    it('should allow removing event listeners', () => {
      const messageCallback = vi.fn();

      service.onMessage(messageCallback);
      service.off('message');

      service.simulateIncomingMessage({
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'Test User',
        content: 'Hello!',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sent',
      });

      expect(messageCallback).not.toHaveBeenCalled();
    });

    it('should receive reaction updates in real-time', () => {
      return new Promise<void>((resolve) => {
        service.connect('user-123', 'token');

        service.onReactionUpdate((event) => {
          expect(event).toBeDefined();
          expect(event.messageId).toBe('msg-123');
          expect(event.emoji).toBe('\u{1F44D}');
          expect(event.userId).toBe('user-456');
          expect(event.reactions).toHaveLength(1);
          resolve();
        });

        service.simulateReactionUpdate({
          messageId: 'msg-123',
          emoji: '\u{1F44D}',
          userId: 'user-456',
          reactions: [
            { userId: 'user-456', emoji: '\u{1F44D}', createdAt: new Date().toISOString() },
          ],
        });
      });
    });

    it('should receive read status updates in real-time', () => {
      return new Promise<void>((resolve) => {
        service.connect('user-123', 'token');

        service.onReadStatusUpdate((event) => {
          expect(event).toBeDefined();
          expect(event.chatId).toBe('conv-123');
          expect(event.userId).toBe('user-456');
          expect(event.timestamp).toBeTruthy();
          resolve();
        });

        service.simulateReadStatusUpdate({
          chatId: 'conv-123',
          userId: 'user-456',
          timestamp: new Date().toISOString(),
        });
      });
    });

    it('should allow removing reaction listeners', () => {
      const reactionCallback = vi.fn();

      service.onReactionUpdate(reactionCallback);
      service.off('reaction');

      service.simulateReactionUpdate({
        messageId: 'msg-123',
        emoji: '\u{1F44D}',
        userId: 'user-456',
        reactions: [],
      });

      expect(reactionCallback).not.toHaveBeenCalled();
    });

    it('should allow removing read status listeners', () => {
      const readStatusCallback = vi.fn();

      service.onReadStatusUpdate(readStatusCallback);
      service.off('readStatus');

      service.simulateReadStatusUpdate({
        chatId: 'conv-123',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
      });

      expect(readStatusCallback).not.toHaveBeenCalled();
    });
  });

  describe('message reactions', () => {
    it('should add a reaction to a message via API', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { success: true } }),
        status: 200,
        statusText: 'OK',
      } as Response);

      service.updateConfig({ apiUrl: 'http://localhost:5000' });

      await expect(service.addReaction('conv-123', 'msg-123', '\u{1F44D}')).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/chats/conv-123/messages/msg-123/reactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ emoji: '\u{1F44D}' }),
        })
      );
    });

    it('should remove a reaction from a message via API', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { success: true } }),
        status: 200,
        statusText: 'OK',
      } as Response);

      service.updateConfig({ apiUrl: 'http://localhost:5000' });

      await expect(
        service.removeReaction('conv-123', 'msg-123', '\u{1F44D}')
      ).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/chats/conv-123/messages/msg-123/reactions',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ emoji: '\u{1F44D}' }),
        })
      );
    });

    it('should throw error when adding reaction fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      service.updateConfig({ apiUrl: 'http://localhost:5000' });

      await expect(service.addReaction('conv-123', 'msg-123', '\u{1F44D}')).rejects.toThrow(
        'HTTP 403: Forbidden'
      );
    });

    it('should throw error when removing reaction fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      service.updateConfig({ apiUrl: 'http://localhost:5000' });

      await expect(service.removeReaction('conv-123', 'msg-123', '\u{1F44D}')).rejects.toThrow(
        'HTTP 404: Not Found'
      );
    });

    it('should notify multiple reaction listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.onReactionUpdate(listener1);
      service.onReactionUpdate(listener2);

      const event = {
        messageId: 'msg-123',
        emoji: '\u{2764}\u{FE0F}',
        userId: 'user-456',
        reactions: [
          { userId: 'user-456', emoji: '\u{2764}\u{FE0F}', createdAt: new Date().toISOString() },
        ],
      };

      service.simulateReactionUpdate(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });
  });

  describe('read receipt tracking', () => {
    it('should mark conversation as read via API', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        status: 200,
        statusText: 'OK',
      } as Response);

      service.updateConfig({ apiUrl: 'http://localhost:5000' });

      await expect(service.markAsRead('conv-123')).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/chats/conv-123/read',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should notify multiple read status listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.onReadStatusUpdate(listener1);
      service.onReadStatusUpdate(listener2);

      const event = {
        chatId: 'conv-123',
        userId: 'user-456',
        timestamp: new Date().toISOString(),
      };

      service.simulateReadStatusUpdate(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });
  });

  describe('CSRF + credentials for mutating requests', () => {
    const okJson = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ data: { id: 'msg-1' } }),
      } as Response);

    it('includes the x-csrf-token header and credentials on sendMessage', async () => {
      const csrfProvider = vi.fn(async () => 'test-csrf-token');
      const csrfService = new ChatService({
        apiUrl: 'https://api.test',
        csrfToken: csrfProvider,
        // Disable the offline queue — the socket is never connected in this
        // unit test, so sendMessage would otherwise queue the message
        // instead of issuing a fetch.
        enableMessageQueue: false,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(okJson);

      await csrfService.sendMessage('chat-1', 'hello');

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const init = call[1] as RequestInit & { headers: Record<string, string> };
      expect(csrfProvider).toHaveBeenCalled();
      expect(init.headers['x-csrf-token']).toBe('test-csrf-token');
      expect(init.credentials).toBe('include');
      expect(init.method).toBe('POST');
    });

    it('sends a JSON body (not multipart) when sendMessage has no attachments', async () => {
      // The backend POST /chats/:id/messages route is JSON-only — no multer.
      // Sending multipart for plain-text messages was rejected with a 400
      // from express-validator because req.body parsed as empty. This guard
      // test fires if anyone re-introduces FormData on the text path.
      const service = new ChatService({
        apiUrl: 'https://api.test',
        enableMessageQueue: false,
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(okJson);

      await service.sendMessage('chat-1', 'hello');

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const init = call[1] as RequestInit & { headers: Record<string, string> };
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(typeof init.body).toBe('string');
      expect(JSON.parse(init.body as string)).toEqual({ content: 'hello' });
    });

    it('omits the x-csrf-token header when no provider is supplied', async () => {
      const plainService = new ChatService({ apiUrl: 'https://api.test' });
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(okJson);

      await plainService.markAsRead('chat-1');

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const init = call[1] as RequestInit & { headers: Record<string, string> };
      expect(init.headers['x-csrf-token']).toBeUndefined();
      // credentials are still included so the session cookie travels.
      expect(init.credentials).toBe('include');
    });

    it('sends credentials on GET so the session cookie travels', async () => {
      const service = new ChatService({ apiUrl: 'https://api.test' });
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ data: [] }),
        } as Response)
      );

      await service.getConversations();

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const init = call[1] as RequestInit;
      expect(init.credentials).toBe('include');
    });
  });

  // ADS-583: rescue staff need to mark a conversation as resolved (archived
  // on the backend) and optionally reopen it. The service is a thin PATCH
  // wrapper; the provider does the optimistic state plumbing.
  describe('updateConversationStatus', () => {
    it('issues a PATCH to /api/v1/chats/:id with the new status and credentials', async () => {
      const service = new ChatService({ apiUrl: 'https://api.test' });
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ data: { id: 'chat-1', status: 'archived' } }),
        } as Response)
      );

      const result = await service.updateConversationStatus('chat-1', 'archived');

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = call[0] as string;
      const init = call[1] as RequestInit & { headers: Record<string, string> };
      expect(url).toBe('https://api.test/api/v1/chats/chat-1');
      expect(init.method).toBe('PATCH');
      expect(init.credentials).toBe('include');
      expect(JSON.parse(init.body as string)).toEqual({ status: 'archived' });
      expect(result).toEqual({ id: 'chat-1', status: 'archived' });
    });

    it('throws when the backend rejects the status update', async () => {
      const service = new ChatService({ apiUrl: 'https://api.test' });
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({}),
        } as Response)
      );

      await expect(service.updateConversationStatus('chat-1', 'bogus')).rejects.toThrow(/HTTP 400/);
    });
  });
});
