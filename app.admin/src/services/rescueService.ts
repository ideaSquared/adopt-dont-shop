/**
 * Admin Rescue Service
 *
 * Handles all rescue-related operations for the admin dashboard.
 * Uses a hybrid approach: lib-rescue for standard operations,
 * admin-specific service for admin-only endpoints.
 *
 * Following functional programming principles:
 * - Immutable data handling
 * - Pure functions where possible
 * - Clear error handling
 */

import { RescueService as LibRescueService } from '@adopt-dont-shop/lib.rescue';
import { apiService } from './libraryServices';
import type {
  AdminRescue,
  AdminRescueFilters,
  RescueVerificationPayload,
  StaffMember,
  StaffInvitation,
  AddStaffPayload,
  InviteStaffPayload,
  RescueEmailPayload,
  PaginatedResponse,
  RescueStatistics,
  GetRescueOptions,
} from '@/types/rescue';

/**
 * Build query parameters from filters
 */
const buildQueryParams = (filters: AdminRescueFilters): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.state) params.location = filters.state;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder.toUpperCase();
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  return params;
};

/**
 * Admin Rescue Service Class
 */
class AdminRescueService {
  private libRescueService: LibRescueService;
  private baseUrl = '/api/v1/rescues';

  constructor() {
    this.libRescueService = new LibRescueService(apiService);
  }

  /**
   * Fetch all rescues with pagination and filtering
   */
  async getAll(filters: AdminRescueFilters = {}): Promise<PaginatedResponse<AdminRescue>> {
    const params = buildQueryParams(filters);

    const response = await apiService.get<{
      success: boolean;
      data: AdminRescue[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(this.baseUrl, params);

    if (!response.success) {
      throw new Error('Failed to fetch rescues');
    }

    return {
      data: response.data,
      pagination: response.pagination,
    };
  }

  /**
   * Fetch a single rescue by ID
   */
  async getById(rescueId: string, options: GetRescueOptions = {}): Promise<AdminRescue> {
    const params: Record<string, string> = {};
    if (options.includeStats) {
      params.includeStats = 'true';
    }

    const response = await apiService.get<{
      success: boolean;
      data: AdminRescue;
    }>(`${this.baseUrl}/${rescueId}`, params);

    if (!response.success) {
      throw new Error('Failed to fetch rescue');
    }

    return response.data;
  }

  /**
   * Verify a rescue organization
   */
  async verify(rescueId: string, payload: RescueVerificationPayload): Promise<AdminRescue> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: AdminRescue;
    }>(`${this.baseUrl}/${rescueId}/verify`, {
      notes: payload.notes,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to verify rescue');
    }

    return response.data;
  }

  /**
   * Reject a rescue organization
   */
  async reject(rescueId: string, payload: RescueVerificationPayload): Promise<AdminRescue> {
    // Note: Backend might not have a separate reject endpoint
    // It may use the verify endpoint with a status change
    // Adjust based on actual backend implementation
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: AdminRescue;
    }>(`${this.baseUrl}/${rescueId}/reject`, {
      reason: payload.rejectionReason,
      notes: payload.notes,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to reject rescue');
    }

    return response.data;
  }

  /**
   * Get staff members for a rescue
   */
  async getStaff(rescueId: string, page = 1, limit = 20): Promise<PaginatedResponse<StaffMember>> {
    const params: Record<string, string> = {};
    if (page) params.page = String(page);
    if (limit) params.limit = String(limit);

    const response = await apiService.get<{
      success: boolean;
      data: StaffMember[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`${this.baseUrl}/${rescueId}/staff`, params);

    if (!response.success) {
      throw new Error('Failed to fetch staff members');
    }

    return {
      data: response.data,
      pagination: response.pagination,
    };
  }

  /**
   * Add a staff member to a rescue
   */
  async addStaff(rescueId: string, payload: AddStaffPayload): Promise<StaffMember> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: StaffMember;
    }>(`${this.baseUrl}/${rescueId}/staff`, payload);

    if (!response.success) {
      throw new Error(response.message || 'Failed to add staff member');
    }

    return response.data;
  }

  /**
   * Remove a staff member from a rescue
   */
  async removeStaff(rescueId: string, userId: string): Promise<void> {
    const response = await apiService.delete<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/${rescueId}/staff/${userId}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to remove staff member');
    }
  }

  /**
   * Get pending invitations for a rescue
   */
  async getInvitations(rescueId: string): Promise<StaffInvitation[]> {
    const response = await apiService.get<{
      success: boolean;
      data: StaffInvitation[];
    }>(`${this.baseUrl}/${rescueId}/invitations`);

    console.log('getInvitations response:', response);

    if (!response.success) {
      throw new Error('Failed to fetch invitations');
    }

    return response.data;
  }

  /**
   * Invite a staff member to a rescue
   */
  async inviteStaff(rescueId: string, payload: InviteStaffPayload): Promise<StaffInvitation> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: StaffInvitation;
    }>(`${this.baseUrl}/${rescueId}/invitations`, payload);

    console.log('inviteStaff response:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to send invitation');
    }

    return response.data;
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(rescueId: string, invitationId: number): Promise<void> {
    const response = await apiService.delete<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/${rescueId}/invitations/${invitationId}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel invitation');
    }
  }

  /**
   * Get analytics for a rescue
   */
  async getAnalytics(rescueId: string): Promise<RescueStatistics> {
    const response = await apiService.get<{
      success: boolean;
      data: RescueStatistics;
    }>(`${this.baseUrl}/${rescueId}/analytics`);

    if (!response.success) {
      throw new Error('Failed to fetch analytics');
    }

    return response.data;
  }

  /**
   * Send an email to a rescue
   */
  async sendEmail(rescueId: string, payload: RescueEmailPayload): Promise<void> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/${rescueId}/send-email`, payload);

    if (!response.success) {
      throw new Error(response.message || 'Failed to send email');
    }
  }

  /**
   * Delete a rescue (soft delete)
   */
  async delete(rescueId: string, reason?: string): Promise<void> {
    const response = await apiService.delete<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/${rescueId}`, reason ? { reason } : undefined);

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete rescue');
    }
  }
}

// Export singleton instance
export const rescueService = new AdminRescueService();
