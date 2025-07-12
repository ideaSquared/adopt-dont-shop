/**
 * Simplified Message Broker Integration
 * Horizontal socket server scaling without external dependencies
 * Part of Phase 3 - Message Broker Integration
 */

import { logger } from '../utils/logger';

export interface BrokerMessage {
  type: 'message' | 'typing' | 'user_status' | 'system';
  payload: Record<string, unknown>;
  conversationId?: string;
  userId?: string;
  timestamp: string;
  serverId: string;
}

export interface MessageBrokerConfig {
  serverId?: string;
  enableLogging?: boolean;
}

export interface MessageHandler {
  (message: BrokerMessage): void;
}

export interface TypingHandler {
  (typing: { userId: string; isTyping: boolean; conversationId: string }): void;
}

export interface StatusHandler {
  (status: { userId: string; status: 'online' | 'offline' | 'away' }): void;
}

export interface SystemMessageHandler {
  (message: { type: string; content: string; userId?: string }): void;
}

class MessageBroker {
  private connected = false;
  private serverId: string;
  private messageHandlers = new Map<string, MessageHandler>();
  private typingHandlers = new Map<string, TypingHandler>();
  private statusHandlers = new Map<string, StatusHandler>();
  private systemHandlers = new Set<SystemMessageHandler>();
  private config: MessageBrokerConfig;

