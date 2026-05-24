// Re-export auth types from the canonical shared library
export type { LoginRequest, RegisterRequest, AuthResponse } from '@adopt-dont-shop/lib.auth';
export type { BaseResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';

// Re-export User types from user.ts (admin-specific shape with nullable fields)
export type { User, AdminUser, UserType, UserStatus } from './user';
export { ADMIN_USER_TYPES } from './user';

// App-specific API response wrapper (simpler than BaseResponse for admin pages)
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
};

// Basic Pet types for admin management
export type Pet = {
  pet_id: string;
  name: string;
  rescue_id: string;
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';
  created_at: string;
  updated_at: string;
};

// Rescue management types
export type Rescue = {
  rescue_id: string;
  rescue_name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
};

// Admin dashboard types
export type DashboardStats = {
  total_users: number;
  total_rescues: number;
  total_pets: number;
  total_applications: number;
};
