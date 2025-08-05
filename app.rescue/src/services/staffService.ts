import { apiService } from './api';

export interface StaffMember {
  id: string;
  userId: string;
  rescueId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  isVerified: boolean;
  addedAt: string;
}

/**
 * Staff Service for Rescue App
 * Uses the configured API service with authentication
 */
export class RescueStaffService {
  private apiService: typeof apiService;

  constructor(customApiService?: typeof apiService) {
    this.apiService = customApiService || apiService;
  }

  /**
   * Get staff members for the current user's rescue
   */
  async getRescueStaff(): Promise<StaffMember[]> {
    try {
      const response = await this.apiService.get<{
        success: boolean;
        data: any[];
      }>(`/api/v1/staff/colleagues`);

      if (response.success && Array.isArray(response.data)) {
        return response.data.map(this.transformStaffMember);
      }

      // Fallback for different response formats
      if (Array.isArray(response)) {
        return response.map(this.transformStaffMember);
      }

      return [];
    } catch (error) {
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Transform staff member data from API format
   */
  private transformStaffMember = (staff: any): StaffMember => {
    return {
      id: staff.id || staff.staffId,
      userId: staff.userId || staff.user_id,
      rescueId: staff.rescueId || staff.rescue_id,
      firstName: staff.firstName || staff.first_name || staff.user?.firstName || 'Unknown',
      lastName: staff.lastName || staff.last_name || staff.user?.lastName || 'User',
      email: staff.email || staff.user?.email || '',
      title: staff.title || 'Staff Member',
      isVerified: staff.isVerified || staff.is_verified || false,
      addedAt: staff.addedAt || staff.added_at || staff.createdAt || staff.created_at,
    };
  };
}

// Export a default instance for easy use
export const staffService = new RescueStaffService();

// Export the class as default for custom configurations
export default RescueStaffService;
