/**
 * API Endpoints for Chat Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const CHAT_ENDPOINTS = {
  // Core chat operations
  CONVERSATIONS: '/api/v1/conversations',
  CONVERSATION_BY_ID: (id: string) => `/api/v1/conversations/${id}`,

  // Message management
  MESSAGES: (conversationId: string) => `/api/v1/conversations/${conversationId}/messages`,
  SEND_MESSAGE: (conversationId: string) => `/api/v1/conversations/${conversationId}/messages`,
  MESSAGE_BY_ID: (conversationId: string, messageId: string) =>
    `/api/v1/conversations/${conversationId}/messages/${messageId}`,

  // Conversation management
  START_CONVERSATION: '/api/v1/conversations/start',
  ARCHIVE_CONVERSATION: (id: string) => `/api/v1/conversations/${id}/archive`,
  DELETE_CONVERSATION: (id: string) => `/api/v1/conversations/${id}`,

  // Read status and typing indicators
  MARK_AS_READ: (conversationId: string) => `/api/v1/conversations/${conversationId}/read`,
  TYPING_STATUS: (conversationId: string) => `/api/v1/conversations/${conversationId}/typing`,

  // File and media attachments
  UPLOAD_ATTACHMENT: (conversationId: string) =>
    `/api/v1/conversations/${conversationId}/attachments`,
  DOWNLOAD_ATTACHMENT: (conversationId: string, attachmentId: string) =>
    `/api/v1/conversations/${conversationId}/attachments/${attachmentId}`,

  // Search and filtering
  SEARCH_CONVERSATIONS: '/api/v1/conversations/search',
  SEARCH_MESSAGES: '/api/v1/conversations/messages/search',

  // User presence and status
  USER_PRESENCE: '/api/v1/chat/presence',
  UPDATE_STATUS: '/api/v1/chat/status',

  // Chat analytics
  CHAT_METRICS: '/api/v1/chat/metrics',
  CONVERSATION_STATS: (id: string) => `/api/v1/conversations/${id}/stats`,
} as const;

// Export individual endpoint groups for easier imports
export const {
  CONVERSATIONS,
  CONVERSATION_BY_ID,
  MESSAGES,
  SEND_MESSAGE,
  MESSAGE_BY_ID,
  START_CONVERSATION,
  ARCHIVE_CONVERSATION,
  DELETE_CONVERSATION,
  MARK_AS_READ,
  TYPING_STATUS,
  UPLOAD_ATTACHMENT,
  DOWNLOAD_ATTACHMENT,
  SEARCH_CONVERSATIONS,
  SEARCH_MESSAGES,
  USER_PRESENCE,
  UPDATE_STATUS,
  CHAT_METRICS,
  CONVERSATION_STATS,
} = CHAT_ENDPOINTS;
