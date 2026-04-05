/**
 * Default field permission configurations for all resources.
 *
 * These defaults define baseline field access levels per role.
 * Database overrides take precedence over these defaults.
 *
 * Convention: Any field not listed defaults to 'read' for authenticated roles
 * and 'none' for fields that should never be exposed.
 */
import type { FieldAccessLevel, FieldPermissionConfig } from '../types/field-permissions';
import type { UserRole } from '../types';

/**
 * Sentinel value indicating that all unlisted fields default to this level.
 */
const READ: FieldAccessLevel = 'read';
const WRITE: FieldAccessLevel = 'write';
const NONE: FieldAccessLevel = 'none';

/**
 * User resource field permissions
 *
 * Sensitive fields like password, tokens, and 2FA secrets are NEVER exposed.
 * Contact details (email, phone) are restricted based on role.
 * Personal details are writable by the user themselves (handled via ownership check).
 */
const userFieldPermissions: FieldPermissionConfig['users'] = {
  admin: {
    userId: READ,
    firstName: WRITE,
    lastName: WRITE,
    email: WRITE,
    phoneNumber: WRITE,
    dateOfBirth: READ,
    bio: WRITE,
    status: WRITE,
    userType: WRITE,
    profileImageUrl: WRITE,
    emailVerified: READ,
    phoneVerified: READ,
    lastLoginAt: READ,
    loginAttempts: READ,
    twoFactorEnabled: READ,
    country: READ,
    city: READ,
    addressLine1: READ,
    addressLine2: READ,
    postalCode: READ,
    rescueId: READ,
    privacySettings: READ,
    notificationPreferences: READ,
    createdAt: READ,
    updatedAt: READ,
    // Sensitive fields always hidden
    password: NONE,
    resetToken: NONE,
    resetTokenExpiration: NONE,
    resetTokenForceFlag: NONE,
    verificationToken: NONE,
    verificationTokenExpiresAt: NONE,
    twoFactorSecret: NONE,
    backupCodes: NONE,
    lockedUntil: READ,
  },
  moderator: {
    userId: READ,
    firstName: READ,
    lastName: READ,
    email: READ,
    phoneNumber: NONE,
    dateOfBirth: NONE,
    bio: READ,
    status: READ,
    userType: READ,
    profileImageUrl: READ,
    emailVerified: READ,
    phoneVerified: NONE,
    lastLoginAt: READ,
    loginAttempts: READ,
    twoFactorEnabled: NONE,
    country: READ,
    city: READ,
    addressLine1: NONE,
    addressLine2: NONE,
    postalCode: NONE,
    rescueId: READ,
    privacySettings: NONE,
    notificationPreferences: NONE,
    createdAt: READ,
    updatedAt: READ,
    password: NONE,
    resetToken: NONE,
    resetTokenExpiration: NONE,
    resetTokenForceFlag: NONE,
    verificationToken: NONE,
    verificationTokenExpiresAt: NONE,
    twoFactorSecret: NONE,
    backupCodes: NONE,
    lockedUntil: READ,
  },
  rescue_staff: {
    userId: READ,
    firstName: READ,
    lastName: READ,
    email: READ,
    phoneNumber: NONE,
    dateOfBirth: NONE,
    bio: READ,
    status: NONE,
    userType: NONE,
    profileImageUrl: READ,
    emailVerified: NONE,
    phoneVerified: NONE,
    lastLoginAt: NONE,
    loginAttempts: NONE,
    twoFactorEnabled: NONE,
    country: READ,
    city: READ,
    addressLine1: NONE,
    addressLine2: NONE,
    postalCode: NONE,
    rescueId: READ,
    privacySettings: NONE,
    notificationPreferences: NONE,
    createdAt: READ,
    updatedAt: NONE,
    password: NONE,
    resetToken: NONE,
    resetTokenExpiration: NONE,
    resetTokenForceFlag: NONE,
    verificationToken: NONE,
    verificationTokenExpiresAt: NONE,
    twoFactorSecret: NONE,
    backupCodes: NONE,
    lockedUntil: NONE,
  },
  adopter: {
    userId: READ,
    firstName: READ,
    lastName: READ,
    email: NONE,
    phoneNumber: NONE,
    dateOfBirth: NONE,
    bio: READ,
    status: NONE,
    userType: NONE,
    profileImageUrl: READ,
    emailVerified: NONE,
    phoneVerified: NONE,
    lastLoginAt: NONE,
    loginAttempts: NONE,
    twoFactorEnabled: NONE,
    country: READ,
    city: READ,
    addressLine1: NONE,
    addressLine2: NONE,
    postalCode: NONE,
    rescueId: NONE,
    privacySettings: NONE,
    notificationPreferences: NONE,
    createdAt: NONE,
    updatedAt: NONE,
    password: NONE,
    resetToken: NONE,
    resetTokenExpiration: NONE,
    resetTokenForceFlag: NONE,
    verificationToken: NONE,
    verificationTokenExpiresAt: NONE,
    twoFactorSecret: NONE,
    backupCodes: NONE,
    lockedUntil: NONE,
  },
};

/**
 * Application resource field permissions
 *
 * Interview notes, home visit notes, and scoring are restricted.
 * Applicants see their own application data but not internal notes.
 */