  constructor(config: MessageBrokerConfig = {}) {
    this.config = config;
    this.serverId =
      config.serverId || `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the message broker
   */
  async initialize(): Promise<void> {
    try {
      this.connected = true;
      logger.info('Simplified message broker initialized successfully', {
        serverId: this.serverId,
      });
    } catch (error) {
      logger.error('Failed to initialize message broker:', error);
      throw error;
    }
  }

  /**
   * Publish a message to a specific channel
   */
  async publishMessage(
    channel: string,
    message: Omit<BrokerMessage, 'timestamp' | 'serverId'>
  ): Promise<void> {
    if (!this.connected) {
      logger.warn('Message broker not connected, skipping publish');
      return;
    }

    const brokerMessage: BrokerMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      serverId: this.serverId,
    };

    try {
      // In a real implementation, this would publish to Redis or another message broker
      // For now, we'll just log and handle locally
      if (this.config.enableLogging) {
        logger.debug('Publishing message:', { channel, message: brokerMessage });
      }

      // Handle message locally for demonstration
      this.handleLocalMessage(channel, brokerMessage);
    } catch (error) {
      logger.error('Failed to publish message:', {
        error: error instanceof Error ? error.message : String(error),
        channel,
        message,
      });
    }
  }

  /**
   * Publish a chat message
   */
  async publishChatMessage(
    conversationId: string,
    message: Record<string, unknown>,
    senderId: string
  ): Promise<void> {
    await this.publishMessage(`chat:${conversationId}`, {
      type: 'message',
      payload: message,
      conversationId,
      userId: senderId,
    });
  }

  /**
   * Publish typing indicator
   */
  async publishTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    await this.publishMessage(`chat:${conversationId}:typing`, {
      type: 'typing',
      payload: { userId, isTyping },
      conversationId,
      userId,
    });
  }

  /**
   * Publish user status change
   */
  async publishUserStatus(userId: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    await this.publishMessage(`user:${userId}:status`, {
      type: 'user_status',
      payload: { status },
      userId,
    });
  }

  /**
   * Publish system message
   */
  async publishSystemMessage(message: Record<string, unknown>): Promise<void> {
    await this.publishMessage('system:broadcast', {
      type: 'system',
      payload: message,
    });
  }

  /**
   * Subscribe to conversation messages
   */
  subscribeToConversation(conversationId: string, handler: MessageHandler): void {
    const channelKey = `chat:${conversationId}`;
    this.messageHandlers.set(channelKey, handler);

    logger.debug('Subscribed to conversation:', { conversationId, serverId: this.serverId });
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(conversationId: string, handler: TypingHandler): void {
    const channelKey = `chat:${conversationId}:typing`;
    this.typingHandlers.set(channelKey, handler);

    logger.debug('Subscribed to typing for conversation:', {
      conversationId,
      serverId: this.serverId,
    });
  }

  /**
   * Subscribe to user status changes
   */
  subscribeToUserStatus(userId: string, handler: StatusHandler): void {
    const channelKey = `user:${userId}:status`;
    this.statusHandlers.set(channelKey, handler);

    logger.debug('Subscribed to user status:', { userId, serverId: this.serverId });
  }

  /**
   * Subscribe to system messages
   */
  subscribeToSystemMessages(handler: SystemMessageHandler): void {
    this.systemHandlers.add(handler);

    logger.debug('Subscribed to system messages:', { serverId: this.serverId });
  }

  /**
   * Unsubscribe from a conversation
   */
  unsubscribeFromConversation(conversationId: string): void {
    const channelKey = `chat:${conversationId}`;
    this.messageHandlers.delete(channelKey);

    logger.debug('Unsubscribed from conversation:', { conversationId, serverId: this.serverId });
  }

  /**
   * Unsubscribe from typing indicators
   */
  unsubscribeFromTyping(conversationId: string): void {
    const channelKey = `chat:${conversationId}:typing`;
    this.typingHandlers.delete(channelKey);

    logger.debug('Unsubscribed from typing for conversation:', {
      conversationId,
      serverId: this.serverId,
    });
  }

  /**
   * Unsubscribe from user status
   */
  unsubscribeFromUserStatus(userId: string): void {
    const channelKey = `user:${userId}:status`;
    this.statusHandlers.delete(channelKey);

    logger.debug('Unsubscribed from user status:', { userId, serverId: this.serverId });
  }

  /**
   * Unsubscribe from system messages
   */
  unsubscribeFromSystemMessages(handler: SystemMessageHandler): void {
    this.systemHandlers.delete(handler);

    logger.debug('Unsubscribed from system messages:', { serverId: this.serverId });
  }

  /**
   * Get broker status
   */
  getStatus(): { connected: boolean; serverId: string; subscriptions: number } {
    const subscriptions =
      this.messageHandlers.size +
      this.typingHandlers.size +
      this.statusHandlers.size +
      this.systemHandlers.size;

    return {
      connected: this.connected,
      serverId: this.serverId,
      subscriptions,
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      this.connected = false;
      this.messageHandlers.clear();
      this.typingHandlers.clear();
      this.statusHandlers.clear();
      this.systemHandlers.clear();

      logger.info('Message broker disconnected successfully', {
        serverId: this.serverId,
      });
    } catch (error) {
      logger.error('Failed to disconnect message broker:', error);
      throw error;
    }
  }

  /**
   * Handle messages locally for demonstration
   */
  private handleLocalMessage(channel: string, message: BrokerMessage): void {
    // Handle conversation messages
    if (channel.startsWith('chat:') && !channel.includes(':typing')) {
      const handler = this.messageHandlers.get(channel);
      if (handler) {
        handler(message);
      }
    }

    // Handle typing indicators
    if (channel.includes(':typing')) {
      const handler = this.typingHandlers.get(channel);
      if (handler && message.payload) {
        handler(message.payload as { userId: string; isTyping: boolean; conversationId: string });
      }
    }

    // Handle user status
    if (channel.startsWith('user:') && channel.includes(':status')) {
      const handler = this.statusHandlers.get(channel);
      if (handler && message.payload) {
        handler(message.payload as { userId: string; status: 'online' | 'offline' | 'away' });
      }
    }

    // Handle system messages
    if (channel.startsWith('system:')) {
      this.systemHandlers.forEach(handler => {
        if (message.payload) {
          handler(message.payload as { type: string; content: string; userId?: string });
        }
      });
    }
  }
}

// Export singleton instance
const brokerConfig: MessageBrokerConfig = {
  enableLogging: process.env.NODE_ENV === 'development',
};

export const messageBroker = new MessageBroker(brokerConfig);

/**
 * Initialize the message broker
 */
export async function initializeMessageBroker(): Promise<void> {
  return messageBroker.initialize();
}

/**
 * Get the message broker instance
 */
export function getMessageBroker(): MessageBroker {
  return messageBroker;
}
