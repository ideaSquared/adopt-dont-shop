// Main exports for @adopt-dont-shop/lib.chat
export { ChatService } from './services/chat-service';
export type { ReactionUpdateEvent, ReadStatusUpdateEvent } from './services/chat-service';
export type {
  ChatServiceConfig,
  ChatServiceOptions,
  Conversation,
  Message,
  MessageReaction,
  MessageReadReceipt,
  MessageDeliveryStatus,
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

// Context + provider for React apps
export { ChatProvider } from './context/ChatProvider';
export { useChat } from './context/use-chat';
export type { ChatContextValue, ChatProviderProps, ChatUser } from './context/chat-context-types';
export type {
  ConnectionQuality,
  OfflineAdapter,
  OfflineState,
  OfflineStateListener,
  OfflineSyncCallback,
  PendingAction,
  PendingMessage,
} from './context/offline-adapter';
export type { FeatureFlagsAdapter, ResolveFileUrl } from './context/chat-context-types';

// Presentational components (batch 1 — leaf UI pieces)
// Note: the TypingIndicator event type already occupies that export name
// in `types`, so the component is exported as TypingIndicatorBubble.
export { AvatarComponent } from './components/AvatarComponent';
export { ImageLightbox } from './components/ImageLightbox';
export { PDFPreview } from './components/PDFPreview';
export { ReactionDisplay } from './components/ReactionDisplay';
export { ReactionPicker } from './components/ReactionPicker';
export { ReadReceiptIndicator } from './components/ReadReceiptIndicator';
export { TypingIndicator as TypingIndicatorBubble } from './components/TypingIndicator';

// Utilities
export { safeFormatDistanceToNow } from './utils/date-helpers';
