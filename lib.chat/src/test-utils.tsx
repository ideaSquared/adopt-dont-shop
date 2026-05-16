import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ChatContext } from './context/chat-context';
import type { ChatContextValue } from './context/chat-context-types';
import type { ConnectionQuality } from './context/offline-adapter';
import type { ConnectionStatus, Conversation, Message } from './types';

export const buildChatContextValue = (
  overrides: Partial<ChatContextValue> = {}
): ChatContextValue => ({
  currentUser: { userId: 'user-1', firstName: 'Alice' },
  isAuthenticated: true,
  featureFlags: { checkGate: () => true, logEvent: () => {} },
  resolveFileUrl: (u) => u,
  conversations: [],
  activeConversation: null,
  messages: [],
  isConnected: true,
  isLoading: false,
  error: null,
  typingUsers: [],
  hasMoreMessages: false,
  isLoadingMoreMessages: false,
  connectionStatus: 'connected' as ConnectionStatus,
  isReconnecting: false,
  reconnectionAttempts: 0,
  isOnline: true,
  connectionQuality: 'excellent' as ConnectionQuality,
  pendingMessageCount: 0,
  unreadMessageCount: 0,
  setActiveConversation: () => {},
  sendMessage: async () => {},
  retryMessage: async () => {},
  markAsRead: async () => {},
  loadConversations: async () => {},
  loadMessages: async () => {},
  loadMoreMessages: async () => {},
  startConversation: async () => ({}) as Conversation,
  startTyping: () => {},
  stopTyping: () => {},
  toggleReaction: () => {},
  forceSyncOfflineData: async () => {},
  ...overrides,
});

export const renderWithChatContext = (
  ui: ReactElement,
  { value, ...options }: { value: ChatContextValue } & Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

export const buildTestConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  participants: [],
  unreadCount: 0,
  updatedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  isActive: true,
  ...overrides,
});

export const buildTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-other',
  senderName: 'Other User',
  content: 'Hello',
  timestamp: '2026-01-01T00:00:01Z',
  type: 'text',
  status: 'sent',
  ...overrides,
});
