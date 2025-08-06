/**
 * Dashboard Service for fetching rescue organization dashboard data
 */

import { apiService } from './api';
import { isDevelopment, getApiBaseUrl } from '../utils/env';
import { RescueDashboardData, RecentActivity, DashboardNotification } from '../types/dashboard';

export class DashboardService {
  /**
   * Fetch dashboard data for the current rescue organization
   */
  async getRescueDashboardData(): Promise<RescueDashboardData> {
    try {
      // Debug: Log authentication status
      const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
      if (isDevelopment()) {
        console.log('🔐 Dashboard API Call - Token exists:', !!token);
        console.log(
          '🔐 Dashboard API Call - Token preview:',
          token ? `${token.substring(0, 20)}...` : 'none'
        );
        console.log('🐋 Docker Environment - API Base URL:', getApiBaseUrl());
      }

      const response = await apiService.get<{
        success: boolean;
        data: any;
        message: string;
      }>('/api/v1/dashboard/rescue');

      const backendData = response.data;

      if (isDevelopment()) {
        console.log('📊 Dashboard Backend Data:', backendData);
        console.log('📊 Data fields received:', Object.keys(backendData));
        console.log('📊 Is this real data?', {
          totalAnimals: backendData.totalAnimals,
          hasRealStats: backendData.totalAnimals !== 12, // 12 was the old mock value
          hasStaffCount: !!backendData.staffCount,
          hasAverageTime: !!backendData.averageTimeToAdoption,
        });
      }

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
        averageRating: 4.8, // TODO: Calculate from reviews when implemented
        adoptionRate: adoptionRate,
        averageResponseTime: backendData.averageTimeToAdoption || 18, // Use real data when available
        totalApplications: totalApplications,
        monthlyAdoptions: [
          // TODO: Replace with real monthly data from backend
          { month: 'Jan', adoptions: Math.floor(recentAdoptions * 0.8) },
          { month: 'Feb', adoptions: Math.floor(recentAdoptions * 0.9) },
          { month: 'Mar', adoptions: Math.floor(recentAdoptions * 1.1) },
          { month: 'Apr', adoptions: Math.floor(recentAdoptions * 1.2) },
          { month: 'May', adoptions: Math.floor(recentAdoptions * 1.3) },
          { month: 'Jun', adoptions: recentAdoptions },
        ],
        petStatusDistribution: [
          { name: 'Available', value: availableForAdoption, color: '#10B981' },
          { name: 'Pending', value: backendData.pendingApplications || 0, color: '#F59E0B' },
          // TODO: Get real data for these statuses from backend
          {
            name: 'Medical Care',
            value: Math.max(0, totalAnimals - availableForAdoption - adoptedPets - 1),
            color: '#EF4444',
          },
          { name: 'Foster', value: 1, color: '#8B5CF6' }, // Placeholder
        ],
        petTypeDistribution: [
          // TODO: Get real pet type distribution from backend
          { name: 'Dogs', value: Math.floor(totalAnimals * 0.7) },
          { name: 'Cats', value: Math.floor(totalAnimals * 0.25) },
          { name: 'Other', value: Math.floor(totalAnimals * 0.05) },
        ],
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
        data: any;
        message: string;
      }>('/api/v1/dashboard/rescue');

      const activities = response.data.recentActivity || [];

      return activities.map((activity: any) => ({
        id: activity.id,
        timestamp: new Date(activity.timestamp),
        type: activity.type as RecentActivity['type'],
        message: activity.description || activity.title,
        petId: activity.metadata?.petId,
        applicationId: activity.metadata?.applicationId,
      }));
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      // Return empty array on error since this is not critical
      return [];
    }
  }

  /**
   * Fetch dashboard notifications for the rescue
   * Returns empty array since backend endpoint doesn't exist yet
   */
  async getDashboardNotifications(_limit: number = 5): Promise<DashboardNotification[]> {
    try {
      // Backend endpoint doesn't exist yet, return empty array
      return [];
    } catch (error) {
      console.error('Failed to fetch dashboard notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * Placeholder until backend endpoint is implemented
   */
  async markNotificationAsRead(_notificationId: string): Promise<void> {
    // Backend endpoint doesn't exist yet
    console.log('markNotificationAsRead: Backend endpoint not implemented yet');
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
