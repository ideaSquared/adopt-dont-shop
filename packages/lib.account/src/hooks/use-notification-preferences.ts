import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../services/notification-preferences-service';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

// Keyed by user: session expiry and cross-tab logout clear auth state but not
// the query cache, so a shared key could serve one user's preferences to the next.
const queryKeyFor = (userId: string | undefined) =>
  [...NOTIFICATION_PREFERENCES_QUERY_KEY, userId] as const;

export const useNotificationPreferences = () => {
  const userId = useAuth().user?.userId;

  return useQuery({
    queryKey: queryKeyFor(userId),
    queryFn: fetchNotificationPreferences,
    enabled: userId !== undefined,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.userId;

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      updateNotificationPreferences(preferences),
    // The PUT returns the saved row, so seed the cache with it rather than refetching.
    onSuccess: saved => {
      queryClient.setQueryData(queryKeyFor(userId), saved);
    },
  });
};
