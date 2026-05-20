import type { ChatService } from '../services/chat-service';
import type { Conversation, Message, ConnectionStatus } from '../types';
import type { ConnectionQuality, OfflineAdapter } from './offline-adapter';

export type ConversationStatus = NonNullable<Conversation['status']>;

/**
 * Minimal authenticated-user shape the provider needs. Apps pass whatever
 * their auth layer exposes so long as it matches this.
 */
export type ChatUser = {
  userId: string;
  firstName?: string;
  /**
   * Set when the viewer is verified rescue staff. Drives badge visibility:
   * staff viewers see other staff's real names with a "Staff" badge,
   * adopter viewers (rescueId undefined) see the rescue's name instead.
   */
  rescueId?: string;
};

/**
 * Optional feature-flag + analytics surface. Apps that use a feature-flag
 * system (e.g. Statsig) pass an adapter; otherwise gates are treated as
 * "on" and events are dropped. Keeps lib.chat free of any specific vendor.
 */
export type FeatureFlagsAdapter = {
  checkGate: (gateName: string) => boolean;
  logEvent: (eventName: string, value?: number, metadata?: Record<string, unknown>) => void;
};

/**
 * Resolves an attachment URL to an absolute URL. Typically used to turn a
 * backend-relative `/uploads/xyz.png` into a fully qualified URL using the
 * app's API base. Apps without this concern can omit the prop.
 */
export type ResolveFileUrl = (url: string | undefined) => string | undefined;

export type ChatContextValue = {
  /** The current authenticated user, or null when logged out. */
  currentUser: ChatUser | null;
  /** Whether the current session is authenticated. */
  isAuthenticated: boolean;
  /** Feature-flag / analytics adapter; always defined — no-ops when the app didn't pass one. */
  featureFlags: FeatureFlagsAdapter;
  /** URL resolver for attachment paths; identity when the app didn't pass one. */
  resolveFileUrl: ResolveFileUrl;

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
  /**
   * Update a conversation's status (e.g. `archived` to mark resolved,
   * `active` to reopen). Optimistically updates local state and
   * persists via the backend.
   */
  updateConversationStatus: (conversationId: string, status: ConversationStatus) => Promise<void>;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  /**
   * Re-send a previously failed message by its client-side id. Reuses the
   * original optimistic bubble (same id), so a late-arriving success from
   * an earlier attempt cannot create a duplicate.
   */
  retryMessage: (messageId: string) => Promise<void>;
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
  /** Optional feature-flag + analytics adapter (e.g. Statsig). */
  featureFlags?: FeatureFlagsAdapter;
  /** Optional attachment URL resolver (e.g. turn `/uploads/x.png` into an absolute URL). */
  resolveFileUrl?: ResolveFileUrl;
};
