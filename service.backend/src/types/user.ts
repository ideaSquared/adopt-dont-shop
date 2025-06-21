import User, { UserStatus, UserType } from '../models/User';
import { PaginationOptions } from './api';
import { JsonObject } from './common';

// User Data Types
export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  bio?: string;
  profileImageUrl?: string;
  userType: UserType;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  location?: UserLocation;
  privacySettings: PrivacySettings;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata?: JsonObject;
}

export interface UserLocation {
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'rescue_only';
  showLocation: boolean;
  allowMessages: boolean;
  showAdoptionHistory: boolean;
  showContactInfo: boolean;
  allowSearchIndexing: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  applicationUpdates: boolean;
  chatMessages: boolean;
  petAlerts: boolean;
  rescueUpdates: boolean;
}

// User Update Types
export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  bio?: string;
  profileImage?: string;
  preferences?: any;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  privacySettings: {
    profileVisibility: 'public' | 'private' | 'friends';
    showLocation: boolean;
    showContactInfo: boolean;
  };
}

// User Search and Filtering
export interface UserFilters {
  search?: string;
  status?: UserStatus;
  userType?: UserType;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  page?: number;
  limit?: number;
  location?: {
    country?: string;
    city?: string;
    radius?: number; // km
    coordinates?: [number, number];
  };
}

export interface UserSearchFilters {
  search?: string;
  status?: UserStatus;
  userType?: UserType;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  location?: {
    country?: string;
    city?: string;
    radius?: number; // km
    coordinates?: [number, number];
  };
}

export interface UserSearchOptions extends PaginationOptions {
  includePrivate?: boolean;
  includeRoles?: boolean;
  includePermissions?: boolean;
  includeActivity?: boolean;
}

// User Activity and Statistics
export interface UserActivity {
  applicationsCount: number;
  activeChatsCount: number;
  petsFavoritedCount: number;
  recentActivity: ActivityItem[];
  lastLogin: Date | null;
  accountCreated: Date;
  totalLoginCount: number;
  averageSessionDuration: number; // minutes
}

export interface ActivityItem {
  type: 'application' | 'chat' | 'favorite' | 'profile_update' | 'login';
  description: string;
  timestamp: Date;
  metadata?: JsonObject;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  usersByType: Record<UserType, number>;
  usersByStatus: Record<UserStatus, number>;
  monthlyGrowth: MonthlyGrowth[];
  geographicDistribution: GeographicStats[];
}

export interface MonthlyGrowth {
  month: string;
  year: number;
  newUsers: number;
  activeUsers: number;
}

export interface GeographicStats {
  country: string;
  city?: string;
  userCount: number;
  percentage: number;
}

// User Management Types
export interface UserRoleUpdate {
  userType: UserType;
  reason?: string;
}

export interface UserStatusUpdate {
  status: UserStatus;
  reason?: string;
  expiresAt?: Date; // For temporary suspensions
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'suspend' | 'verify_email' | 'delete';
  reason?: string;
  metadata?: JsonObject;
}

export interface BulkUserOperationResult {
  successCount: number;
  failedCount: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

// User Profile Completeness
export interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
  suggestions: string[];
}

// User Verification Types
export interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  verificationLevel: 'none' | 'basic' | 'full';
}

export interface IdentityVerificationRequest {
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
}

// User Preferences Export/Import
export interface UserDataExport {
  profile: UserProfile;
  activity: UserActivity;
  preferences: {
    privacy: PrivacySettings;
    notifications: NotificationPreferences;
  };
  generatedAt: Date;
}

// User Contact Information
export interface ContactInfo {
  email: string;
  phoneNumber?: string;
  preferredContactMethod: 'email' | 'phone' | 'app';
  bestContactTime?: string;
  timeZone?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  bio?: string;
  profileImageUrl?: string;
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  userType: UserType;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  location?: UserLocation;
  privacySettings: PrivacySettings;
  notificationPreferences: NotificationPreferences;
  metadata?: JsonObject;
}

export interface UserCreateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType?: string;
  rescueId?: string;
}

export interface BulkUserUpdateData {
  userIds: string[];
  updates: Partial<UserUpdateData>;
}

export interface UserActivitySummary {
  userId: string;
  lastLogin: Date;
  totalLogins: number;
  applicationsSubmitted: number;
  petsViewed: number;
  messagesSent: number;
  profileCompleteness: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
