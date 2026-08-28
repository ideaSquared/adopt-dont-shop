import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService, type DashboardAnalyticsOptions } from '../services/analyticsService';

// queryKey sits under the `analytics` namespace (ADS-647), grouping the
// dashboard KPI queries. (The realtime `useAnalyticsInvalidator` this
// alignment once fed was removed as inert in ADS-1254.)
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
    // Key lives under the `analytics` namespace (not the old sibling
    // `['dashboard-analytics', …]`) so dashboard queries group together
    // (ADS-647). The realtime invalidator this alignment once fed was
    // removed as inert in ADS-1254.
    queryKey: [
      'analytics',
      'dashboard',
      options?.startDate?.toISOString(),
      options?.endDate?.toISOString(),
    ],
    queryFn: () => analyticsService.getDashboardAnalytics(options),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
};
