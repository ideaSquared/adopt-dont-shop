import {
  ChatServiceConfig,
  Conversation,
  Message,
  TypingIndicator,
  PaginatedResponse,
} from '../types';

/**
 * ChatService - Handles chat operations
 */
export class ChatService {
  private config: Required<ChatServiceConfig>;
  private cache: Map<string, unknown> = new Map();
  private socket: any = null; // Socket.IO client

  constructor(config: ChatServiceConfig = {}) {
    this.config = {
      apiUrl: '/api',
      debug: false,
      headers: {},
      ...config,
    };

    if (this.config.debug) {
      console.log(`${ChatService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Connect to real-time chat using Socket.IO
   */
  connect(userId: string, token: string): void {
    try {
      // Implementation would use socket.io-client
      // this.socket = io(this.config.apiUrl, { auth: { token } });

      if (this.config.debug) {
        console.log(
          `${ChatService.name} connecting to ${this.config.apiUrl} for user ${userId} with token ${token}`
        );
      }
    } catch (error) {
      console.error('Failed to connect to chat service:', error);
    }
  }

  /**
   * Disconnect from real-time chat
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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
            const authValue = (value as any).Authorization;
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
    try {
      const formData = new FormData();
      formData.append('content', content);

      if (attachments) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const headers = this.getHeaders();
      // Don't set Content-Type for FormData, let browser set it
      delete headers['Content-Type'];

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/messages`,
        {
          method: 'POST',
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
        headers: this.getHeaders(),
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
        headers: this.getHeaders(),
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

      const headers = this.getHeaders();
      // Don't set Content-Type for FormData, let browser set it
      delete headers['Content-Type'];

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/chats/${conversationId}/attachments`,
        {
          method: 'POST',
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
   * Register event listeners
   */
  onMessage(callback: (message: Message) => void): void {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  onTyping(callback: (typing: TypingIndicator) => void): void {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  /**
   * Remove event listeners
   */
  off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.debug) {
      console.log(`${ChatService.name} config updated:`, this.config);
    }
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

    if (this.config.debug) {
      console.log(`${ChatService.name} cache cleared`);
    }
  }
}
