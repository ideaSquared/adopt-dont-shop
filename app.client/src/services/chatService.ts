import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string; // The sender's first name
  senderType: 'user' | 'rescue';
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  reactions?: Array<{
    userId: string;
    emoji: string;
  }>;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  rescueId: string;
  petId?: string;
  applicationId?: string;
  type: 'application' | 'general' | 'support';
  status: 'active' | 'archived' | 'closed';
  participants: Array<{
    id: string;
    type: 'user' | 'rescue' | 'admin';
    name: string;
    avatar?: string;
    lastSeenAt?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  isTyping: Array<{
    userId: string;
    userName: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface MessageReaction {
  messageId: string;
  emoji: string;
  userId: string;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

export class ChatService {
  private socket: Socket | null = null;
  private baseUrl = '/api/v1/chats';
  private socketUrl: string;

  constructor() {
    // Check for socket URL in environment variables, fallback to API base URL
    this.socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:5000';

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('ChatService initialized with socket URL:', this.socketUrl);
    }
  }

  // Helper function to convert backend message format to frontend format
  private convertMessageFormat(backendMessage: Record<string, unknown>): Message {
    return {
      id: (backendMessage.message_id as string) || (backendMessage.id as string) || '',
      conversationId:
        (backendMessage.chat_id as string) || (backendMessage.conversationId as string) || '',
      senderId: (backendMessage.sender_id as string) || (backendMessage.senderId as string) || '',
      senderName:
        (backendMessage.sender_name as string) ||
        (backendMessage.senderName as string) ||
        undefined,
      senderType: ((backendMessage.sender_type as string) ||
        (backendMessage.senderType as string) ||
        'user') as 'user' | 'rescue',
      content: (backendMessage.content as string) || '',
      messageType: this.mapContentFormatToMessageType(
        (backendMessage.content_format as string) || (backendMessage.messageType as string)
      ),
      attachments: (backendMessage.attachments as Message['attachments']) || [],
      reactions: (backendMessage.reactions as Message['reactions']) || [],
      readBy: this.convertReadStatus(
        (backendMessage.read_status as Record<string, unknown>[]) ||
          (backendMessage.readBy as Record<string, unknown>[]) ||
          []
      ),
      editedAt: (backendMessage.edited_at as string) || (backendMessage.editedAt as string),
      deletedAt: (backendMessage.deleted_at as string) || (backendMessage.deletedAt as string),
      createdAt:
        (backendMessage.created_at as string) ||
        (backendMessage.createdAt as string) ||
        new Date().toISOString(),
      updatedAt:
        (backendMessage.updated_at as string) ||
        (backendMessage.updatedAt as string) ||
        new Date().toISOString(),
    };
  }

  // Helper to map backend content_format to frontend messageType
  private mapContentFormatToMessageType(
    contentFormat: string | undefined
  ): 'text' | 'image' | 'file' {
    switch (contentFormat) {
      case 'plain':
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'file':
        return 'file';
      default:
        return 'text';
    }
  }

  // Helper to convert backend read_status to frontend readBy format
  private convertReadStatus(
    readStatus: Record<string, unknown>[]
  ): Array<{ userId: string; readAt: string }> {
    if (!Array.isArray(readStatus)) return [];

    return readStatus.map(status => ({
      userId: (status.user_id as string) || (status.userId as string) || '',
      readAt: (status.read_at as string) || (status.readAt as string) || new Date().toISOString(),
    }));
  }

  // Socket connection management
  connect(userId: string, token: string): void {
    // Prevent multiple connections
    if (this.socket?.connected) {
      return;
    }

    // Disconnect any existing socket first
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.socketUrl, {
      auth: {
        token,
        userId,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000, // Add timeout to prevent hanging connections
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('Socket connected to chat server');
      }
    });

    this.socket.on('disconnect', () => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('Socket disconnected from chat server');
      }
    });

    this.socket.on('error', error => {
      console.error('Socket error:', error);
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Message listeners
  onMessage(callback: (message: Message) => void): void {
    this.socket?.on('message', data => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('Socket received message:', data);
      }
      callback(data);
    });
  }

  onMessageUpdated(callback: (message: Message) => void): void {
    this.socket?.on('messageUpdated', callback);
  }

  onMessageDeleted(callback: (messageId: string) => void): void {
    this.socket?.on('messageDeleted', callback);
  }

  onTyping(callback: (typing: TypingIndicator) => void): void {
    this.socket?.on('typing', callback);
  }

  onReaction(callback: (reaction: MessageReaction) => void): void {
    this.socket?.on('reaction', callback);
  }

  onConversationUpdated(callback: (conversation: Conversation) => void): void {
    this.socket?.on('conversationUpdated', callback);
  }

  // Remove listeners
  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }

  // API methods for conversations
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await api.get<ApiResponse<Conversation[]>>(`${this.baseUrl}`);

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response.data exists, use it
        if ('data' in response && Array.isArray(response.data)) {
          return response.data;
        }
        // If response is directly an array (fallback)
        if (Array.isArray(response)) {
          return response as Conversation[];
        }
        // If response has success and data properties
        if ('success' in response && 'data' in response && Array.isArray(response.data)) {
          return response.data;
        }
      }

      // Fallback to empty array if no valid data
      console.warn('Invalid conversations response structure:', response);
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await api.get<ApiResponse<Conversation>>(
        `${this.baseUrl}/${conversationId}`
      );

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response.data exists, use it
        if ('data' in response && response.data) {
          return response.data;
        }
        // If response is directly a conversation object (fallback)
        if ('id' in response) {
          return response as unknown as Conversation;
        }
      }

      throw new Error('Invalid conversation response structure');
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  async createConversation(data: {
    rescueId: string;
    petId?: string;
    applicationId?: string;
    type: 'application' | 'general' | 'support';
    initialMessage?: string;
  }): Promise<Conversation> {
    try {
      const response = await api.post<ApiResponse<Conversation> | Conversation>(
        `${this.baseUrl}`,
        data
      );

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response.data exists, use it (wrapped response)
        if ('data' in response && response.data) {
          return response.data;
        }
        // If response is directly a conversation object (direct response)
        if ('id' in response) {
          return response as Conversation;
        }
        // If response has success and data properties
        if ('success' in response && 'data' in response && response.data) {
          return response.data;
        }
      }

      throw new Error('Invalid conversation response structure');
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await api.patch(`${this.baseUrl}/${conversationId}`, {
      status: 'archived',
    });
  }

  // API methods for messages
  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      const response = await api.get<
        ApiResponse<{
          messages: Message[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }>
      >(`${this.baseUrl}/${conversationId}/messages`, {
        page,
        limit,
      });

      // Handle the case where response is null or undefined
      if (!response) {
        console.warn('No response received from API');
        return {
          messages: [],
          hasMore: false,
          total: 0,
        };
      }

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response.data exists with expected structure
        if ('data' in response && response.data && typeof response.data === 'object') {
          const { messages = [], pagination } = response.data;

          // Convert backend message format to frontend format
          const convertedMessages = (messages as unknown as Record<string, unknown>[]).map(msg =>
            this.convertMessageFormat(msg)
          );

          // Provide default values for pagination if missing
          const defaultPagination = {
            page: page,
            limit: limit,
            total: convertedMessages.length,
            pages: 1,
          };

          const finalPagination = pagination || defaultPagination;

          return {
            messages: convertedMessages,
            hasMore: finalPagination.page < finalPagination.pages,
            total: finalPagination.total,
          };
        }

        // If response is a direct array of messages (fallback)
        if (Array.isArray(response)) {
          const convertedMessages = (response as unknown as Record<string, unknown>[]).map(msg =>
            this.convertMessageFormat(msg)
          );
          return {
            messages: convertedMessages,
            hasMore: false,
            total: convertedMessages.length,
          };
        }

        // If response has messages directly on it (another possible structure)
        if ('messages' in response && Array.isArray(response.messages)) {
          const convertedMessages = (response.messages as unknown as Record<string, unknown>[]).map(
            msg => this.convertMessageFormat(msg)
          );
          return {
            messages: convertedMessages,
            hasMore: false,
            total: convertedMessages.length,
          };
        }

        // If response has success and data properties (backend format)
        if ('success' in response && 'data' in response && response.data) {
          const data = response.data as unknown;
          if (Array.isArray(data)) {
            const convertedMessages = (data as unknown as Record<string, unknown>[]).map(msg =>
              this.convertMessageFormat(msg)
            );
            return {
              messages: convertedMessages,
              hasMore: false,
              total: convertedMessages.length,
            };
          }
          if (
            typeof data === 'object' &&
            data !== null &&
            'messages' in data &&
            Array.isArray((data as Record<string, unknown>).messages)
          ) {
            const dataObj = data as {
              messages: Message[];
              pagination?: { page: number; limit: number; total: number; pages: number };
            };
            const { messages = [], pagination } = dataObj;

            // Convert backend message format to frontend format
            const convertedMessages = (messages as unknown as Record<string, unknown>[]).map(msg =>
              this.convertMessageFormat(msg)
            );

            const defaultPagination = {
              page: page,
              limit: limit,
              total: convertedMessages.length,
              pages: 1,
            };

            const finalPagination = pagination || defaultPagination;

            return {
              messages: convertedMessages,
              hasMore: finalPagination.page < finalPagination.pages,
              total: finalPagination.total,
            };
          }
        }
      }

      // Fallback - return empty messages if we can't parse the response
      console.warn('Unable to parse messages response, returning empty array:', response);
      return {
        messages: [],
        hasMore: false,
        total: 0,
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        messages: [],
        hasMore: false,
        total: 0,
      };
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text'
  ): Promise<Message> {
    const message = {
      conversationId,
      content,
      messageType,
      tempId: `temp_${Date.now()}_${Math.random()}`,
    };

    try {
      // Send via API for persistence (primary method)
      const response = await api.post<ApiResponse<Message> | Message>(
        `${this.baseUrl}/${conversationId}/messages`,
        {
          content,
          messageType,
        }
      );

      // Only emit via socket if API call was successful
      this.socket?.emit('sendMessage', message);

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response has success and data properties (backend format)
        if ('success' in response && 'data' in response && response.data) {
          const convertedMessage = this.convertMessageFormat(
            response.data as unknown as Record<string, unknown>
          );
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('Message sent successfully via API:', convertedMessage);
          }
          return convertedMessage;
        }
        // If response.data exists, use it (wrapped response)
        if ('data' in response && response.data) {
          const convertedMessage = this.convertMessageFormat(
            response.data as unknown as Record<string, unknown>
          );
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('Message sent successfully via API (wrapped):', convertedMessage);
          }
          return convertedMessage;
        }
        // If response is directly a message object (direct response)
        if ('id' in response || 'message_id' in response) {
          // Convert backend format to frontend format if needed
          const convertedMessage = this.convertMessageFormat(response as Record<string, unknown>);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('Message sent successfully via API (direct):', convertedMessage);
          }
          return convertedMessage;
        }
      }

      console.warn('Unable to parse sendMessage response, but continuing...:', response);
      // Return a mock message to prevent crash - the socket will handle real-time delivery
      return {
        id: message.tempId,
        conversationId,
        senderId: 'unknown',
        senderType: 'user' as const,
        content,
        messageType,
        readBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      // If API fails, still try socket for real-time delivery
      this.socket?.emit('sendMessage', message);
      throw error;
    }
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    try {
      const response = await api.patch<ApiResponse<Message> | Message>(
        `${this.baseUrl}/messages/${messageId}`,
        { content }
      );

      // Emit via socket for real-time updates
      this.socket?.emit('editMessage', { messageId, content });

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response has success and data properties (backend format)
        if ('success' in response && 'data' in response && response.data) {
          return response.data;
        }
        // If response.data exists, use it (wrapped response)
        if ('data' in response && response.data) {
          return response.data;
        }
        // If response is directly a message object (direct response)
        if ('id' in response || 'message_id' in response) {
          // Convert backend format to frontend format if needed
          return this.convertMessageFormat(response as Record<string, unknown>);
        }
      }

      throw new Error('Invalid edit message response structure');
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/messages/${messageId}`);

      // Emit via socket for real-time updates
      this.socket?.emit('deleteMessage', { messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      // Still emit via socket for real-time updates
      this.socket?.emit('deleteMessage', { messageId });
      throw error;
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/messages/${messageId}/reactions`, { emoji });

      // Emit via socket for real-time updates
      this.socket?.emit('addReaction', { messageId, emoji });
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Still emit via socket for real-time updates
      this.socket?.emit('addReaction', { messageId, emoji });
      throw error;
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    try {
      await api.patch(`${this.baseUrl}/messages/${messageId}/reactions/remove`, { emoji });

      // Emit via socket for real-time updates
      this.socket?.emit('removeReaction', { messageId, emoji });
    } catch (error) {
      console.error('Error removing reaction:', error);
      // Still emit via socket for real-time updates
      this.socket?.emit('removeReaction', { messageId, emoji });
      throw error;
    }
  }

  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${conversationId}/read`, {
        messageId,
      });

      // Emit via socket for real-time updates
      this.socket?.emit('markAsRead', { conversationId, messageId });
    } catch (error) {
      console.error('Error marking as read:', error);
      // Still emit via socket for real-time updates
      this.socket?.emit('markAsRead', { conversationId, messageId });
      // Don't throw error for markAsRead - it's not critical
    }
  }

  async uploadAttachment(
    _conversationId: string,
    _file: File
  ): Promise<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }> {
    // TODO: Implement attachment upload endpoint in backend
    throw new Error('Attachment upload not yet implemented in backend');
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    this.socket?.emit('startTyping', { conversationId });
  }

  stopTyping(conversationId: string): void {
    this.socket?.emit('stopTyping', { conversationId });
  }

  // Search messages
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<{
    messages: Message[];
    total: number;
  }> {
    try {
      const response = await api.get<
        ApiResponse<{
          messages: Message[];
          total: number;
        }>
      >(`${this.baseUrl}/search`, {
        query,
        conversationId,
      });

      // Handle different response structures
      if (response && typeof response === 'object') {
        // If response has success and data properties (backend format)
        if ('success' in response && 'data' in response && response.data) {
          const data = response.data as unknown as {
            messages: Record<string, unknown>[];
            total: number;
          };
          return {
            messages: data.messages.map(msg => this.convertMessageFormat(msg)),
            total: data.total,
          };
        }
        // If response.data exists, use it (wrapped response)
        if ('data' in response && response.data) {
          const data = response.data as unknown as {
            messages: Record<string, unknown>[];
            total: number;
          };
          return {
            messages: data.messages.map(msg => this.convertMessageFormat(msg)),
            total: data.total,
          };
        }
        // If response is directly the expected object
        if ('messages' in response && 'total' in response) {
          const data = response as unknown as {
            messages: Record<string, unknown>[];
            total: number;
          };
          return {
            messages: data.messages.map(msg => this.convertMessageFormat(msg)),
            total: data.total,
          };
        }
      }

      // Fallback to empty results
      console.warn('Unable to parse search messages response:', response);
      return {
        messages: [],
        total: 0,
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      return {
        messages: [],
        total: 0,
      };
    }
  }
}

export const chatService = new ChatService();
