// API-specific type definitions

import type { User, Rescue, StaffMember } from './auth';

// Authentication API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  rescue?: Rescue;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// User API types
export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Rescue API types
export interface UpdateRescueRequest {
  rescue_name?: string;
  rescue_type?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  description?: string;
  logo_url?: string;
}

export interface UpdateRescueSettingsRequest {
  application_auto_approve?: boolean;
  application_require_home_visit?: boolean;
  application_require_references?: boolean;
  notification_email_enabled?: boolean;
  notification_sms_enabled?: boolean;
  adoption_fee_required?: boolean;
  default_adoption_fee?: number;
  business_hours?: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

// Staff API types
export interface InviteStaffRequest {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export interface UpdateStaffRoleRequest {
  role: string;
}

export interface StaffListResponse {
  staff: StaffMember[];
  pending_invites: PendingInvite[];
}

export interface PendingInvite {
  invite_id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_at: Date;
  expires_at: Date;
}

// Common API response wrappers
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedApiResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

// Filter types
export interface DateRange {
  start?: Date | string;
  end?: Date | string;
}

export interface BaseFilters extends PaginationParams {
  search?: string;
  dateRange?: DateRange;
  status?: string;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface MultipleFileUploadResponse {
  files: FileUploadResponse[];
}

// WebSocket event types
export interface WebSocketEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
  user_id?: string;
  rescue_id?: string;
}

export interface WebSocketAuthMessage {
  token: string;
  user_id: string;
  rescue_id: string;
}

// Dashboard API types
export interface DashboardStatsResponse {
  totalPets: number;
  availablePets: number;
  pendingApplications: number;
  totalApplications: number;
  successfulAdoptions: number;
  staffMembers: number;
  monthlyAdoptions: Array<{
    month: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    user?: Pick<User, 'user_id' | 'first_name' | 'last_name'>;
  }>;
}

// Analytics API types
export interface AnalyticsDateRange {
  start_date: string;
  end_date: string;
}

export interface AnalyticsRequest {
  date_range: AnalyticsDateRange;
  metrics: string[];
  group_by?: string;
}

export interface AnalyticsResponse {
  metrics: Record<string, unknown>;
  charts: Array<{
    type: string;
    title: string;
    data: unknown[];
  }>;
  summary: {
    total_pets: number;
    total_applications: number;
    adoption_rate: number;
    average_time_to_adoption: number;
  };
}
