import { io, Socket } from 'socket.io-client';
import {
  ChatServiceConfig,
  Conversation,
  Message,
  MessageReaction,
  TypingIndicator,
  PaginatedResponse,
  ConnectionStatus,
  ReconnectionConfig,
  QueuedMessage,
} from '../types';

/**
 * Event payload when a reaction is added or removed
 */
export interface ReactionUpdateEvent {
  messageId: string;
  emoji: string;
  userId: string;
  reactions: MessageReaction[];
}

/**
 * Event payload when messages are marked as read
 */
export interface ReadStatusUpdateEvent {
  chatId: string;
  userId: string;
  timestamp: string;
}

/**
 * ChatService - Handles chat operations
 */
export class ChatService {
  // csrfToken legitimately stays optional — apps without CSRF protection
  // don't wire it. Everything else in ChatServiceConfig has a default so
  // it's safe to widen to Required<...>.
  private config: Required<Omit<ChatServiceConfig, 'csrfToken'>> &
    Pick<ChatServiceConfig, 'csrfToken'>;
  private cache: Map<string, unknown> = new Map();
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectionAttempts = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private connectionStatusListeners: Array<(status: ConnectionStatus) => void> = [];
  private connectionErrorListeners: Array<(error: Error) => void> = [];
  private messageListeners: Array<(message: Message) => void> = [];
  private typingListeners: Array<(typing: TypingIndicator) => void> = [];
  private reactionListeners: Array<(event: ReactionUpdateEvent) => void> = [];
  private readStatusListeners: Array<(event: ReadStatusUpdateEvent) => void> = [];
  private currentUserId: string | null = null;
  private currentToken: string | null = null;

  // Default reconnection configuration
  private defaultReconnectionConfig: ReconnectionConfig = {
    enabled: true,
    initialDelay: 1000,
    maxDelay: 30000,
    maxAttempts: 10,
    backoffMultiplier: 1.5,
  };

  constructor(config: ChatServiceConfig = {}) {
    this.config = {
      apiUrl: '/api',
      socketUrl: config.socketUrl || config.apiUrl || '/api',
      debug: false,
      headers: {},
      reconnection: {
        ...this.defaultReconnectionConfig,
        ...config.reconnection,
      },
      enableMessageQueue: config.enableMessageQueue ?? true,
      maxQueueSize: config.maxQueueSize ?? 50,
      csrfToken: config.csrfToken,
      ...config,
    };
  }

  /**
   * Resolve headers for state-changing requests (POST/PUT/PATCH/DELETE).
   * Adds the CSRF token the backend's double-submit-cookie middleware
   * expects on top of the standard headers.
   */
  private async getMutatingHeaders(): Promise<Record<string, string>> {
    const headers = this.getHeaders();
    if (this.config.csrfToken) {
      try {
        const token = await this.config.csrfToken();
        if (token) {
          headers['x-csrf-token'] = token;
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn(`${ChatService.name} failed to resolve CSRF token:`, error);
        }
      }
    }
    return headers;
  }

