/**
 * Message Broker Interface
 * Simplified message broker for horizontal scaling
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

export interface MessageHandler {
  (message: BrokerMessage): void;
}

class SimplifiedMessageBroker {
  private serverId: string;
  private messageHandlers = new Map<string, MessageHandler>();
  private connected = false;

  constructor() {
    this.serverId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the message broker
   */
  async initialize(): Promise<void> {
    this.connected = true;
    logger.info('Simplified message broker initialized', {
      serverId: this.serverId,
    });
  }

  /**
   * Publish a chat message
   */
  async publishChatMessage(
    conversationId: string,
    message: Record<string, unknown>,
    senderId: string
  ): Promise<void> {
    if (!this.connected) {
      return;
    }

    const brokerMessage: BrokerMessage = {
      type: 'message',
      payload: message,
      conversationId,
      userId: senderId,
      timestamp: new Date().toISOString(),
      serverId: this.serverId,
    };

    // In a real implementation, this would publish to Redis
    // For now, we'll just log it to show the architecture
    logger.info('Message published to broker', {
      channel: `chat:conversation:${conversationId}`,
      serverId: this.serverId,
      messageId: brokerMessage.timestamp,
    });
  }

  /**
   * Publish typing indicator
   */
  async publishTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    if (!this.connected) {
      return;
    }

    const brokerMessage: BrokerMessage = {
      type: 'typing',
      payload: { isTyping, userName: 'User' },
      conversationId,
      userId,
      timestamp: new Date().toISOString(),
      serverId: this.serverId,
    };

    logger.debug('Typing indicator published', {
      conversationId,
      isTyping,
      serverId: this.serverId,
      timestamp: brokerMessage.timestamp,
    });
  }

  /**
   * Subscribe to conversation messages
   */
  subscribeToConversation(conversationId: string, handler: MessageHandler): void {
    const channel = `chat:conversation:${conversationId}`;
    this.messageHandlers.set(channel, handler);
    logger.debug('Subscribed to conversation', { conversationId, serverId: this.serverId });
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(conversationId: string, handler: MessageHandler): void {
    const channel = `chat:typing:${conversationId}`;
    this.messageHandlers.set(channel, handler);
    logger.debug('Subscribed to typing indicators', { conversationId, serverId: this.serverId });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(pattern: string): void {
    this.messageHandlers.delete(pattern);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server ID
   */
  getServerId(): string {
    return this.serverId;
  }

  /**
   * Get broker statistics
   */
  getStats() {
    return {
      serverId: this.serverId,
      connected: this.connected,
      activeHandlers: this.messageHandlers.size,
    };
  }

  /**
   * Disconnect the broker
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.messageHandlers.clear();
    logger.info('Message broker disconnected', { serverId: this.serverId });
  }
}

// Export singleton instance
let messageBroker: SimplifiedMessageBroker | null = null;

export function getMessageBroker(): SimplifiedMessageBroker | null {
  return messageBroker;
}

export async function initializeMessageBroker(): Promise<SimplifiedMessageBroker> {
  messageBroker = new SimplifiedMessageBroker();
  await messageBroker.initialize();
  return messageBroker;
}

export { SimplifiedMessageBroker as MessageBroker };
