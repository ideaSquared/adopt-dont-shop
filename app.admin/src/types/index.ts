// Type definitions for app.admin

// Basic API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Re-export User types from user.ts
export type { User, AdminUser, UserType, UserStatus } from './user';
import type { User, UserType } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  userType?: UserType;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    totalPages?: number;
  };
  pagination?: {
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    totalPages?: number;
  };
}

// Basic Pet types for admin management
export interface Pet {
  pet_id: string;
  name: string;
  rescue_id: string;
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';
  created_at: string;
  updated_at: string;
}

// Rescue management types
export interface Rescue {
  rescue_id: string;
  rescue_name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

// Admin dashboard types
export interface DashboardStats {
  total_users: number;
  total_rescues: number;
  total_pets: number;
  total_applications: number;
}
