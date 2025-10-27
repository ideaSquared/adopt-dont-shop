// User type definitions matching the backend API structure

export type UserType = 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification' | 'deactivated';

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
