import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
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
  private baseUrl = '/api/chat';
  private socketUrl: string;

  constructor() {
    this.socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }

  // Socket connection management
  connect(userId: string, token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.socketUrl, {
      auth: {
        token,
        userId,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    this.socket.on('error', error => {
      console.error('Socket error:', error);
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
    this.socket?.on('message', callback);
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
    const response = await api.get<ApiResponse<Conversation[]>>(`${this.baseUrl}/conversations`);
    return response.data;
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get<ApiResponse<Conversation>>(
      `${this.baseUrl}/conversations/${conversationId}`
    );
    return response.data;
  }

  async createConversation(data: {
    rescueId: string;
    petId?: string;
    applicationId?: string;
    type: 'application' | 'general' | 'support';
    initialMessage?: string;
  }): Promise<Conversation> {
    const response = await api.post<ApiResponse<Conversation>>(
      `${this.baseUrl}/conversations`,
      data
    );
    return response.data;
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await api.patch(`${this.baseUrl}/conversations/${conversationId}`, {
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
    const response = await api.get<
      ApiResponse<{
        messages: Message[];
        hasMore: boolean;
        total: number;
      }>
    >(`${this.baseUrl}/conversations/${conversationId}/messages`, {
      page,
      limit,
    });
    return response.data;
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

    // Emit via socket for real-time delivery
    this.socket?.emit('sendMessage', message);

    // Also save via API for persistence
    const response = await api.post<ApiResponse<Message>>(
      `${this.baseUrl}/conversations/${conversationId}/messages`,
      {
        content,
        messageType,
      }
    );
    return response.data;
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await api.patch<ApiResponse<Message>>(
      `${this.baseUrl}/messages/${messageId}`,
      { content }
    );

    // Emit via socket for real-time updates
    this.socket?.emit('editMessage', { messageId, content });

    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/messages/${messageId}`);

    // Emit via socket for real-time updates
    this.socket?.emit('deleteMessage', { messageId });
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    await api.post(`${this.baseUrl}/messages/${messageId}/reactions`, { emoji });

    // Emit via socket for real-time updates
    this.socket?.emit('addReaction', { messageId, emoji });
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await api.patch(`${this.baseUrl}/messages/${messageId}/reactions/remove`, { emoji });

    // Emit via socket for real-time updates
    this.socket?.emit('removeReaction', { messageId, emoji });
  }

  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    await api.post(`${this.baseUrl}/conversations/${conversationId}/read`, {
      messageId,
    });

    // Emit via socket for real-time updates
    this.socket?.emit('markAsRead', { conversationId, messageId });
  }

  async uploadAttachment(
    conversationId: string,
    file: File
  ): Promise<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }> {
    const response = await api.uploadFile<
      ApiResponse<{
        id: string;
        filename: string;
        url: string;
        mimeType: string;
        size: number;
      }>
    >(`${this.baseUrl}/conversations/${conversationId}/attachments`, file);
    return response.data;
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
    const response = await api.get<
      ApiResponse<{
        messages: Message[];
        total: number;
      }>
    >(`${this.baseUrl}/search`, {
      query,
      conversationId,
    });
    return response.data;
  }
}

export const chatService = new ChatService();
