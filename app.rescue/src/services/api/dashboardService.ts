import { apiService } from '../api';

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  totalAnimals: number;
  availableForAdoption: number;
  pendingApplications: number;
  recentAdoptions: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'pet_added' | 'application_received' | 'adoption_completed' | 'status_updated';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

/**
 * Fetch dashboard statistics for the current rescue
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return await apiService.get<DashboardStats>('/api/v1/dashboard/rescue');
};

/**
 * Get recent activity for the rescue dashboard
 */
export const getRecentActivity = async (limit: number = 10): Promise<ActivityItem[]> => {
  return await apiService.get<ActivityItem[]>(`/api/v1/dashboard/activity?limit=${limit}`);
};
