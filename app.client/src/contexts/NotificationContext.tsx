import { useAuth } from '@adopt-dont-shop/lib.auth';
import { createAppContext, handleAsyncAction } from '@/contexts/base/BaseContext';
import { useSubscription } from '@/contexts/base/hooks';
import notificationService, {
  type Notification,
  type NotificationPreferences,
} from '@/services/notificationService';
import React, { useCallback, useEffect, useState } from 'react';

interface NotificationContextType {
  // State
  unreadCount: number;
  recentNotifications: Notification[];
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshUnreadCount: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;

  // Subscription management
  startPolling: (intervalMs?: number) => () => void;
  refreshCount: () => Promise<void>; // Alias for refreshUnreadCount for compatibility
}

const [NotificationContext, useNotifications] =
  createAppContext<NotificationContextType>('Notification');

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  // Core state
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time unread count changes
  const unreadCount = useSubscription(
    useCallback(
      (callback: (count: number) => void) => notificationService.onUnreadCountChange(callback),
      []
    ),
    0
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    await handleAsyncAction(() => notificationService.getUnreadCount(), {
      setError,
      onError: error => console.error('Failed to refresh unread count:', error),
    });
  }, []);

  const refreshNotifications = useCallback(async (): Promise<void> => {
    const result = await handleAsyncAction(
      () => notificationService.getNotifications({ limit: 6, status: undefined }),
      {
        setError,
        onError: error => console.error('Failed to refresh notifications:', error),
      }
    );

    if (result) {
      setRecentNotifications(result.notifications);
    }
  }, []);

  const refreshPreferences = useCallback(async (): Promise<void> => {
    const result = await handleAsyncAction(() => notificationService.getPreferences(), {
      setError,
      onError: error => console.error('Failed to refresh preferences:', error),
    });

    if (result) {
      setPreferences(result);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      // Optimistic update
      setRecentNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );

      const success = await handleAsyncAction(
        () => notificationService.markAsRead(notificationId),
        {
          setError,
          onError: error => {
            console.error('Failed to mark notification as read:', error);
            // Revert optimistic update
            setRecentNotifications(prev =>
              prev.map(n =>
                n.notification_id === notificationId ? { ...n, read_at: undefined } : n
              )
            );
          },
        }
      );

      if (success) {
        // Refresh unread count after successful mark as read
        await refreshUnreadCount();
      }
    },
    [refreshUnreadCount]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    // Optimistic update
    const originalNotifications = recentNotifications;
    setRecentNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );

    const success = await handleAsyncAction(() => notificationService.markAllAsRead(), {
      setError,
      onError: error => {
        console.error('Failed to mark all notifications as read:', error);
        // Revert optimistic update
        setRecentNotifications(originalNotifications);
      },
    });

    if (success) {
      // The unread count will be updated via the subscription
    }
  }, [recentNotifications]);

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<void> => {
      // Optimistic update
      const originalPreferences = preferences;
      setPreferences(current => (current ? { ...current, ...prefs } : null));

      const success = await handleAsyncAction(() => notificationService.updatePreferences(prefs), {
        setError,
        onError: error => {
          console.error('Failed to update preferences:', error);
          // Revert optimistic update
          setPreferences(originalPreferences);
        },
      });

      if (success) {
        // Refresh preferences to ensure sync
        await refreshPreferences();
      }
    },
    [preferences, refreshPreferences]
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const result = await handleAsyncAction(() => notificationService.requestPushPermission(), {
      setError,
      onError: error => console.error('Failed to request permission:', error),
    });

    return result ?? false;
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    // Add to recent notifications
    setRecentNotifications(prev => [notification, ...prev.slice(0, 5)]);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      notificationService.showBrowserNotification(notification.title, notification.message, {
        icon: '/favicon.ico',
        tag: notification.notification_id,
        requireInteraction: notification.priority === 'urgent',
      });
    }
  }, []);

  const startPolling = useCallback((intervalMs: number = 60000) => {
    return notificationService.startPolling(intervalMs);
  }, []);

  // Alias for compatibility with existing hook usage
  const refreshCount = refreshUnreadCount;

  // Initialize data when authenticated user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      // Clear state when not authenticated
      setRecentNotifications([]);
      setPreferences(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([refreshUnreadCount(), refreshNotifications(), refreshPreferences()]);
      } catch (error) {
        console.error('Failed to initialize notification data:', error);
        setError('Failed to load notification data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();

    // Subscribe to new notifications
    const unsubscribeNew = notificationService.onNewNotification(addNotification);

    // Start polling for updates
    const stopPolling = notificationService.startPolling(60000);

    return () => {
      unsubscribeNew();
      stopPolling();
    };
  }, [
    isAuthenticated,
    user?.userId,
    refreshUnreadCount,
    refreshNotifications,
    refreshPreferences,
    addNotification,
  ]);

  const value: NotificationContextType = {
    unreadCount,
    recentNotifications,
    preferences,
    isLoading,
    error,
    refreshUnreadCount,
    refreshNotifications,
    refreshPreferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    requestPermission,
    addNotification,
    clearError,
    startPolling,
    refreshCount,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export { useNotifications };
export type { NotificationContextType };
export default NotificationContext;
