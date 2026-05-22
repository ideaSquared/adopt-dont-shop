import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService, type DashboardAnalyticsOptions } from '../services/analyticsService';

// ADS-647: queryKey uses the `analytics` namespace so the existing
// `useAnalyticsInvalidator` (which calls `invalidateQueries({ queryKey:
// ['analytics', cat] })`) refreshes the dashboard KPIs in real time.
export const usePlatformMetrics = () => {
  return useQuery({
    queryKey: ['analytics', 'platform-metrics'],
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
