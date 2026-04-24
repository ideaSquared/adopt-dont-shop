import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider, type DefaultTheme } from 'styled-components';
import { ChatContext } from './context/chat-context';
import type { ChatContextValue } from './context/chat-context-types';
import type { ConnectionQuality } from './context/offline-adapter';
import type { ConnectionStatus, Conversation, Message } from './types';

/**
 * Minimal styled-components theme stub shaped to satisfy the
 * properties the chat UI components actually read. Intentionally
 * does not import the real @adopt-dont-shop/lib.components theme
 * (which is a pre-built ESM bundle and adds module-resolution
 * overhead to jest) — this stub is enough to render components
 * and assert user-visible behavior.
 */
export const testTheme = {
  background: {
    primary: '#ffffff',
    secondary: '#f7f7f8',
    tertiary: '#eeeeee',
    inverse: '#111111',
  },
  border: {
    color: {
      primary: '#d0d0d0',
      secondary: '#e0e0e0',
      tertiary: '#f0f0f0',
    },
    radius: { md: '6px', full: '9999px' },
  },
  text: {
    primary: '#111111',
    secondary: '#555555',
    tertiary: '#888888',
    inverse: '#ffffff',
  },
  colors: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
    },
    secondary: { 100: '#f3f4f6', 500: '#6b7280' },
    neutral: { 100: '#f5f5f5', 300: '#d4d4d4', 400: '#a3a3a3' },
    semantic: {
      error: {
        100: '#fee2e2',
        500: '#ef4444',
        600: '#dc2626',
      },
      warning: { 100: '#fef3c7', 500: '#f59e0b' },
      info: { 100: '#dbeafe', 500: '#3b82f6' },
      success: { 100: '#dcfce7', 500: '#22c55e' },
    },
  },
  transitions: { fast: '0.15s ease' },
  typography: {
    family: { sans: 'system-ui, sans-serif' },
    size: { xs: '11px', sm: '13px', md: '15px' },
    lineHeight: { tight: 1.2 },
    weight: { medium: 500 },
  },
  spacing: {
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
  },
  // The rest of DefaultTheme isn't read by the chat components; cast
  // avoids re-declaring the full shape just to satisfy types.
} as unknown as DefaultTheme;

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
    <ThemeProvider theme={testTheme}>
      <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
    </ThemeProvider>
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
