/**
 * Dashboard Service for fetching rescue organization dashboard data
 */

import { apiService, notificationsService } from './libraryServices';
import { RescueDashboardData, RecentActivity, DashboardNotification } from '../types/dashboard';

type RawActivity = {
  id: string;
  timestamp: string;
  type: string;
  title?: string;
  description?: string;
  metadata?: {
    petId?: string;
    applicationId?: string;
  };
};

type RawDashboardData = {
  totalApplications?: number;
  pendingApplications?: number;
  adoptedPets?: number;
  totalAnimals?: number;
  availableForAdoption?: number;
  recentAdoptions?: number;
  averageRating?: number;
  averageTimeToAdoption?: number;
  monthlyAdoptions?: RescueDashboardData['monthlyAdoptions'];
  petStatusDistribution?: RescueDashboardData['petStatusDistribution'];
  petTypeDistribution?: RescueDashboardData['petTypeDistribution'];
  recentActivity?: RawActivity[];
};

type RawNotification = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  createdAt: string;
  category?: string;
  status?: string;
  actionUrl?: string;
};

export class DashboardService {
  /**
   * Generate monthly adoptions estimate based on recent adoptions
   */
  private generateMonthlyAdoptionsEstimate(recentAdoptions: number) {
    return [
      { month: 'Jan', adoptions: Math.floor(recentAdoptions * 0.8) },
      { month: 'Feb', adoptions: Math.floor(recentAdoptions * 0.9) },
      { month: 'Mar', adoptions: Math.floor(recentAdoptions * 1.1) },
      { month: 'Apr', adoptions: Math.floor(recentAdoptions * 1.2) },
      { month: 'May', adoptions: Math.floor(recentAdoptions * 1.3) },
      { month: 'Jun', adoptions: recentAdoptions },
    ];
  }

  /**
   * Generate pet type distribution estimate based on total animals
   */
  private generatePetTypeEstimate(totalAnimals: number) {
    return [
      { name: 'Dogs', value: Math.floor(totalAnimals * 0.7) },
      { name: 'Cats', value: Math.floor(totalAnimals * 0.25) },
      { name: 'Other', value: Math.floor(totalAnimals * 0.05) },
    ];
  }

  /**
   * Fetch dashboard data for the current rescue organization
   */
  async getRescueDashboardData(): Promise<RescueDashboardData> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: RawDashboardData;
        message: string;
      }>('/api/v1/dashboard/rescue');

      const backendData = response.data;

      // Transform backend data to match our frontend types
      const totalApplications =
        backendData.totalApplications || backendData.pendingApplications || 0;
      const adoptedPets = backendData.adoptedPets || 0;
      const totalAnimals = backendData.totalAnimals || 0;
      const availableForAdoption = backendData.availableForAdoption || 0;
      const recentAdoptions = backendData.recentAdoptions || 0;

      // Calculate adoption rate from real data
      const adoptionRate = totalAnimals > 0 ? Math.round((adoptedPets / totalAnimals) * 100) : 0;

      return {
        totalPets: totalAnimals,
        successfulAdoptions: recentAdoptions,
        pendingApplications: backendData.pendingApplications || 0,
        averageRating: backendData.averageRating || 4.8,
        adoptionRate: adoptionRate,
        averageResponseTime: backendData.averageTimeToAdoption || 18, // Use real data when available
        totalApplications: totalApplications,
        monthlyAdoptions:
          backendData.monthlyAdoptions || this.generateMonthlyAdoptionsEstimate(recentAdoptions),
        petStatusDistribution: backendData.petStatusDistribution || [
          { name: 'Available', value: availableForAdoption, color: '#10B981' },
          { name: 'Pending', value: backendData.pendingApplications || 0, color: '#F59E0B' },
          {
            name: 'Medical Care',
            value: Math.max(0, totalAnimals - availableForAdoption - adoptedPets - 1),
            color: '#EF4444',
          },
          { name: 'Foster', value: 1, color: '#8B5CF6' }, // Placeholder
        ],
        petTypeDistribution:
          backendData.petTypeDistribution || this.generatePetTypeEstimate(totalAnimals),
      };
    } catch (error) {
      console.error('Failed to fetch rescue dashboard data:', error);
      throw error;
    }
  }

  /**
   * Fetch recent activities for the rescue
   * Uses the dashboard activity endpoint since dedicated activities endpoint doesn't exist yet
   */
  async getRecentActivities(_limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: RawDashboardData;
        message: string;
      }>('/api/v1/dashboard/rescue');

      const activities = response.data.recentActivity || [];

      return activities.map(
        (activity): RecentActivity => ({
          id: activity.id,
          timestamp: new Date(activity.timestamp),
          type: activity.type as RecentActivity['type'],
          message: activity.description || activity.title || '',
          petId: activity.metadata?.petId,
          applicationId: activity.metadata?.applicationId,
        })
      );
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      // Return empty array on error since this is not critical
      return [];
    }
  }

  /**
   * Fetch dashboard notifications for the rescue.
   * @param userId - The authenticated user's ID (from useAuth, not localStorage).
   */
  async getDashboardNotifications(
    userId: string,
    limit: number = 5
  ): Promise<DashboardNotification[]> {
    try {
      if (!userId) {
        return [];
      }

      // Fetch unread notifications from notificationsService
      const response = await notificationsService.getUserNotifications(userId, {
        page: 1,
        limit,
        unreadOnly: true,
      });

      // Transform notifications to DashboardNotification format
      return (response.data as RawNotification[]).map(
        (notification): DashboardNotification => ({
          id: notification.id,
          title: notification.title || 'Notification',
          message: notification.message || notification.body || '',
          timestamp: new Date(notification.createdAt),
          type: (notification.category || 'info') as DashboardNotification['type'],
          read: notification.status === 'read',
          actionUrl: notification.actionUrl,
        })
      );
    } catch (error) {
      console.error('Failed to fetch dashboard notifications:', error);
      // Return empty array on error since this is not critical
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await notificationsService.markAsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