const applicationFieldPermissions: FieldPermissionConfig['applications'] = {
  admin: {
    applicationId: READ,
    userId: READ,
    petId: READ,
    rescueId: READ,
    status: WRITE,
    priority: WRITE,
    workflowStage: WRITE,
    answers: READ,
    references: READ,
    documents: READ,
    interviewNotes: WRITE,
    homeVisitNotes: WRITE,
    score: WRITE,
    actionedBy: READ,
    actionedAt: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  moderator: {
    applicationId: READ,
    userId: READ,
    petId: READ,
    rescueId: READ,
    status: READ,
    priority: READ,
    workflowStage: READ,
    answers: READ,
    references: NONE,
    documents: NONE,
    interviewNotes: READ,
    homeVisitNotes: READ,
    score: READ,
    actionedBy: READ,
    actionedAt: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  rescue_staff: {
    applicationId: READ,
    userId: READ,
    petId: READ,
    rescueId: READ,
    status: WRITE,
    priority: WRITE,
    workflowStage: WRITE,
    answers: READ,
    references: READ,
    documents: READ,
    interviewNotes: WRITE,
    homeVisitNotes: WRITE,
    score: WRITE,
    actionedBy: READ,
    actionedAt: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  adopter: {
    applicationId: READ,
    userId: READ,
    petId: READ,
    rescueId: READ,
    status: READ,
    priority: NONE,
    workflowStage: NONE,
    answers: READ,
    references: NONE,
    documents: NONE,
    interviewNotes: NONE,
    homeVisitNotes: NONE,
    score: NONE,
    actionedBy: NONE,
    actionedAt: NONE,
    createdAt: READ,
    updatedAt: READ,
  },
};

/**
 * Pet resource field permissions
 *
 * Most pet fields are publicly readable. Internal notes are restricted.
 */
const petFieldPermissions: FieldPermissionConfig['pets'] = {
  admin: {
    petId: READ,
    name: WRITE,
    type: WRITE,
    breed: WRITE,
    age: WRITE,
    gender: WRITE,
    status: WRITE,
    description: WRITE,
    medicalHistory: WRITE,
    vaccinations: WRITE,
    microchipId: WRITE,
    internalNotes: WRITE,
    rescueId: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  moderator: {
    petId: READ,
    name: READ,
    type: READ,
    breed: READ,
    age: READ,
    gender: READ,
    status: READ,
    description: READ,
    medicalHistory: READ,
    vaccinations: READ,
    microchipId: READ,
    internalNotes: READ,
    rescueId: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  rescue_staff: {
    petId: READ,
    name: WRITE,
    type: WRITE,
    breed: WRITE,
    age: WRITE,
    gender: WRITE,
    status: WRITE,
    description: WRITE,
    medicalHistory: WRITE,
    vaccinations: WRITE,
    microchipId: WRITE,
    internalNotes: WRITE,
    rescueId: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  adopter: {
    petId: READ,
    name: READ,
    type: READ,
    breed: READ,
    age: READ,
    gender: READ,
    status: READ,
    description: READ,
    medicalHistory: NONE,
    vaccinations: NONE,
    microchipId: NONE,
    internalNotes: NONE,
    rescueId: READ,
    createdAt: READ,
    updatedAt: READ,
  },
};

/**
 * Rescue resource field permissions
 *
 * Most rescue info is public. Internal config and billing are restricted.
 */
const rescueFieldPermissions: FieldPermissionConfig['rescues'] = {
  admin: {
    rescueId: READ,
    name: WRITE,
    type: WRITE,
    description: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    website: WRITE,
    address: WRITE,
    status: WRITE,
    verificationStatus: WRITE,
    internalNotes: WRITE,
    billingInfo: WRITE,
    createdAt: READ,
    updatedAt: READ,
  },
  moderator: {
    rescueId: READ,
    name: READ,
    type: READ,
    description: READ,
    contactEmail: READ,
    contactPhone: READ,
    website: READ,
    address: READ,
    status: READ,
    verificationStatus: READ,
    internalNotes: READ,
    billingInfo: NONE,
    createdAt: READ,
    updatedAt: READ,
  },
  rescue_staff: {
    rescueId: READ,
    name: WRITE,
    type: READ,
    description: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    website: WRITE,
    address: WRITE,
    status: READ,
    verificationStatus: READ,
    internalNotes: WRITE,
    billingInfo: NONE,
    createdAt: READ,
    updatedAt: READ,
  },
  adopter: {
    rescueId: READ,
    name: READ,
    type: READ,
    description: READ,
    contactEmail: READ,
    contactPhone: READ,
    website: READ,
    address: READ,
    status: READ,
    verificationStatus: NONE,
    internalNotes: NONE,
    billingInfo: NONE,
    createdAt: NONE,
    updatedAt: NONE,
  },
};

/**
 * Complete default field permission configuration
 */
export const defaultFieldPermissions: FieldPermissionConfig = {
  users: userFieldPermissions,
  applications: applicationFieldPermissions,
  pets: petFieldPermissions,
  rescues: rescueFieldPermissions,
};

/**
 * Get the default access level for a field on a resource for a given role.
 * Returns 'none' if no default is configured for the field.
 */
export const getDefaultFieldAccess = (
  resource: keyof FieldPermissionConfig,
  role: UserRole,
  fieldName: string
): FieldAccessLevel => {
  const resourceConfig = defaultFieldPermissions[resource];
  if (!resourceConfig) {
    return 'none';
  }

  const roleConfig = resourceConfig[role];
  if (!roleConfig) {
    return 'none';
  }

  return roleConfig[fieldName] ?? 'none';
};

/**
 * Get all field access levels for a role on a resource.
 */
export const getFieldAccessMap = (
  resource: keyof FieldPermissionConfig,
  role: UserRole
): Record<string, FieldAccessLevel> => {
  const resourceConfig = defaultFieldPermissions[resource];
  if (!resourceConfig) {
    return {};
  }

  return { ...resourceConfig[role] };
};
