// Core type definitions for the Rescue App

// User and authentication types
export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  rescue_id?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  rescue?: Rescue;
}

// Permission and role types
export enum Permission {
  // Pet Management
  PETS_VIEW = 'pets:view',
  PETS_CREATE = 'pets:create',
  PETS_UPDATE = 'pets:update',
  PETS_DELETE = 'pets:delete',

  // Application Management
  APPLICATIONS_VIEW = 'applications:view',
  APPLICATIONS_PROCESS = 'applications:process',
  APPLICATIONS_APPROVE = 'applications:approve',
  APPLICATIONS_REJECT = 'applications:reject',

  // Staff Management
  STAFF_VIEW = 'staff:view',
  STAFF_INVITE = 'staff:invite',
  STAFF_MANAGE = 'staff:manage',
  STAFF_REMOVE = 'staff:remove',

  // Analytics & Reporting
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  REPORTS_GENERATE = 'reports:generate',

  // Rescue Configuration
  RESCUE_SETTINGS_VIEW = 'rescue:settings:view',
  RESCUE_SETTINGS_UPDATE = 'rescue:settings:update',
  RESCUE_BILLING_VIEW = 'rescue:billing:view',
  RESCUE_BILLING_MANAGE = 'rescue:billing:manage',
}

export enum Role {
  RESCUE_ADMIN = 'rescue_admin',
  RESCUE_MANAGER = 'rescue_manager',
  RESCUE_STAFF = 'rescue_staff',
  VOLUNTEER = 'volunteer',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.RESCUE_ADMIN]: Object.values(Permission),
  [Role.RESCUE_MANAGER]: [
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.PETS_UPDATE,
    Permission.APPLICATIONS_VIEW,
    Permission.APPLICATIONS_PROCESS,
    Permission.APPLICATIONS_APPROVE,
    Permission.APPLICATIONS_REJECT,
    Permission.STAFF_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORTS_GENERATE,
    Permission.RESCUE_SETTINGS_VIEW,
  ],
  [Role.RESCUE_STAFF]: [
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.PETS_UPDATE,
    Permission.APPLICATIONS_VIEW,
    Permission.APPLICATIONS_PROCESS,
    Permission.ANALYTICS_VIEW,
  ],
  [Role.VOLUNTEER]: [Permission.PETS_VIEW, Permission.ANALYTICS_VIEW],
};

// Rescue types
export interface Rescue {
  rescue_id: string;
  rescue_name: string;
  rescue_type: string;
  reference_number?: string;
  reference_number_verified?: boolean;
  created_at: Date;
  updated_at: Date;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  description?: string;
  logo_url?: string;
}

export interface RescueSettings {
  rescue_id: string;
  application_auto_approve: boolean;
  application_require_home_visit: boolean;
  application_require_references: boolean;
  notification_email_enabled: boolean;
  notification_sms_enabled: boolean;
  adoption_fee_required: boolean;
  default_adoption_fee?: number;
  business_hours: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  created_at: Date;
  updated_at: Date;
}

// Staff member types
export interface StaffMember {
  staff_member_id: string;
  user_id: string;
  rescue_id: string;
  role: Role;
  verified_by_rescue: boolean;
  invited_by?: string;
  invited_at?: Date;
  joined_at?: Date;
  created_at: Date;
  updated_at: Date;
  user?: User;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  rescue_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: Date;
  read_at?: Date;
}

export enum NotificationType {
  NEW_APPLICATION = 'new_application',
  APPLICATION_UPDATE = 'application_update',
  PET_STATUS_CHANGE = 'pet_status_change',
  NEW_MESSAGE = 'new_message',
  STAFF_INVITE = 'staff_invite',
  SYSTEM_ALERT = 'system_alert',
}

// Common utility types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
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

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}
