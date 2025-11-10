// Main exports for @adopt-dont-shop/lib-chat
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
} from './types';
export * from './types';

// Admin hooks
export {
  useAdminChats,
  useAdminChatById,
  useAdminChatMessages,
  useAdminChatStats,
  useAdminSearchChats,
  useAdminChatMutations,
} from './services/admin-chat-hooks';

