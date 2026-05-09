import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService, type DashboardAnalyticsOptions } from '../services/analyticsService';

export const usePlatformMetrics = () => {
  return useQuery({
    queryKey: ['platform-metrics'],
    queryFn: () => analyticsService.getPlatformMetrics(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

export const useDashboardAnalytics = (options?: DashboardAnalyticsOptions) => {
  return useQuery({
    queryKey: [
      'dashboard-analytics',
      options?.startDate?.toISOString(),
      options?.endDate?.toISOString(),
    ],
    queryFn: () => analyticsService.getDashboardAnalytics(options),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};
