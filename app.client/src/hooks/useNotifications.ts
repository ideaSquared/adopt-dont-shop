import notificationService, { NotificationPreferences } from '@/services/notificationService';
import { useCallback, useEffect, useState } from 'react';

export interface UseNotificationsReturn {
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshCount: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Subscribe to unread count changes
  useEffect(() => {
    const unsubscribe = notificationService.onUnreadCountChange(setUnreadCount);
    return unsubscribe;
  }, []);

  // Subscribe to new notifications
  useEffect(() => {
    const unsubscribe = notificationService.onNewNotification(notification => {
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        notificationService.showBrowserNotification(notification.title, notification.message, {
          tag: notification.notification_id,
          requireInteraction: notification.priority === 'urgent',
        });
      }
    });
    return unsubscribe;
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Load unread count and preferences in parallel
        const [count, prefs] = await Promise.allSettled([
          notificationService.getUnreadCount(),
          notificationService.getPreferences(),
        ]);

        if (count.status === 'fulfilled') {
          setUnreadCount(count.value);
        }

        if (prefs.status === 'fulfilled') {
          setPreferences(prefs.value);
        }
      } catch (error) {
        console.error('Failed to load notification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPushPermission();
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<void> => {
      try {
        await notificationService.updatePreferences(prefs);

        // Update local state
        setPreferences(current => (current ? { ...current, ...prefs } : null));
      } catch (error) {
        console.error('Failed to update preferences:', error);
        throw error;
      }
    },
    []
  );

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }, []);

  const refreshCount = useCallback(async (): Promise<void> => {
    try {
      await notificationService.getUnreadCount();
    } catch (error) {
      console.error('Failed to refresh notification count:', error);
    }
  }, []);

  const startPolling = useCallback((intervalMs: number = 30000) => {
    return notificationService.startPolling(intervalMs);
  }, []);

  return {
    unreadCount,
    isLoading,
    preferences,
    requestPermission,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    refreshCount,
    startPolling,
  };
};

export default useNotifications;
