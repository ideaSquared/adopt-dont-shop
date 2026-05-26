import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { inboxService } from '../services/inboxService';

/**
 * Returns the count of inbox items assigned to the currently logged-in admin.
 *
 * We hit the existing list endpoint with a 1-item page so the response is small,
 * and read `pagination.total` for the count. The list endpoint does not have a
 * dedicated "open/unresolved" filter that covers all three sources, so this is
 * a rough count of assigned items rather than a strict open-only count.
 */
export const useMyInboxCount = (): { count: number } => {
  const { user } = useAuth();
  const userId = user?.userId;

  const { data } = useQuery({
    queryKey: ['inbox', 'my-queue-count', userId],
    queryFn: () => inboxService.getItems({ assignedTo: userId, limit: 1, page: 1 }),
    enabled: Boolean(userId),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return { count: data?.pagination?.total ?? 0 };
};
