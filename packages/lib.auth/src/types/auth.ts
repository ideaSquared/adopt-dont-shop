// User and Authentication Types for lib.auth
import { z } from 'zod';
import type { UserRole, UserStatus } from '@adopt-dont-shop/lib.types';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  userType: UserRole;
  status: UserStatus;
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
  // Adopter discovery / matching preferences (ADS-425). The backend
  // already persists these, but the lib.auth User shape was missing them
  // so the SettingsForm save in app.client (preferences.petTypes,
  // preferences.maxDistance, preferences.newsletterOptIn) wouldn't compile.
  preferences?: {
    petTypes?: string[];
    maxDistance?: number;
    newsletterOptIn?: boolean;
  };
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

// ADS-281: a `Rescue` interface used to live here with a different shape
// from `lib.rescue/src/types/index.ts:Rescue` (rescueName/rescueType/
// websiteUrl/logoUrl/isActive vs the canonical name/email/address/etc.).
// It was unused outside lib.auth's barrel re-export, so removing it stops
// the divergent shape from leaking into consumers — the canonical source
// is `@adopt-dont-shop/lib.rescue`.

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
  userType?: UserRole;
  // Legacy field for frontend form compatibility
  confirmPassword?: string;
}

/**
 * Token pair the gateway issues on login/refresh.
 *
 * ADS-919: the gateway sets these as HttpOnly cookies (see
 * services/gateway/src/middleware/auth-cookies.ts) — it no longer returns
 * them in the JSON response body, so this type describes the gateway's
 * internal `TokenPair` proto message shape, not anything the SPA reads.
 * Kept here only because `AuthResponse.tokens` is typed against it for
 * backward-compat call sites that may still narrow on it; AuthService
 * itself never reads `response.tokens`.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  // RFC 3339 expiry timestamps.
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
}

export interface AuthResponse {
  user: User;
  // ADS-919: no longer present on the wire — the token pair rides home as
  // HttpOnly cookies instead (see TokenPair's doc comment). Optional so the
  // type still reflects what the gateway actually sends.
  tokens?: TokenPair;
  // Flattened permission snapshot at login time (gateway LoginResponse).
  permissions?: string[];
  // Set when the password was correct but the account has 2FA enabled and
  // no (valid) code was supplied. user/tokens are absent in that case — the
  // client re-submits login with twoFactorToken. auth-service turns this
  // into the TWO_FACTOR_REQUIRED_MESSAGE error the LoginForm prompts on.
  twoFactorRequired?: boolean;
  // Set when the password was correct but the account's email is not yet
  // verified. user/tokens are absent in that case — the client prompts the
  // user to verify their email (and can resend it). auth-service turns this
  // into the EMAIL_VERIFICATION_REQUIRED_MESSAGE error the LoginForm prompts on.
  emailVerificationRequired?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

// ADS-919: the gateway's refresh-token response no longer carries the
// rotated token pair — it's set as HttpOnly cookies instead. The body is
// just an acknowledgement.
export interface RefreshTokenResponse {
  success: boolean;
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

// Storage keys constants.
//
// ADS-919: the access + refresh tokens are no longer persisted here (or
// anywhere JS-readable) — they live in HttpOnly cookies the gateway sets
// (see services/gateway/src/middleware/auth-cookies.ts) and
// AuthService.isAuthenticated() reads a non-secret session-presence marker
// cookie instead (see services/session-cookie.ts). Only the non-sensitive
// user profile is kept in localStorage.
export const STORAGE_KEYS = {
  USER: 'user',
} as const;

/**
 * Runtime schema for the User shape stored in localStorage.
 * Only the required fields are checked; optional fields are allowed through.
 */
export const StoredUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  emailVerified: z.boolean(),
  userType: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type StoredUser = z.infer<typeof StoredUserSchema>;