  /**
   * Connect to real-time chat using Socket.IO
   */
  connect(userId: string, token: string): void {
    if (!userId) {
      throw new Error('User ID is required for connection');
    }

    if (!token) {
      throw new Error('Authentication token is required for connection');
    }

    try {
      this.currentUserId = userId;
      this.currentToken = token;

      this.updateConnectionStatus('connecting');

      // Create socket connection
      this.socket = io(this.config.socketUrl, {
        auth: { token },
        autoConnect: true,
        reconnection: false, // We handle reconnection manually
        transports: ['websocket', 'polling'],
      });

      this.setupSocketEventHandlers();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from real-time chat
   */
  disconnect(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionStatus('disconnected');
    this.reconnectionAttempts = 0;
    this.currentUserId = null;
    this.currentToken = null;
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    // Connection successful
    this.socket.on('connect', () => {
      this.handleConnect();
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      this.handleConnectionError(error);
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      this.handleDisconnect(reason);
    });

    // New message received
    this.socket.on('new_message', (data: { message: Message }) => {
      this.messageListeners.forEach((listener) => listener(data.message));
    });

    // Typing indicator
    this.socket.on(
      'user_typing',
      (data: { userId: string; firstName: string; lastName: string; chatId: string }) => {
        const typing: TypingIndicator = {
          conversationId: data.chatId,
          userId: data.userId,
          userName: `${data.firstName} ${data.lastName}`,
          startedAt: new Date().toISOString(),
        };
        this.typingListeners.forEach((listener) => listener(typing));
      }
    );

    // User stopped typing
    this.socket.on('user_stopped_typing', () => {
      // Handle stopped typing if needed
    });

    // Reaction added
    this.socket.on(
      'reaction_added',
      (data: {
        messageId: string;
        emoji: string;
        userId: string;
        reactions: MessageReaction[];
        timestamp: string;
      }) => {
        const event: ReactionUpdateEvent = {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: data.userId,
          reactions: data.reactions,
        };
        this.reactionListeners.forEach((listener) => listener(event));
      }
    );

    // Reaction removed
    this.socket.on(
      'reaction_removed',
      (data: {
        messageId: string;
        emoji: string;
        userId: string;
        reactions: MessageReaction[];
        timestamp: string;
      }) => {
        const event: ReactionUpdateEvent = {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: data.userId,
          reactions: data.reactions,
        };
        this.reactionListeners.forEach((listener) => listener(event));
      }
    );

    // Messages read by another user
    this.socket.on(
      'messages_read',
      (data: { userId: string; chatId: string; timestamp: string }) => {
        const event: ReadStatusUpdateEvent = {
          chatId: data.chatId,
          userId: data.userId,
          timestamp: new Date(data.timestamp).toISOString(),
        };
        this.readStatusListeners.forEach((listener) => listener(event));
      }
    );

    // Error event
    this.socket.on('error', (error: { event: string; message: string; error: string }) => {
      this.handleConnectionError(new Error(error.message));
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    this.updateConnectionStatus('connected');
    this.reconnectionAttempts = 0;

    // Process queued messages
    this.processMessageQueue();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    this.updateConnectionStatus('disconnected');

    // Attempt reconnection if enabled and not a manual disconnect
    if (
      this.config.reconnection?.enabled &&
      reason !== 'io client disconnect' &&
      this.currentUserId &&
      this.currentToken
    ) {
      this.attemptReconnection();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.updateConnectionStatus('error');

    if (this.config.debug) {
      console.error(`${ChatService.name} connection error:`, error);
    }

    this.connectionErrorListeners.forEach((listener) => listener(error));

    // Attempt reconnection if enabled
    if (this.config.reconnection?.enabled && this.currentUserId && this.currentToken) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    const reconnectionConfig: ReconnectionConfig = {
      ...this.defaultReconnectionConfig,
      ...(this.config.reconnection || {}),
    };

    if (this.reconnectionAttempts >= reconnectionConfig.maxAttempts) {
      return;
    }

    this.updateConnectionStatus('reconnecting');
    this.reconnectionAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      reconnectionConfig.initialDelay *
        Math.pow(reconnectionConfig.backoffMultiplier, this.reconnectionAttempts - 1),
      reconnectionConfig.maxDelay
    );

    this.reconnectionTimer = setTimeout(() => {
      if (this.currentUserId && this.currentToken) {
        // Disconnect existing socket
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        // Attempt new connection
        this.connect(this.currentUserId, this.currentToken);
      }
    }, delay);
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.connectionStatusListeners.forEach((listener) => listener(status));
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current reconnection attempts
   */
  getReconnectionAttempts(): number {
    return this.reconnectionAttempts;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionStatusListeners.push(callback);
  }

  /**
   * Unsubscribe from connection status changes
   */
  offConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(
      (listener) => listener !== callback
    );
  }

  /**
   * Subscribe to connection errors
   */
  onConnectionError(callback: (error: Error) => void): void {
    this.connectionErrorListeners.push(callback);
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (!this.config.enableMessageQueue || this.messageQueue.length === 0) {
      return;
    }

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const queuedMessage of queue) {
      try {
        await this.sendMessage(
          queuedMessage.conversationId,
          queuedMessage.content,
          queuedMessage.attachments
        );
      } catch (error) {
        // Re-queue message if it failed
        if (queuedMessage.retryCount < 3) {
          this.messageQueue.push({
            ...queuedMessage,
            retryCount: queuedMessage.retryCount + 1,
          });
        }

        if (this.config.debug) {
          console.error(`${ChatService.name} failed to send queued message:`, error);
        }
      }
    }
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Clear message queue
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Get resolved headers (handles dynamic headers like auth tokens)
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Resolve dynamic headers (like auth tokens)
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        if (typeof value === 'function') {
          try {
            const resolvedValue = (value as () => string)();
            if (resolvedValue) {
              headers[key] = resolvedValue;
            }
          } catch (error) {
            if (this.config.debug) {
              console.warn(`Failed to resolve header ${key}:`, error);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle getter properties for Authorization
          try {
            const authValue = value.Authorization;
            if (typeof authValue === 'string' && authValue) {
              headers.Authorization = authValue;
            }
          } catch (error) {
            if (this.config.debug) {
              console.warn(`Failed to resolve Authorization header:`, error);
            }
          }
        } else if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    return headers;
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/chats`, {
        credentials: 'include',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} getConversations error:`, error);
      }
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<Message>> {
    try {
      const params = new URLSearchParams({
        page: (options.page || 1).toString(),
        limit: (options.limit || 50).toString(),
      });

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/messages?${params}`,
        {
          credentials: 'include',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data: data.data?.messages || data.messages || [],
        success: true,
        message: data.message,
        timestamp: new Date().toISOString(),
        pagination: data.data?.pagination ||
          data.pagination || {
            page: options.page || 1,
            limit: options.limit || 50,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
      };
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} getMessages error:`, error);
      }
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    attachments?: File[]
  ): Promise<Message> {
    // Queue message if disconnected and queuing is enabled
    if (this.config.enableMessageQueue && this.connectionStatus !== 'connected') {
      if (this.messageQueue.length < this.config.maxQueueSize) {
        this.messageQueue.push({
          conversationId,
          content,
          attachments,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        });
      } else if (this.config.debug) {
        console.warn(`${ChatService.name} message queue full, dropping message`);
      }

      // Return a placeholder message
      return {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: this.currentUserId || 'unknown',
        senderName: 'You',
        content,
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sending',
      };
    }

    try {
      // The backend's POST /messages route is JSON-only (no multer). File
      // attachments go through the separate /attachments upload flow
      // (uploadAttachment) and are referenced by URL/id in follow-up
      // message metadata. For the text path — which is what ChatProvider
      // actually drives — send JSON so express-validator sees the body.
      // Sending multipart here made the server reject every message with
      // "Message content must be 1-N characters" because req.body was
      // empty.
      const hasAttachments = attachments && attachments.length > 0;

      let fetchBody: BodyInit;
      const headers = await this.getMutatingHeaders();

      if (hasAttachments) {
        // Multipart path stays available for callers that opt into it
        // against a multer-enabled backend route. Drop Content-Type so
        // the browser can pick the correct multipart boundary.
        const formData = new FormData();
        formData.append('content', content);
        attachments!.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        delete headers['Content-Type'];
        fetchBody = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify({ content });
      }

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/messages`,
        {
          method: 'POST',
          credentials: 'include',
          body: fetchBody,
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} sendMessage error:`, error);
      }
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/chats/${conversationId}/read`, {
        method: 'POST',
        credentials: 'include',
        headers: await this.getMutatingHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} markAsRead error:`, error);
      }
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: {
    petId?: string;
    rescueId: string;
    initialMessage?: string;
  }): Promise<Conversation> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: await this.getMutatingHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} createConversation error:`, error);
      }
      throw error;
    }
  }

  /**
   * Upload file attachment
   */
  async uploadAttachment(conversationId: string, file: File): Promise<{ url: string; id: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = await this.getMutatingHeaders();
      // Don't set Content-Type for FormData, let browser set it
      delete headers['Content-Type'];

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/attachments`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} uploadAttachment error:`, error);
      }
      throw error;
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: await this.getMutatingHeaders(),
          body: JSON.stringify({ emoji }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} addReaction error:`, error);
      }
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/messages/${messageId}/reactions`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: await this.getMutatingHeaders(),
          body: JSON.stringify({ emoji }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} removeReaction error:`, error);
      }
      throw error;
    }
  }

  /**
   * Register event listeners
   */
  onMessage(callback: (message: Message) => void): void {
    this.messageListeners.push(callback);
  }

  onTyping(callback: (typing: TypingIndicator) => void): void {
    this.typingListeners.push(callback);
  }

  onReactionUpdate(callback: (event: ReactionUpdateEvent) => void): void {
    this.reactionListeners.push(callback);
  }

  onReadStatusUpdate(callback: (event: ReadStatusUpdateEvent) => void): void {
    this.readStatusListeners.push(callback);
  }

  /**
   * Remove event listeners
   */
  off(event: string): void {
    if (event === 'message') {
      this.messageListeners = [];
    } else if (event === 'typing') {
      this.typingListeners = [];
    } else if (event === 'reaction') {
      this.reactionListeners = [];
    } else if (event === 'readStatus') {
      this.readStatusListeners = [];
    }

    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatServiceConfig {
    return { ...this.config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Test helper methods (for testing only)
  /**
   * Simulate disconnection (for testing)
   */
  simulateDisconnect(): void {
    if (this.socket) {
      this.handleDisconnect('io server disconnect');
    }
  }

  /**
   * Simulate reconnection (for testing)
   */
  simulateReconnect(): void {
    this.handleConnect();
  }

  /**
   * Simulate incoming message (for testing)
   */
  simulateIncomingMessage(message: Message): void {
    this.messageListeners.forEach((listener) => listener(message));
  }

  /**
   * Simulate typing indicator (for testing)
   */
  simulateTypingIndicator(typing: TypingIndicator): void {
    this.typingListeners.forEach((listener) => listener(typing));
  }

  /**
   * Simulate connection event (for testing)
   */
  simulateConnectEvent(): void {
    this.handleConnect();
  }

  /**
   * Simulate error event (for testing)
   */
  simulateError(error: Error): void {
    this.handleConnectionError(error);
  }

  /**
   * Simulate reaction update (for testing)
   */
  simulateReactionUpdate(event: ReactionUpdateEvent): void {
    this.reactionListeners.forEach((listener) => listener(event));
  }

  /**
   * Simulate read status update (for testing)
   */
  simulateReadStatusUpdate(event: ReadStatusUpdateEvent): void {
    this.readStatusListeners.forEach((listener) => listener(event));
  }
}
