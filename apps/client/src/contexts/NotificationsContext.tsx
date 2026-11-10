import { NotificationsService, Notification } from '@adopt-dont-shop/lib.notifications';
import { apiService } from '@/services/libraryServices';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { z } from 'zod';

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

// The gateway lists notifications as proto JSON: the id is `notificationId` and the link target
// is `relatedEntityType` / `relatedEntityId` rather than an `actionUrl`.
const WireNotificationFieldsSchema = z.object({
  notificationId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION: id => `/applications/${id}`,
  NOTIFICATION_RELATED_ENTITY_TYPE_PET: id => `/pets/${id}`,
  NOTIFICATION_RELATED_ENTITY_TYPE_CONVERSATION: id => `/chat/${id}`,
};

const fromWire = (notification: Notification): Notification => {
  const wire = WireNotificationFieldsSchema.safeParse(notification);
  if (!wire.success) {
    return notification;
  }
  const { notificationId, relatedEntityType, relatedEntityId } = wire.data;
  const toRoute = relatedEntityType ? ENTITY_ROUTES[relatedEntityType] : undefined;
  return {
    ...notification,
    id: notification.id || notificationId || '',
    actionUrl:
      notification.actionUrl ?? (toRoute && relatedEntityId ? toRoute(relatedEntityId) : undefined),
  };
};

const markRead = (notification: Notification): Notification => ({
  ...notification,
  readAt: notification.readAt || new Date().toISOString(),
});

export const NotificationsProvider = ({ children, userId }: NotificationsProviderProps) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['notifications', userId] as const, [userId]);

  const notificationsService = useMemo(() => {
    return new NotificationsService(
      {
        apiUrl: import.meta.env.VITE_API_BASE_URL,
        debug: import.meta.env.DEV,
      },
      apiService
    );
  }, []);

  const notificationsQuery = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      try {
        const response = await notificationsService.getUserNotifications(userId ?? '');
        return (response.data || []).map(fromWire);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        throw error;
      }
    },
  });
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const isLoading = notificationsQuery.isLoading;

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  const updateCached = useCallback(
    (update: (current: Notification[]) => Notification[]) =>
      queryClient.setQueryData<Notification[]>(queryKey, current => update(current ?? [])),
    [queryClient, queryKey]
  );

  // These actions report failures to the console, not the app-wide generic toast, and never reject.
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead([id]),
    onSuccess: (_result, id) =>
      updateCached(current =>
        current.map(notification =>
          notification.id === id ? markRead(notification) : notification
        )
      ),
    onError: error => console.error('Failed to mark notification as read:', error),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: (currentUserId: string) => notificationsService.markAllAsRead(currentUserId),
    onSuccess: () => updateCached(current => current.map(markRead)),
    onError: error => console.error('Failed to mark all notifications as read:', error),
  });

  // Optimistically clear the cache, then delete server-side; restore on failure.
  // Mirrors the rescue context, which deletes per-item via the notifications service.
  const clearAllMutation = useMutation({
    mutationFn: (snapshot: Notification[]) =>
      Promise.all(snapshot.map(n => notificationsService.deleteNotification(n.id))),
    onMutate: () => {
      const snapshot = queryClient.getQueryData<Notification[]>(queryKey) ?? [];
      queryClient.setQueryData<Notification[]>(queryKey, []);
      return { snapshot };
    },
    onError: (error, _snapshot, context) => {
      console.error('Failed to clear all notifications:', error);
      queryClient.setQueryData<Notification[]>(queryKey, context?.snapshot ?? []);
    },
  });

  const { mutateAsync: markAsReadAsync } = markAsReadMutation;
  const { mutateAsync: markAllAsReadAsync } = markAllAsReadMutation;
  const { mutateAsync: clearAllAsync } = clearAllMutation;

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      await markAsReadAsync(id).catch(() => undefined);
    },
    [markAsReadAsync]
  );

  const markAllAsRead = useCallback(
    async (currentUserId: string): Promise<void> => {
      await markAllAsReadAsync(currentUserId).catch(() => undefined);
    },
    [markAllAsReadAsync]
  );

  const clearAll = useCallback(
    async (_currentUserId: string): Promise<void> => {
      await clearAllAsync(notifications).catch(() => undefined);
    },
    [clearAllAsync, notifications]
  );

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
      markAsRead,
      markAllAsRead,
      clearAll,
      isLoading,
    ]
  );

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
};
