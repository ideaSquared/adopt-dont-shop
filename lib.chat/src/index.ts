// Main exports for @adopt-dont-shop/lib.chat
export { ChatService } from './services/chat-service';
export type { ReactionUpdateEvent, ReadStatusUpdateEvent } from './services/chat-service';

// Export schemas for consumers that need runtime validation
export * from './schemas';

// Re-export non-schema types from types module
export type {
  ChatServiceConfig,
  ChatServiceOptions,
  QueuedMessage,
  BaseResponse,
  ErrorResponse,
  PaginatedResponse,
} from './types';

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
export type {
  ChatContextValue,
  ChatProviderProps,
  ChatUser,
  ConversationStatus,
} from './context/chat-context-types';
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

// Chat UI components
// Note: the TypingIndicator event type already occupies that export name
// in `types`, so the component is exported as TypingIndicatorBubble.
export { AvatarComponent } from './components/AvatarComponent';
export { ChatWindow } from './components/ChatWindow';
export { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
export { ConversationList } from './components/ConversationList';
export type { ConversationListFilter } from './components/ConversationList';
export { ImageLightbox } from './components/ImageLightbox';
export { MessageBubbleComponent } from './components/MessageBubbleComponent';
export { MessageInput } from './components/MessageInput';
export { MessageItemComponent } from './components/MessageItemComponent';
export { MessageList } from './components/MessageList';
export { PDFPreview } from './components/PDFPreview';
export { ReactionDisplay } from './components/ReactionDisplay';
export { ReactionPicker } from './components/ReactionPicker';
export { ReadReceiptIndicator } from './components/ReadReceiptIndicator';
export { TypingIndicator as TypingIndicatorBubble } from './components/TypingIndicator';

// Utilities
export { safeFormatDistanceToNow } from './utils/date-helpers';
