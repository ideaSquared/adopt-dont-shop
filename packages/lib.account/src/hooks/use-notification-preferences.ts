import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../services/notification-preferences-service';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: fetchNotificationPreferences,
  });

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      updateNotificationPreferences(preferences),
    // The PUT returns the saved row, so seed the cache with it rather than refetching.
    onSuccess: saved => {
      queryClient.setQueryData(NOTIFICATION_PREFERENCES_QUERY_KEY, saved);
    },
  });
};
