/**
 * Types for @adopt-dont-shop/lib.rescue
 */

/**
 * Rescue organization status
 */
export type RescueStatus = 'pending' | 'verified' | 'suspended' | 'inactive';

/**
 * Rescue organization type
 */
export type RescueType = 'individual' | 'organization';

/**
 * Location information for a rescue
 */
export interface RescueLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Adoption policy configuration for a rescue
 */
export interface AdoptionPolicy {
  requireHomeVisit: boolean;
  requireReferences: boolean;
  minimumReferenceCount: number;
  requireVeterinarianReference: boolean;
  adoptionFeeRange: {
    min: number;
    max: number;
  };
  requirements: string[];
  policies: string[];
  returnPolicy?: string;
  spayNeuterPolicy?: string;
  followUpPolicy?: string;
}

/**
 * Main rescue organization interface
 */
export interface Rescue {
  rescueId: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registrationNumber?: string;
  contactPerson?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: RescueStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  settings?: Record<string, unknown>;
  adoptionPolicies?: AdoptionPolicy;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  verified: boolean;
  location: RescueLocation;
  type: RescueType;
}

/**
 * API response format from backend
 */
export interface RescueAPIResponse {
  rescue_id?: string;
  rescueId?: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  zipCode?: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registration_number?: string;
  registrationNumber?: string;
  contact_person?: string;
  contactPerson?: string;
  contact_title?: string;
  contactTitle?: string;
  contact_email?: string;
  contactEmail?: string;
  contact_phone?: string;
  contactPhone?: string;
  status: RescueStatus;
  verified_at?: string;
  verifiedAt?: string;
  verified_by?: string;
  verifiedBy?: string;
  settings?: Record<string, unknown>;
  is_deleted?: boolean;
  isDeleted?: boolean;
  deleted_at?: string;
  deletedAt?: string;
  deleted_by?: string;
  deletedBy?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  type?: RescueType;
}

/**
 * Search filters for rescue lookup
 */
export interface RescueSearchFilters {
  search?: string;
  type?: RescueType;
  location?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Pagination response structure
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Pet interface (simplified for rescue service use)
 */
export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  size?: string;
  rescueId: string;
  status?: string;
  // Additional pet fields can be added as needed
}

/**
 * Configuration options for RescueService
 */
export interface RescueServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for RescueService operations
 */
export interface RescueServiceOptions {
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Custom headers for the request
   */
  headers?: Record<string, string>;

  /**
   * Whether to retry failed requests
   */
  retry?: boolean;
}
