import { Request } from 'express';
import User, { UserType } from '../models/User';
import { TokenPair } from './api';
import { JsonObject, JsonValue } from './common';

// Authentication Request Types
export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  userType?: UserType;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface TwoFactorSetupRequest {
  secret: string;
  token: string;
}

export interface TwoFactorVerifyRequest {
  token: string;
}

// Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication Response Types
export interface AuthResponse extends TokenPair {
  user: Partial<User>;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  emailVerified: boolean;
  profileImageUrl?: string;
  twoFactorEnabled: boolean;
  roles?: AuthUserRole[];
  permissions?: UserPermission[];
}

export interface AuthUserRole {
  roleId: string;
  name: string;
  description?: string;
}

export interface UserPermission {
  permissionId: string;
  name: string;
  resource: string;
  action: string;
}

// Token Types
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserType;
  iat?: number;
  exp?: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
}

// Session Types
export interface UserSession {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  metadata?: JsonObject;
}

// Password Security Types
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

// Email Verification Types
export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  used: boolean;
}

// Two-Factor Authentication Types
export interface TwoFactorAuth {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  verifiedAt?: Date;
}

export interface TwoFactorBackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

// Authentication Events
export interface AuthEvent {
  type:
    | 'login'
    | 'logout'
    | 'register'
    | 'password_reset'
    | 'email_verification'
    | '2fa_setup'
    | '2fa_disable';
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  metadata?: JsonObject;
}

// Security Constants
export const AUTH_CONSTANTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in ms
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  VERIFICATION_TOKEN_EXPIRES_IN: 24 * 60 * 60 * 1000, // 24 hours in ms
  RESET_TOKEN_EXPIRES_IN: 60 * 60 * 1000, // 1 hour in ms
  BCRYPT_ROUNDS: 12,
} as const;

// Validation Rules
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '@$!%*?&',
} as const;

export interface LoginAttempt {
  payload?: JsonObject;
}
