// User and Authentication Types for lib.auth

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  userType: 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification' | 'deactivated';
  profileImageUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  location?: {
    type?: string;
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  privacySettings?: {
    profileVisibility?: string;
    showLocation?: boolean;
    allowMessages?: boolean;
    showAdoptionHistory?: boolean;
  };
  notificationPreferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
  timezone?: string;
  language?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  termsAcceptedAt?: string;
  privacyPolicyAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  phone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'both';
  // Rescue-specific fields
  rescueId?: string;
  role?: RescueRole;
}

// Rescue-specific role and permission types
export enum RescueRole {
  RESCUE_ADMIN = 'rescue_admin',
  RESCUE_STAFF = 'rescue_staff',
  RESCUE_VOLUNTEER = 'rescue_volunteer',
}

export enum Permission {
  // Pet management
  VIEW_PETS = 'view_pets',
  MANAGE_PETS = 'manage_pets',
  PETS_VIEW = 'pets_view',
  PETS_CREATE = 'pets_create',

  // Application management
  VIEW_APPLICATIONS = 'view_applications',
  MANAGE_APPLICATIONS = 'manage_applications',
  APPLICATIONS_VIEW = 'applications_view',

  // Staff management
  VIEW_STAFF = 'view_staff',
  MANAGE_STAFF = 'manage_staff',
  STAFF_VIEW = 'staff_view',
  STAFF_MANAGE = 'staff_manage',

  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  ANALYTICS_VIEW = 'analytics_view',

  // Settings
  MANAGE_SETTINGS = 'manage_settings',
  RESCUE_SETTINGS_VIEW = 'rescue_settings_view',
  RESCUE_SETTINGS_UPDATE = 'rescue_settings_update',
}

export interface Rescue {
  rescueId: string;
  rescueName: string;
  rescueType: string;
  contactEmail: string;
  contactPhone?: string;
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Permission mappings for role-based access control
export const rolePermissions: Record<RescueRole, Permission[]> = {
  [RescueRole.RESCUE_ADMIN]: [
    Permission.VIEW_PETS,
    Permission.MANAGE_PETS,
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.VIEW_APPLICATIONS,
    Permission.MANAGE_APPLICATIONS,
    Permission.APPLICATIONS_VIEW,
    Permission.VIEW_STAFF,
    Permission.MANAGE_STAFF,
    Permission.STAFF_VIEW,
    Permission.STAFF_MANAGE,
    Permission.VIEW_ANALYTICS,
    Permission.ANALYTICS_VIEW,
    Permission.MANAGE_SETTINGS,
    Permission.RESCUE_SETTINGS_VIEW,
    Permission.RESCUE_SETTINGS_UPDATE,
  ],
  [RescueRole.RESCUE_STAFF]: [
    Permission.VIEW_PETS,
    Permission.MANAGE_PETS,
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.VIEW_APPLICATIONS,
    Permission.MANAGE_APPLICATIONS,
    Permission.APPLICATIONS_VIEW,
    Permission.VIEW_ANALYTICS,
    Permission.ANALYTICS_VIEW,
  ],
  [RescueRole.RESCUE_VOLUNTEER]: [
    Permission.VIEW_PETS,
    Permission.PETS_VIEW,
    Permission.VIEW_APPLICATIONS,
    Permission.APPLICATIONS_VIEW,
  ],
};

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorEnableResponse {
  success: boolean;
  backupCodes: string[];
}

export interface TwoFactorDisableResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorBackupCodesResponse {
  success: boolean;
  backupCodes: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  userType?: 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  // Legacy field for frontend form compatibility
  confirmPassword?: string;
}

export interface AuthResponse {
  user: User;
  token: string; // Backend returns 'token', not 'accessToken'
  refreshToken: string;
  expiresIn: number;
  // Legacy field for frontend compatibility
  accessToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface DeleteAccountRequest {
  reason?: string;
}

// Token management types
export interface TokenData {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Storage keys constants
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  ACCESS_TOKEN: 'accessToken', // For backward compatibility
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;
