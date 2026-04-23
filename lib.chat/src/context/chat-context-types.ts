import type { ChatService } from '../services/chat-service';
import type { Conversation, Message, ConnectionStatus } from '../types';
import type { ConnectionQuality, OfflineAdapter } from './offline-adapter';

/**
 * Minimal authenticated-user shape the provider needs. Apps pass whatever
 * their auth layer exposes so long as it matches this.
 */
export type ChatUser = {
  userId: string;
  firstName?: string;
};

export type ChatContextValue = {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;

  connectionStatus: ConnectionStatus;
  isReconnecting: boolean;
  reconnectionAttempts: number;

  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  pendingMessageCount: number;

  unreadMessageCount: number;

  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  startConversation: (rescueId: string, petId?: string) => Promise<Conversation>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  forceSyncOfflineData: () => Promise<void>;
};

export type ChatProviderProps = {
  children: React.ReactNode;
  /** Pre-configured ChatService from the host app. */
  chatService: ChatService;
  /** Currently authenticated user, or null when logged out. */
  user: ChatUser | null;
  /** Gate: chat only connects when true. */
  isAuthenticated: boolean;
  /** Returns the current auth token (or null) for Socket.IO handshake. */
  tokenProvider: () => string | null;
  /** Optional richer offline behavior. Without it, `navigator.onLine` is used. */
  offlineAdapter?: OfflineAdapter;
};
