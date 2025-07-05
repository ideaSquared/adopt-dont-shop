// User and Authentication Types
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'both';
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  preferences?: {
    petTypes?: string[];
    maxDistance?: number;
    newsletterOptIn?: boolean;
  };
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Pet Types - Updated to match backend API response
export interface Pet {
  pet_id: string;
  name: string;
  rescue_id: string;
  short_description: string;
  long_description: string;
  age_years: number;
  age_months: number;
  age_group: 'young' | 'adult' | 'senior';
  gender: 'male' | 'female';
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed: string;
  secondary_breed?: string;
  weight_kg: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  color: string;
  markings?: string;
  microchip_id: string;
  archived: boolean;
  featured: boolean;
  priority_listing: boolean;
  adoption_fee: string;
  special_needs: boolean;
  special_needs_description?: string;
  house_trained: boolean;
  good_with_children?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  good_with_small_animals?: boolean;
  energy_level: 'low' | 'medium' | 'high' | 'very_high';
  exercise_needs: string;
  grooming_needs: string;
  training_notes?: string;
  temperament: string[];
  medical_notes?: string;
  behavioral_notes?: string;
  surrender_reason?: string;
  intake_date: string;
  vaccination_status: 'unknown' | 'partial' | 'up_to_date';
  vaccination_date?: string;
  spay_neuter_status: 'unknown' | 'intact' | 'spayed' | 'neutered';
  spay_neuter_date?: string;
  last_vet_checkup?: string;
  images: PetImage[];
  videos: PetVideo[];
  location: {
    type: string;
    coordinates: [number, number];
    crs?: {
      type: string;
      properties: {
        name: string;
      };
    };
  };
  available_since: string;
  adopted_date?: string;
  foster_start_date?: string;
  foster_end_date?: string;
  view_count: number;
  favorite_count: number;
  application_count: number;
  search_vector: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PetImage {
  url: string;
  caption?: string;
  image_id: string;
  is_primary: boolean;
  order_index: number;
  uploaded_at: string;
  thumbnail_url?: string;
}

export interface PetVideo {
  url: string;
  caption?: string;
  video_id: string;
  order_index: number;
  uploaded_at: string;
  thumbnail_url?: string;
}

// Legacy interface for backward compatibility - maps new structure to old
export interface PetPhoto {
  photoId: string;
  url: string;
  isPrimary: boolean;
  caption?: string;
  order: number;
}

export interface PetSearchFilters {
  search?: string;
  type?: string;
  breed?: string;
  age?: {
    min?: number;
    max?: number;
  };
  ageGroup?: string;
  size?: string;
  gender?: string;
  status?: string;
  location?: string;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response Types - Updated to match backend format
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Application Types
export interface Application {
  applicationId: string;
  petId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submittedAt: string;
  updatedAt: string;
  pet?: Pet;
  user?: User;
}

// Rescue Types
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
  contactPerson: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'pending' | 'verified' | 'suspended' | 'inactive';
  verifiedAt?: string;
  verifiedBy?: string;
  settings?: {
    autoApproveApplications?: boolean;
    requireHomeVisit?: boolean;
    allowPublicContact?: boolean;
    adoptionFeeRange?: { min: number; max: number };
    [key: string]: unknown;
  };
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Computed properties for backwards compatibility
  verified: boolean;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  type: 'individual' | 'organization';
}
