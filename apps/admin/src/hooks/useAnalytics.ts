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
    // Key lives in the `analytics` namespace so useAnalyticsInvalidator's
    // `invalidateQueries({ queryKey: ['analytics', cat] })` can match it —
    // the previous `['dashboard-analytics', …]` key was a sibling namespace
    // the invalidator could never reach (ADS-647). Real-time refresh still
    // requires the backend to emit a `dashboard` category.
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
