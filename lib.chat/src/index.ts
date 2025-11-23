// Main exports for @adopt-dont-shop/lib.chat
export { ChatService } from './services/chat-service';
export type {
  ChatServiceConfig,
  ChatServiceOptions,
  Conversation,
  Message,
  Participant,
  MessageAttachment,
  TypingIndicator,
  BaseResponse,
  ErrorResponse,
  PaginatedResponse,
  ConnectionStatus,
  ReconnectionConfig,
  QueuedMessage,
} from './types';
export * from './types';

// Hooks
export { useConnectionStatus } from './hooks';

// Admin hooks
export {
  useAdminChats,
  useAdminChatById,
  useAdminChatMessages,
  useAdminChatStats,
  useAdminSearchChats,
  useAdminChatMutations,
} from './services/admin-chat-hooks';
