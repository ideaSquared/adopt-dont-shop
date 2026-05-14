// Re-export all domain types from schemas (source of truth)
export type {
  ConnectionStatus,
  MessageDeliveryStatus,
  MessageAttachment,
  MessageReaction,
  MessageReadReceipt,
  Participant,
  Message,
  Conversation,
  TypingIndicator,
  ReconnectionConfig,
} from '../schemas';

import type { ReconnectionConfig } from '../schemas';

// QueuedMessage contains File[] (browser API) which cannot be represented in Zod
export type QueuedMessage = {
  conversationId: string;
  content: string;
  attachments?: File[];
  timestamp: string;
  retryCount: number;
};

export type ChatServiceConfig = {
  apiUrl?: string;
  socketUrl?: string;
  debug?: boolean;
  headers?: Record<string, string | (() => string) | { Authorization?: string }>;
  reconnection?: Partial<ReconnectionConfig>;
  enableMessageQueue?: boolean;
  maxQueueSize?: number;
  /**
   * Async provider that returns the current CSRF token for the session.
   * Required by the backend's double-submit-cookie CSRF middleware on
   * state-changing requests (POST, PUT, PATCH, DELETE). Apps typically
   * wire this to `apiService.getCsrfToken()` so both libraries share
   * one cached token.
   */
  csrfToken?: () => Promise<string | null>;
};

export type ChatServiceOptions = {
  timeout?: number;
  useCache?: boolean;
  metadata?: Record<string, unknown>;
};

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
