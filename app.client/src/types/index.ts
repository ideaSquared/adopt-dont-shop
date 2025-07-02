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

// Pet Types
export interface Pet {
  petId: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  size: string;
  gender: string;
  description?: string;
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';
  location?: string;
  photos?: PetPhoto[];
  rescue?: {
    rescueId: string;
    name: string;
    location?: string;
  };
  createdAt: string;
  updatedAt: string;
}

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
  size?: string;
  gender?: string;
  location?: string;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
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
  type: 'individual' | 'organization';
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  location: {
    address?: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}
