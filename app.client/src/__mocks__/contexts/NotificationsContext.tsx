import { ReactNode, createContext, useContext } from 'react';

const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAsRead: jest.fn(() => Promise.resolve()),
  markAllAsRead: jest.fn(() => Promise.resolve()),
  clearAll: jest.fn(() => Promise.resolve()),
  isLoading: false,
  notificationsService: {} as any,
});

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => (
  <NotificationsContext.Provider
    value={{
      notifications: [],
      unreadCount: 0,
      markAsRead: jest.fn(() => Promise.resolve()),
      markAllAsRead: jest.fn(() => Promise.resolve()),
      clearAll: jest.fn(() => Promise.resolve()),
      isLoading: false,
      notificationsService: {} as any,
    }}
  >
    {children}
  </NotificationsContext.Provider>
);
