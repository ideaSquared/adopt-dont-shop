// User type definitions matching the backend API structure
import type { UserRole, UserStatus as LibUserStatus } from '@adopt-dont-shop/lib.types';

export type UserType = UserRole;
export type UserStatus = LibUserStatus;

export const ADMIN_USER_TYPES: readonly UserType[] = [
  'admin',
  'moderator',
  'super_admin',
  'support_agent',
];

export interface User {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  status: UserStatus;
  userType: UserType;
  profileImageUrl: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  rescueId: string | null;
  rescueName?: string | null;
  lastLoginAt: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// Admin-specific user type (same as User)
export type AdminUser = User;
