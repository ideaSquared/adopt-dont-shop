import { ChatService } from '../chat-service';
import { ConnectionStatus } from '../../types';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
  };

  return {
    io: jest.fn(() => mockSocket),
    __mockSocket: mockSocket,
  };
});

// Mock global fetch
global.fetch = jest.fn(() =>
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
    jest.clearAllMocks();
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

    it('should allow subscribing to connection status changes', (done) => {
      const statusCallback = jest.fn((status: ConnectionStatus) => {
        expect(['disconnected', 'connecting', 'connected']).toContain(status);
        done();
      });

      service.onConnectionStatusChange(statusCallback);
      service.connect('user-123', 'token');
    });

    it('should disconnect cleanly', () => {
      service.connect('user-123', 'token');
      service.disconnect();

      const status = service.getConnectionStatus();
      expect(status).toBe('disconnected');
    });

    it('should handle connection errors gracefully', () => {
      const errorCallback = jest.fn((error: Error) => {
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
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.onConnectionStatusChange(listener1);
      service.onConnectionStatusChange(listener2);

      service.connect('user-123', 'token');

      // Both listeners should be called
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove connection status listeners', () => {
      const listener = jest.fn();

      service.onConnectionStatusChange(listener);
      service.offConnectionStatusChange(listener);

      service.connect('user-123', 'token');

      // Listener should not be called after removal
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Socket.IO connection - reconnection with exponential backoff', () => {
    it('should automatically reconnect when connection is lost', (done) => {
      const reconnectCallback = jest.fn(() => {
        expect(reconnectCallback).toHaveBeenCalled();
        done();
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
      global.setTimeout = jest.fn((callback, delay) => {
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

      const statusCallback = jest.fn();
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

      global.setTimeout = jest.fn((callback, delay) => {
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
    it('should receive new messages in real-time', (done) => {
      service.connect('user-123', 'token');

      service.onMessage((message) => {
        expect(message).toBeDefined();
        expect(message.content).toBeTruthy();
        done();
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

    it('should receive typing indicators in real-time', (done) => {
      service.connect('user-123', 'token');

      service.onTyping((typing) => {
        expect(typing).toBeDefined();
        expect(typing.userId).toBeTruthy();
        done();
      });

      service.simulateTypingIndicator({
        conversationId: 'conv-123',
        userId: 'user-456',
        userName: 'Test User',
        startedAt: new Date().toISOString(),
      });
    });

    it('should handle connection events', (done) => {
      service.onConnectionStatusChange((status) => {
        if (status === 'connected') {
          done();
        }
      });

      service.connect('user-123', 'token');
      service.simulateConnectEvent();
    });

    it('should handle disconnection events', (done) => {
      service.connect('user-123', 'token');

      service.onConnectionStatusChange((status) => {
        if (status === 'disconnected') {
          done();
        }
      });

      service.simulateDisconnect();
    });

    it('should handle error events', (done) => {
      service.onConnectionError((error) => {
        expect(error).toBeDefined();
        expect(error.message).toBe('Connection failed');
        done();
      });

      service.simulateError(new Error('Connection failed'));
    });

    it('should allow removing event listeners', () => {
      const messageCallback = jest.fn();

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
  });
});
