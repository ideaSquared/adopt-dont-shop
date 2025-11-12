/**
 * Rescue management types for admin dashboard
 *
 * These extend the basic types with admin-specific fields and functionality
 */

import type { Rescue, RescueStatus, AdoptionPolicy } from '@adopt-dont-shop/lib-rescue';

/**
 * Extended rescue type with admin-specific fields
 */
export interface AdminRescue extends Rescue {
  activeListings: number;
  staffCount: number;
  rejectedAt?: string;
  rejectionReason?: string;
  statistics?: RescueStatistics;
}

/**
 * Rescue statistics for analytics
 */
export interface RescueStatistics {
  totalPets: number;
  availablePets: number;
  adoptedPets: number;
  pendingApplications: number;
  totalApplications: number;
  staffCount: number;
  activeListings: number;
  monthlyAdoptions: number;
  averageTimeToAdoption: number;
}

/**
 * Filters for searching and filtering rescues
 */
export interface AdminRescueFilters {
  search?: string;
  status?: RescueStatus;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  state?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'verifiedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Payload for verifying or rejecting a rescue
 */
export interface RescueVerificationPayload {
  status: 'verified' | 'rejected';
  rejectionReason?: string;
  notes?: string;
}

/**
 * Staff member information
 */
export interface StaffMember {
  staffMemberId: string;
  userId: string;
  rescueId: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  isVerified: boolean;
  addedAt: string;
  addedBy?: string;
}

/**
 * Staff invitation
 */
export interface StaffInvitation {
  invitationId: number;
  rescueId: string;
  email: string;
  title?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

/**
 * Payload for adding a staff member
 */
export interface AddStaffPayload {
  userId: string;
  title?: string;
}

/**
 * Payload for inviting a staff member
 */
export interface InviteStaffPayload {
  email: string;
  title?: string;
}

/**
 * Email payload for sending emails to rescues
 */
export interface RescueEmailPayload {
  templateId?: string; // Use a predefined template
  subject?: string; // Required for custom emails
  body?: string; // Required for custom emails
}

/**
 * Paginated response for list operations
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Options for fetching a rescue
 */
export interface GetRescueOptions {
  includeStats?: boolean;
}
