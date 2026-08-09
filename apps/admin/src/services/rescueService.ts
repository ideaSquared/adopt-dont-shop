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

import {
  AdoptionPolicySchema,
  type Rescue,
  type RescueAPIResponse,
} from '@adopt-dont-shop/lib.rescue';

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
  RescuePlan,
} from '@/types/rescue';

type UpdatePlanPayload = {
  plan: RescuePlan;
  planExpiresAt?: string | null;
};

// The gateway serves the snake_case rescue view (rescueToView): rescue_id /
// verified_at / created_at, plus the admin-only plan fields. This is that wire
// shape — a superset of lib.rescue's RescueAPIResponse.
type RescueApiView = RescueAPIResponse & {
  plan?: RescuePlan;
  plan_expires_at?: string | null;
  planExpiresAt?: string | null;
  active_listings?: number;
  activeListings?: number;
  staff_count?: number;
  staffCount?: number;
  statistics?: RescueStatistics;
};

// Mirrors lib.rescue's transformRescueFromAPI (snake_case → camelCase),
// extended with the admin-only fields AdminRescue carries. lib.api is pure
// transport (no case conversion), so the admin app must map the view itself.
// activeListings / staffCount are not in the rescue view; they default to 0
// (the admin UI does not read them off the list/detail responses).
const transformRescueFromAPI = (rescue: RescueApiView): AdminRescue => {
  const adoptionPoliciesRaw = rescue.settings?.adoptionPolicies;
  const adoptionPoliciesParsed = AdoptionPolicySchema.safeParse(adoptionPoliciesRaw);
  const adoptionPolicies = adoptionPoliciesParsed.success ? adoptionPoliciesParsed.data : undefined;

  const base: Rescue = {
    rescueId: rescue.rescue_id || rescue.rescueId || '',
    name: rescue.name,
    email: rescue.email,
    phone: rescue.phone,
    address: rescue.address,
    city: rescue.city,
    county: rescue.county,
    postcode: rescue.postcode,
    country: rescue.country,
    website: rescue.website,
    description: rescue.description,
    mission: rescue.mission,
    companiesHouseNumber: rescue.companies_house_number || rescue.companiesHouseNumber,
    charityRegistrationNumber:
      rescue.charity_registration_number || rescue.charityRegistrationNumber,
    contactPerson: rescue.contact_person || rescue.contactPerson || rescue.name,
    contactTitle: rescue.contact_title || rescue.contactTitle,
    contactEmail: rescue.contact_email || rescue.contactEmail,
    contactPhone: rescue.contact_phone || rescue.contactPhone,
    status: rescue.status,
    verifiedAt: rescue.verified_at || rescue.verifiedAt,
    verifiedBy: rescue.verified_by || rescue.verifiedBy,
    verificationSource: rescue.verification_source || rescue.verificationSource,
    verificationFailureReason:
      rescue.verification_failure_reason || rescue.verificationFailureReason,
    manualVerificationRequestedAt:
      rescue.manual_verification_requested_at || rescue.manualVerificationRequestedAt,
    settings: rescue.settings,
    adoptionPolicies,
    isDeleted: rescue.is_deleted || rescue.isDeleted || false,
    deletedAt: rescue.deleted_at || rescue.deletedAt,
    deletedBy: rescue.deleted_by || rescue.deletedBy,
    createdAt: rescue.created_at || rescue.createdAt || '',
    updatedAt: rescue.updated_at || rescue.updatedAt || '',
    verified: rescue.status === 'verified',
    location: {
      address: rescue.address,
      city: rescue.city,
      county: rescue.county,
      postcode: rescue.postcode,
      country: rescue.country,
    },
    type:
      rescue.type ||
      (rescue.companies_house_number ||
      rescue.companiesHouseNumber ||
      rescue.charity_registration_number ||
      rescue.charityRegistrationNumber
        ? 'organization'
        : 'individual'),
  };

  return {
    ...base,
    activeListings: rescue.active_listings ?? rescue.activeListings ?? 0,
    staffCount: rescue.staff_count ?? rescue.staffCount ?? 0,
    plan: rescue.plan,
    planExpiresAt: rescue.plan_expires_at ?? rescue.planExpiresAt ?? null,
    statistics: rescue.statistics,
  };
};

/**
 * Build query parameters from filters
 */
const buildQueryParams = (filters: AdminRescueFilters): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filters.page) {
    params.page = String(filters.page);
  }
  if (filters.limit) {
    params.limit = String(filters.limit);
  }
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.state) {
    params.location = filters.state;
  }
  if (filters.sortBy) {
    params.sortBy = filters.sortBy;
  }
  if (filters.sortOrder) {
    params.sortOrder = filters.sortOrder.toUpperCase();
  }
  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
  }

  return params;
};

/**
 * Admin Rescue Service Class
 */
class AdminRescueService {
  private baseUrl = '/api/v1/rescues';
  // The admin dashboard list has its own offset-paginated, all-statuses
  // endpoint (the public /api/v1/rescues is keyset + verified-only).
  private listUrl = '/api/v1/admin/rescues';

  /**
   * Fetch all rescues with pagination and filtering
   */
  async getAll(filters: AdminRescueFilters = {}): Promise<PaginatedResponse<AdminRescue>> {
    const params = buildQueryParams(filters);

    const response = await apiService.get<{
      success: boolean;
      data: RescueApiView[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages?: number;
        totalPages?: number;
      };
    }>(this.listUrl, params);

    if (!response.success) {
      throw new Error('Failed to fetch rescues');
    }

    const totalPages = response.pagination.totalPages ?? response.pagination.pages ?? 1;
    return {
      data: response.data.map(transformRescueFromAPI),
      pagination: {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages,
        hasNext: response.pagination.page < totalPages,
        hasPrev: response.pagination.page > 1,
      },
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
      data: RescueApiView;
    }>(`${this.baseUrl}/${rescueId}`, params);

    if (!response.success) {
      throw new Error('Failed to fetch rescue');
    }

    return transformRescueFromAPI(response.data);
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
    if (page) {
      params.page = String(page);
    }
    if (limit) {
      params.limit = String(limit);
    }

    const response = await apiService.get<{
      success: boolean;
      data: StaffMember[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages?: number;
        totalPages?: number;
      };
    }>(`${this.baseUrl}/${rescueId}/staff`, params);

    if (!response.success) {
      throw new Error('Failed to fetch staff members');
    }

    const totalPages = response.pagination.totalPages ?? response.pagination.pages ?? 1;
    return {
      data: response.data,
      pagination: {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages,
        hasNext: response.pagination.page < totalPages,
        hasPrev: response.pagination.page > 1,
      },
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

  async updatePlan(rescueId: string, payload: UpdatePlanPayload): Promise<AdminRescue> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: AdminRescue;
    }>(`/api/v1/admin/rescues/${rescueId}/plan`, payload);

    if (!response.success) {
      throw new Error(response.message || 'Failed to update rescue plan');
    }

    return response.data;
  }

  async bulkUpdate(
    rescueIds: string[],
    action: 'approve' | 'suspend' | 'verify',
    reason?: string
  ): Promise<{ successCount: number; failedCount: number }> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: { successCount: number; failedCount: number };
    }>(`${this.baseUrl}/bulk-update`, { rescueIds, action, reason });

    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update rescues');
    }

    return response.data;
  }
}

// Export singleton instance
export const rescueService = new AdminRescueService();
