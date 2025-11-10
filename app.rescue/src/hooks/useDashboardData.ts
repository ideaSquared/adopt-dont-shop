import { useState, useEffect } from 'react';
import { dashboardService } from '../services';
import { RescueDashboardData, RecentActivity, DashboardNotification } from '../types';

interface UseDashboardDataReturn {
  dashboardData: RescueDashboardData | null;
  recentActivities: RecentActivity[];
  notifications: DashboardNotification[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing dashboard data
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [dashboardData, setDashboardData] = useState<RescueDashboardData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [dashboardData, recentActivities, notifications] = await Promise.all([
        dashboardService.getRescueDashboardData(),
        dashboardService.getRecentActivities(),
        dashboardService.getDashboardNotifications(),
      ]);

      setDashboardData(dashboardData);
      setRecentActivities(recentActivities);
      setNotifications(notifications);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    dashboardData,
    recentActivities,
    notifications,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
