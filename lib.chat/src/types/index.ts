/**
 * Configuration options for ChatService
 */
export interface ChatServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
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
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

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
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: MessageAttachment[];
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

