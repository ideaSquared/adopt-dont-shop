import { NotificationsService, Notification } from '@adopt-dont-shop/lib.notifications';
import { apiService } from '@/services/libraryServices';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
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
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
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
// is `relatedEntityType` / `relatedEntityId` (plus `dataJson` for messages) rather than an
// `actionUrl`.
const WireNotificationFieldsSchema = z.object({
  notificationId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  dataJson: z.string().optional(),
});
type WireNotificationFields = z.infer<typeof WireNotificationFieldsSchema>;

// A new-message notification's related entity is the message; the chat it belongs to is in its
// data payload (services/notifications buildChatMessageReceivedCreate).
const MessageDataSchema = z.object({ chatId: z.string().min(1) });

const chatIdFrom = (dataJson: string | undefined): string | undefined => {
  try {
    const parsed = MessageDataSchema.safeParse(JSON.parse(dataJson ?? ''));
    return parsed.success ? parsed.data.chatId : undefined;
  } catch {
    return undefined;
  }
};

const toApplication = ({ relatedEntityId }: WireNotificationFields) =>
  relatedEntityId && `/applications/${relatedEntityId}`;

const ENTITY_ROUTES: Record<string, (wire: WireNotificationFields) => string | undefined> = {
  NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION: toApplication,
  // Home visit and adoption updates carry the application id as their related entity.
  NOTIFICATION_RELATED_ENTITY_TYPE_HOME_VISIT: toApplication,
  NOTIFICATION_RELATED_ENTITY_TYPE_ADOPTION: toApplication,
  NOTIFICATION_RELATED_ENTITY_TYPE_PET: ({ relatedEntityId }) =>
    relatedEntityId && `/pets/${relatedEntityId}`,
  NOTIFICATION_RELATED_ENTITY_TYPE_CONVERSATION: ({ relatedEntityId }) =>
    relatedEntityId && `/chat/${relatedEntityId}`,
  NOTIFICATION_RELATED_ENTITY_TYPE_MESSAGE: ({ dataJson }) => {
    const chatId = chatIdFrom(dataJson);
    return chatId && `/chat/${chatId}`;
  },
};

const fromWire = (notification: Notification): Notification => {
  const wire = WireNotificationFieldsSchema.safeParse(notification);
  if (!wire.success) {
    return notification;
  }
  const toRoute = wire.data.relatedEntityType
    ? ENTITY_ROUTES[wire.data.relatedEntityType]
    : undefined;
  return {
    ...notification,
    id: notification.id || wire.data.notificationId || '',
    actionUrl: notification.actionUrl ?? (toRoute?.(wire.data) || undefined),
  };
};

type NotificationsPage = { items: Notification[]; hasNext: boolean };
type CachedNotifications = InfiniteData<NotificationsPage, number>;

const mapItems = (
  cached: CachedNotifications | undefined,
  update: (current: Notification[]) => Notification[]
): CachedNotifications | undefined =>
  cached && {
    ...cached,
    pages: cached.pages.map(page => ({ ...page, items: update(page.items) })),
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

  const notificationsQuery = useInfiniteQuery({
    queryKey,
    enabled: !!userId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<NotificationsPage> => {
      try {
        const response =
          pageParam > 1
            ? await notificationsService.getUserNotifications(userId ?? '', { page: pageParam })
            : await notificationsService.getUserNotifications(userId ?? '');
        return {
          items: (response.data || []).map(fromWire),
          hasNext: response.pagination?.hasNext ?? false,
        };
      } catch (error) {
        console.error('Failed to load notifications:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flatMap(page => page.items) ?? [],
    [notificationsQuery.data]
  );
  const isLoading = notificationsQuery.isLoading;
  const hasMore = notificationsQuery.hasNextPage;
  const isLoadingMore = notificationsQuery.isFetchingNextPage;
  const { fetchNextPage } = notificationsQuery;
  const loadMore = useCallback(async (): Promise<void> => {
    await fetchNextPage();
  }, [fetchNextPage]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.readAt).length;
  }, [notifications]);

  const updateCached = useCallback(
    (update: (current: Notification[]) => Notification[]) =>
      queryClient.setQueryData<CachedNotifications>(queryKey, cached => mapItems(cached, update)),
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
      const snapshot = queryClient.getQueryData<CachedNotifications>(queryKey);
      queryClient.setQueryData<CachedNotifications>(queryKey, cached => mapItems(cached, () => []));
      return { snapshot };
    },
    onError: (error, _snapshot, context) => {
      console.error('Failed to clear all notifications:', error);
      queryClient.setQueryData<CachedNotifications>(queryKey, context?.snapshot);
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
      hasMore,
      isLoadingMore,
      loadMore,
    }),
    [
      notificationsService,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      isLoading,
      hasMore,
      isLoadingMore,
      loadMore,
    ]
  );

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
};
