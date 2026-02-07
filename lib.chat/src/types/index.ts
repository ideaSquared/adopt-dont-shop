/**
 * Socket.IO connection status
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Socket.IO reconnection configuration
 */
export interface ReconnectionConfig {
  /**
   * Enable automatic reconnection
   */
  enabled: boolean;

  /**
   * Initial delay in milliseconds
   */
  initialDelay: number;

  /**
   * Maximum delay in milliseconds
   */
  maxDelay: number;

  /**
   * Maximum number of reconnection attempts
   */
  maxAttempts: number;

  /**
   * Exponential backoff multiplier
   */
  backoffMultiplier: number;
}

/**
 * Queued message for sending when connection is restored
 */
export interface QueuedMessage {
  conversationId: string;
  content: string;
  attachments?: File[];
  timestamp: string;
  retryCount: number;
}

/**
 * Configuration options for ChatService
 */
export interface ChatServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * WebSocket URL (defaults to apiUrl if not provided)
   */
  socketUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   * Can be static strings or dynamic functions/objects for auth tokens
   */
  headers?: Record<string, string | (() => string) | { Authorization?: string }>;

  /**
   * Reconnection configuration
   */
  reconnection?: Partial<ReconnectionConfig>;

  /**
   * Enable message queuing during disconnection
   */
  enableMessageQueue?: boolean;

  /**
   * Maximum number of messages to queue
   */
  maxQueueSize?: number;
}

/**
 * Options for ChatService operations
 */
export interface ChatServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Participant in a conversation
 */
export interface Participant {
  id: string;
  name: string;
  type: 'user' | 'rescue' | 'admin';
  avatarUrl?: string;
  isOnline?: boolean;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

/**
 * Reaction on a message
 */
export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

/**
 * Read receipt for a message
 */
export interface MessageReadReceipt {
  userId: string;
  readAt: string;
}

/**
 * Delivery status for read receipt tracking
 */
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Chat message
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: MessageDeliveryStatus;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  readBy?: MessageReadReceipt[];
  isEdited?: boolean;
  editedAt?: string;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation/Chat interface
 */
export interface Conversation {
  id: string;
  chat_id?: string; // Backend compatibility
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
  isActive: boolean;

  // Pet adoption specific fields
  petId?: string;
  rescueId?: string;
  rescueName?: string; // Computed field for easy display

  // Conversation metadata
  title?: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'active' | 'archived' | 'blocked' | 'closed';
  metadata?: Record<string, unknown>;
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  startedAt: string;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
