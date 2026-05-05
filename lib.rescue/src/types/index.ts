/**
 * Types for @adopt-dont-shop/lib.rescue
 */

export type RescueStatus = 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';

export type RescueType = 'individual' | 'organization';

export type VerificationSource = 'companies_house' | 'charity_commission' | 'manual';

export type RescueLocation = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type AdoptionPolicy = {
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
};

export type Rescue = {
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
  companiesHouseNumber?: string;
  charityRegistrationNumber?: string;
  contactPerson?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: RescueStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationSource?: VerificationSource;
  verificationFailureReason?: string;
  manualVerificationRequestedAt?: string;
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
};

export type RescueAPIResponse = {
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
  companies_house_number?: string;
  companiesHouseNumber?: string;
  charity_registration_number?: string;
  charityRegistrationNumber?: string;
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
  verification_source?: VerificationSource;
  verificationSource?: VerificationSource;
  verification_failure_reason?: string;
  verificationFailureReason?: string;
  manual_verification_requested_at?: string;
  manualVerificationRequestedAt?: string;
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
};

export type RescueSearchFilters = {
  search?: string;
  type?: RescueType;
  location?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  size?: string;
  rescueId: string;
  status?: string;
};

export type RescueServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};

export type RescueServiceOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  retry?: boolean;
};
