import { NotificationsService, Notification } from '@adopt-dont-shop/lib.notifications';
import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';

interface NotificationsContextType {
  notificationsService: NotificationsService;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  clearAll: () => Promise<void>;
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
      apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
      debug: import.meta.env.DEV,
    });
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  useEffect(() => {
    let cancelled = false;

    const initializeNotifications = async () => {
      if (!userId) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await notificationsService.getUserNotifications(userId, {
          page: 1,
          limit: 50,
          unreadOnly: true,
        });
        if (!cancelled) {
          setNotifications(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load notifications:', error);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initializeNotifications();
    return () => {
      cancelled = true;
    };
  }, [notificationsService, userId]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationsService.markAsRead([id]);
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        throw error;
      }
    },
    [notificationsService]
  );

  const markAllAsRead = useCallback(
    async (currentUserId: string) => {
      try {
        await notificationsService.markAllAsRead(currentUserId);
        setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        throw error;
      }
    },
    [notificationsService]
  );

  const clearAll = useCallback(async () => {
    // Capture the current list inside the callback body to avoid a stale closure
    // when `notifications` changes between renders.
    setNotifications(current => {
      const deletePromises = current.map(n => notificationsService.deleteNotification(n.id));
      Promise.all(deletePromises).catch(error => {
        console.error('Failed to clear all notifications:', error);
      });
      return [];
    });
  }, [notificationsService]);

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

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
};
