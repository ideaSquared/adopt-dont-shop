/**
 * Mock providers for testing
 * These provide minimal implementations to avoid complex dependencies in tests
 */

import { ReactNode, createContext } from 'react';

// Mock NotificationsProvider
const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  clearAll: jest.fn(),
  isLoading: false,
  notificationsService: {} as any,
});

export const NotificationsProvider = ({ children }: { children: ReactNode }) => (
  <NotificationsContext.Provider
    value={{
      notifications: [],
      unreadCount: 0,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      clearAll: jest.fn(),
      isLoading: false,
      notificationsService: {} as any,
    }}
  >
    {children}
  </NotificationsContext.Provider>
);

// Mock ChatProvider
const ChatContext = createContext({
  messages: [],
  sendMessage: jest.fn(),
  isConnected: true,
});

export const ChatProvider = ({ children }: { children: ReactNode }) => (
  <ChatContext.Provider
    value={{
      messages: [],
      sendMessage: jest.fn(),
      isConnected: true,
    }}
  >
    {children}
  </ChatContext.Provider>
);

// Mock FavoritesProvider
const FavoritesContext = createContext({
  favorites: [],
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  isFavorite: jest.fn(() => false),
});

export const FavoritesProvider = ({ children }: { children: ReactNode }) => (
  <FavoritesContext.Provider
    value={{
      favorites: [],
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      isFavorite: jest.fn(() => false),
    }}
  >
    {children}
  </FavoritesContext.Provider>
);

// Mock PermissionsProvider
const PermissionsContext = createContext({
  hasPermission: jest.fn(() => true),
  permissions: [],
  isLoading: false,
});

export const PermissionsProvider = ({ children }: { children: ReactNode }) => (
  <PermissionsContext.Provider
    value={{
      hasPermission: jest.fn(() => true),
      permissions: [],
      isLoading: false,
    }}
  >
    {children}
  </PermissionsContext.Provider>
);

// Mock AnalyticsProvider
const AnalyticsContext = createContext({
  track: jest.fn(),
  page: jest.fn(),
  identify: jest.fn(),
});

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => (
  <AnalyticsContext.Provider
    value={{
      track: jest.fn(),
      page: jest.fn(),
      identify: jest.fn(),
    }}
  >
    {children}
  </AnalyticsContext.Provider>
);
