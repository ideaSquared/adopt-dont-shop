import { NotificationsService, Notification } from '@adopt-dont-shop/lib-notifications';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';

interface NotificationsContextType {
  notificationsService: NotificationsService;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  isLoading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: ReactNode;
  userId?: string;
}

export const NotificationsProvider = ({ children, userId }: NotificationsProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const notificationsService = useMemo(() => {
    return new NotificationsService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development',
    });
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Load initial notifications for the user
        const response = await notificationsService.getUserNotifications(userId);
        setNotifications(response.data || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [notificationsService, userId]);

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await notificationsService.markAsRead([id]);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async (currentUserId: string): Promise<void> => {
    try {
      await notificationsService.markAllAsRead(currentUserId);
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const clearAll = async (_currentUserId: string): Promise<void> => {
    try {
      // Note: The service doesn't have a clearAll method, so we'll just clear the local state
      // In a real implementation, you might want to delete notifications one by one
      // or implement a bulk delete endpoint
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  const value = useMemo(
    () => ({
      notificationsService,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      isLoading,
    }),
    [notificationsService, notifications, unreadCount, isLoading]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
