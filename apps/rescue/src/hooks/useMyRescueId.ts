import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { staffService } from '../services/staffService';

/**
 * The rescue the signed-in user belongs to. GET /auth/me does not return it,
 * so it comes from the staff membership. `null` while loading or when the user
 * has no rescue.
 */
export const useMyRescueId = (): string | null => {
  const { user } = useAuth();
  const userId = user?.userId;
  const query = useQuery({
    queryKey: ['staff', 'my-rescue-id', userId],
    queryFn: () => staffService.getMyRescueId(),
    enabled: Boolean(userId),
  });
  return query.data ?? null;
};
