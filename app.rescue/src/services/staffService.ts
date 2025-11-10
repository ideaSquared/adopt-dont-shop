import { apiService } from './libraryServices';
import { NewStaffMember } from '../types/staff';

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

  /**
   * Add a new staff member to the rescue
   */
  async addStaffMember(staffData: NewStaffMember, rescueId: string): Promise<StaffMember> {
    try {
      const response = await this.apiService.post<{
        success: boolean;
        data: any;
      }>(`/api/v1/rescues/${rescueId}/staff`, staffData);

      if (response.success && response.data) {
        return this.transformStaffMember(response.data);
      }

      // Fallback for different response formats
      if (response.data) {
        return this.transformStaffMember(response.data);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to add staff member:', error);
      throw error;
    }
  }

  /**
   * Remove a staff member from the rescue
   */
  async removeStaffMember(userId: string, rescueId: string): Promise<void> {
    try {
      await this.apiService.delete(`/api/v1/rescues/${rescueId}/staff/${userId}`);
    } catch (error) {
      console.error('Failed to remove staff member:', error);
      throw error;
    }
  }

  /**
   * Update a staff member's information
   */
  async updateStaffMember(userId: string, staffData: { title?: string }, rescueId: string): Promise<StaffMember> {
    try {
      const response = await this.apiService.put<{
        success: boolean;
        data: any;
      }>(`/api/v1/rescues/${rescueId}/staff/${userId}`, staffData);

      if (response.success && response.data) {
        return this.transformStaffMember(response.data);
      }

      // Fallback for different response formats
      if (response.data) {
        return this.transformStaffMember(response.data);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Failed to update staff member:', error);
      throw error;
    }
  }
}

// Export a default instance for easy use
export const staffService = new RescueStaffService();

// Export the class as default for custom configurations
export default RescueStaffService;
