import { apiService } from './api';

// Basic message types for rescue app
interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  read_at?: string;
}

interface Conversation {
  conversation_id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image';
}

/**
 * Chat Service for Rescue App
 *
 * Handles communication between rescue staff and adopters.
 * Provides basic messaging functionality with real-time updates.
 */
class ChatService {
  private conversations: Map<string, Conversation> = new Map();
  private wsConnection: WebSocket | null = null;

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const conversations = await apiService.get<Conversation[]>('/api/v1/messages/conversations');

      // Update local cache
      conversations.forEach(conv => {
        this.conversations.set(conv.conversation_id, conv);
      });

      return conversations;
    } catch (error) {
      console.error('❌ ChatService: Failed to fetch conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    try {
      return await apiService.get<Message[]>(
        `/api/v1/messages/conversations/${conversationId}/messages`,
        {
          limit,
          offset,
        }
      );
    } catch (error) {
      console.error('❌ ChatService: Failed to fetch messages:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    try {
      const message = await apiService.post<Message>('/api/v1/messages/send', request);

      // Update conversation cache
      const conversation = this.conversations.get(request.conversation_id);
      if (conversation) {
        conversation.last_message = message;
        conversation.updated_at = message.created_at;
      }

      return message;
    } catch (error) {
      console.error('❌ ChatService: Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    try {
      await apiService.patch(`/api/v1/messages/conversations/${conversationId}/read`, {
        message_ids: messageIds,
      });

      // Update conversation cache
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.unread_count = Math.max(0, conversation.unread_count - messageIds.length);
      }
    } catch (error) {
      console.error('❌ ChatService: Failed to mark messages as read:', error);
      throw error;
    }
  }

  /**
   * Start a new conversation
   */
  async startConversation(participantId: string, initialMessage?: string): Promise<Conversation> {
    try {
      const conversation = await apiService.post<Conversation>('/api/v1/messages/conversations', {
        participant_id: participantId,
        initial_message: initialMessage,
      });

      // Update local cache
      this.conversations.set(conversation.conversation_id, conversation);

      return conversation;
    } catch (error) {
      console.error('❌ ChatService: Failed to start conversation:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    try {
      return await apiService.get<Message[]>('/api/v1/messages/search', {
        query,
        conversation_id: conversationId,
      });
    } catch (error) {
      console.error('❌ ChatService: Failed to search messages:', error);
      throw error;
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiService.get<{ unread_count: number }>(
        '/api/v1/messages/unread-count'
      );
      return response.unread_count;
    } catch (error) {
      console.error('❌ ChatService: Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  initializeWebSocket(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    const token = localStorage.getItem('authToken');

    if (!token) {
      console.warn('⚠️ ChatService: No auth token available for WebSocket');
      return;
    }

    try {
      this.wsConnection = new WebSocket(`${wsUrl}/ws/messages?token=${token}`);

      this.wsConnection.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('🔌 ChatService: WebSocket connected');
      };

      this.wsConnection.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ ChatService: Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        // eslint-disable-next-line no-console
        console.log('🔌 ChatService: WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(), 5000);
      };

      this.wsConnection.onerror = error => {
        console.error('❌ ChatService: WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ ChatService: Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'new_message':
        this.handleNewMessage(data.message);
        break;
      case 'message_read':
        this.handleMessageRead(data.conversation_id, data.message_ids);
        break;
      case 'conversation_updated':
        this.handleConversationUpdate(data.conversation);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log('🔌 ChatService: Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * Handle new message from WebSocket
   */
  private handleNewMessage(message: Message): void {
    // Update conversation cache
    const conversation = this.conversations.get(message.conversation_id);
    if (conversation) {
      conversation.last_message = message;
      conversation.updated_at = message.created_at;
      conversation.unread_count += 1;
    }

    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('chat:new_message', { detail: message }));
  }

  /**
   * Handle message read notification from WebSocket
   */
  private handleMessageRead(conversationId: string, messageIds: string[]): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.unread_count = Math.max(0, conversation.unread_count - messageIds.length);
    }

    window.dispatchEvent(
      new CustomEvent('chat:messages_read', {
        detail: { conversationId, messageIds },
      })
    );
  }

  /**
   * Handle conversation update from WebSocket
   */
  private handleConversationUpdate(updatedConversation: Conversation): void {
    this.conversations.set(updatedConversation.conversation_id, updatedConversation);

    window.dispatchEvent(
      new CustomEvent('chat:conversation_updated', {
        detail: updatedConversation,
      })
    );
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.disconnect();
    this.conversations.clear();
  }
}

export const chatService = new ChatService();
