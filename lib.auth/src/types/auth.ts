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
}

export interface LoginRequest {
  email: string;
  password: string;
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
