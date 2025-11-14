import { NotificationsService, Notification } from '@adopt-dont-shop/lib.notifications';
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
        const response = await notificationsService.getUserNotifications(userId, {
          page: 1,
          limit: 50,
          unreadOnly: true,
        });
        setNotifications(response.data || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [notificationsService, userId]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead([id]);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async (currentUserId: string) => {
    try {
      await notificationsService.markAllAsRead(currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const clearAll = async () => {
    try {
      // Delete all notifications for the user
      const deletePromises = notifications.map(n => notificationsService.deleteNotification(n.id));
      await Promise.all(deletePromises);
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw error;
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
    [
      notificationsService,
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      clearAll,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
