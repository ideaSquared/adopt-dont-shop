import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { dashboardService } from '../services';
import { RescueDashboardData, RecentActivity, DashboardNotification } from '../types';

type UseDashboardDataReturn = {
  dashboardData: RescueDashboardData | null;
  recentActivities: RecentActivity[];
  notifications: DashboardNotification[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const NO_ACTIVITIES: RecentActivity[] = [];
const NO_NOTIFICATIONS: DashboardNotification[] = [];

const toErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null;
  }
  return error instanceof Error ? error.message : 'Failed to fetch dashboard data';
};

/**
 * Custom hook for fetching and managing dashboard data
 */
export function useDashboardData(): UseDashboardDataReturn {
  const { user } = useAuth();
  // Pass userId from auth context — never read from localStorage
  const userId = user?.userId ?? '';

  const query = useQuery({
    queryKey: ['dashboard', userId],
    // Fetch all dashboard data in parallel
    queryFn: async () => {
      const [dashboardData, recentActivities, notifications] = await Promise.all([
        dashboardService.getRescueDashboardData(),
        dashboardService.getRecentActivities(),
        dashboardService.getDashboardNotifications(userId),
      ]);
      return { dashboardData, recentActivities, notifications };
    },
    staleTime: 0,
  });

  return {
    dashboardData: query.data?.dashboardData ?? null,
    recentActivities: query.data?.recentActivities ?? NO_ACTIVITIES,
    notifications: query.data?.notifications ?? NO_NOTIFICATIONS,
    loading: query.isFetching,
    error: toErrorMessage(query.error),
    refetch: async () => {
      await query.refetch();
    },
  };
}
