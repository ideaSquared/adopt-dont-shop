import { useQuery } from 'react-query';
import { analyticsService, type DashboardAnalyticsOptions } from '../services/analyticsService';

export const usePlatformMetrics = () => {
  return useQuery(['platform-metrics'], () => analyticsService.getPlatformMetrics(), {
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

export const useDashboardAnalytics = (options?: DashboardAnalyticsOptions) => {
  return useQuery(
    ['dashboard-analytics', options?.startDate?.toISOString(), options?.endDate?.toISOString()],
    () => analyticsService.getDashboardAnalytics(options),
    {
      staleTime: 5 * 60_000,
      keepPreviousData: true,
    }
  );
};
