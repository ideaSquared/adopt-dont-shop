/**
 * Default field permission configurations for all resources.
 *
 * These defaults define baseline field access levels per role.
 * Database overrides take precedence over these defaults.
 *
 * Convention: Any field not listed defaults to 'none' (secure by default).
 * Field names MUST exactly match the keys emitted by the backend API —
 * i.e., the Sequelize model's `toJSON()` output. Users and Rescues emit
 * camelCase, Pets and Applications emit snake_case.
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
 * User model uses camelCase attributes with `underscored: true` — toJSON
 * emits camelCase, so defaults use camelCase keys.
 *
 * Sensitive fields like password, tokens, and 2FA secrets are NEVER exposed.
 * Contact details (email, phone) are restricted based on role.
 * Adopters can write their own profile fields; ownership is enforced by
 * route-level middleware before fieldWriteGuard runs.
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
    // Adopter can edit own profile fields. Ownership is enforced by
    // requirePermissionOrOwnership in the route before fieldWriteGuard.
    firstName: WRITE,
    lastName: WRITE,
    bio: WRITE,
    profileImageUrl: WRITE,
    phoneNumber: WRITE,
    dateOfBirth: WRITE,
    country: WRITE,
    city: WRITE,
    addressLine1: WRITE,
    addressLine2: WRITE,
    postalCode: WRITE,
    privacySettings: WRITE,
    notificationPreferences: WRITE,
    // Read-only state
    email: READ,
    status: NONE,
    userType: NONE,
    emailVerified: READ,
    phoneVerified: READ,
    lastLoginAt: NONE,
    loginAttempts: NONE,
    twoFactorEnabled: READ,
    rescueId: NONE,
    createdAt: READ,
    updatedAt: NONE,
    // Sensitive fields always hidden
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
 * Applications have a dual-cased shape:
 *
 *  - RESPONSE shape (FrontendApplication) is camelCase. The ApplicationController
 *    transforms the Sequelize model into a frontend-friendly DTO with keys like
 *    `id`, `petId`, `userId`, `rescueId`, `status`, `submittedAt`, `reviewedAt`,
 *    `reviewedBy`, `reviewNotes`, `createdAt`, `updatedAt`, `petName`, `petType`,
 *    `petBreed`, `userName`, `userEmail`. This is what `fieldMask('applications')`
 *    sees.
 *
 *  - REQUEST shape (CreateApplicationRequest / UpdateApplicationRequest) is
 *    snake_case. Clients POST / PUT bodies like `{ pet_id, answers, references,
 *    interview_notes, home_visit_notes, score, ... }`. This is what
 *    `fieldWriteGuard('applications')` sees.
 *
 * Because `fieldMask` and `fieldWriteGuard` both look up keys in the same
 * access map, we include BOTH camelCase (response) and snake_case (request)
 * keys in every role's map. Each key's access level is specified independently
 * so we can, for example, mark `petId` as `read` (so the response includes it)
 * while marking `pet_id` as `write` (so adopters can submit it on POST).
 *
 * Interview notes, home visit notes, and scoring are restricted.
 * Applicants see their own application data but not internal notes.
 */
const applicationFieldPermissions: FieldPermissionConfig['applications'] = {
  admin: {
    // camelCase RESPONSE keys (FrontendApplication)
    id: READ,
    petId: READ,
    userId: READ,
    rescueId: READ,
    status: READ,
    submittedAt: READ,
    reviewedAt: READ,
    reviewedBy: READ,
    reviewNotes: READ,
    data: READ,
    documents: READ,
    createdAt: READ,
    updatedAt: READ,
    petName: READ,
    petType: READ,
    petBreed: READ,
    userName: READ,
    userEmail: READ,
    // snake_case REQUEST keys (CreateApplicationRequest / UpdateApplicationRequest)
    pet_id: WRITE,
    answers: WRITE,
    references: WRITE,
    priority: WRITE,
    notes: WRITE,
    tags: WRITE,
    interview_notes: WRITE,
    home_visit_notes: WRITE,
    score: WRITE,
  },
  moderator: {
    // camelCase RESPONSE keys
    id: READ,
    petId: READ,
    userId: READ,
    rescueId: READ,
    status: READ,
    submittedAt: READ,
    reviewedAt: READ,
    reviewedBy: READ,
    reviewNotes: READ,
    data: READ,
    documents: NONE,
    createdAt: READ,
    updatedAt: READ,
    petName: READ,
    petType: READ,
    petBreed: READ,
    userName: READ,
    userEmail: READ,
    // snake_case REQUEST / policy keys — moderators can READ assessment
    // fields (the frontend service uses this map for client-side policy
    // checks) but cannot WRITE any of them; fieldWriteGuard rejects
    // anything that isn't `write`, so READ is sufficient to block writes.
    pet_id: READ,
    answers: READ,
    references: READ,
    priority: READ,
    notes: READ,
    tags: READ,
    interview_notes: READ,
    home_visit_notes: READ,
    score: READ,
  },
  rescue_staff: {
    // camelCase RESPONSE keys
    id: READ,
    petId: READ,
    userId: READ,
    rescueId: READ,
    status: READ,
    submittedAt: READ,
    reviewedAt: READ,
    reviewedBy: READ,
    reviewNotes: READ,
    data: READ,
    documents: READ,
    createdAt: READ,
    updatedAt: READ,
    petName: READ,
    petType: READ,
    petBreed: READ,
    userName: READ,
    userEmail: READ,
    // snake_case REQUEST keys — rescue staff can edit review state
    pet_id: READ,
    answers: READ,
    references: READ,
    priority: WRITE,
    notes: WRITE,
    tags: WRITE,
    interview_notes: WRITE,
    home_visit_notes: WRITE,
    score: WRITE,
  },
  adopter: {
    // camelCase RESPONSE keys — adopters see their own application data
    // but internal assessment fields (reviewNotes, score, interview notes)
    // are stripped. reviewNotes is considered internal metadata and hidden.
    id: READ,
    petId: READ,
    userId: READ,
    rescueId: READ,
    status: READ,
    submittedAt: READ,
    reviewedAt: READ,
    reviewedBy: NONE,
    reviewNotes: NONE,
    data: READ,
    documents: READ,
    createdAt: READ,
    updatedAt: READ,
    petName: READ,
    petType: READ,
    petBreed: READ,
    userName: READ,
    userEmail: READ,
    // snake_case REQUEST keys — adopters can submit creation/update bodies.
    // Ownership is enforced by requirePermissionOrOwnership upstream; the
    // field defaults unblock POST /applications for the adopter role.
    pet_id: WRITE,
    answers: WRITE,
    references: WRITE,
    priority: NONE,
    notes: WRITE,
    tags: NONE,
    // Internal staff assessment fields are NEVER writable by adopters
    interview_notes: NONE,
    home_visit_notes: NONE,
    score: NONE,
  },
};

/**
 * Pet resource field permissions
 *
 * Pet model defines attributes as snake_case — toJSON emits snake_case,
 * so defaults MUST use snake_case keys.
 *
 * Most pet fields are publicly readable. Internal notes (behavioral,
 * medical, surrender reason) are restricted.
 *
 * `distance` is a computed field added by PetController.searchPets when
 * the request includes location parameters; it is never a DB column but
 * appears in the response so it needs a permission entry.
 */
const petFieldPermissions: FieldPermissionConfig['pets'] = {
  admin: {
    pet_id: READ,
    distance: READ,
    name: WRITE,
    rescue_id: READ,
    short_description: WRITE,
    long_description: WRITE,
    age_years: WRITE,
    age_months: WRITE,
    age_group: WRITE,
    gender: WRITE,
    status: WRITE,
    type: WRITE,
    breed: WRITE,
    secondary_breed: WRITE,
    weight_kg: WRITE,
    size: WRITE,
    color: WRITE,
    markings: WRITE,
    microchip_id: WRITE,
    archived: WRITE,
    featured: WRITE,
    priority_listing: WRITE,
    adoption_fee: WRITE,
    special_needs: WRITE,
    special_needs_description: WRITE,
    house_trained: WRITE,
    good_with_children: WRITE,
    good_with_dogs: WRITE,
    good_with_cats: WRITE,
    good_with_small_animals: WRITE,
    energy_level: WRITE,
    exercise_needs: WRITE,
    grooming_needs: WRITE,
    training_notes: WRITE,
    temperament: WRITE,
    medical_notes: WRITE,
    behavioral_notes: WRITE,
    surrender_reason: WRITE,
    intake_date: WRITE,
    vaccination_status: WRITE,
    vaccination_date: WRITE,
    spay_neuter_status: WRITE,
    spay_neuter_date: WRITE,
    last_vet_checkup: WRITE,
    images: WRITE,
    videos: WRITE,
    location: WRITE,
    available_since: WRITE,
    adopted_date: WRITE,
    foster_start_date: WRITE,
    foster_end_date: WRITE,
    view_count: READ,
    favorite_count: READ,
    application_count: READ,
    tags: WRITE,
    created_at: READ,
    updated_at: READ,
  },
  moderator: {
    pet_id: READ,
    distance: READ,
    name: READ,
    rescue_id: READ,
    short_description: READ,
    long_description: READ,
    age_years: READ,
    age_months: READ,
    age_group: READ,
    gender: READ,
    status: READ,
    type: READ,
    breed: READ,
    secondary_breed: READ,
    weight_kg: READ,
    size: READ,
    color: READ,
    markings: READ,
    microchip_id: READ,
    archived: READ,
    featured: READ,
    priority_listing: READ,
    adoption_fee: READ,
    special_needs: READ,
    special_needs_description: READ,
    house_trained: READ,
    good_with_children: READ,
    good_with_dogs: READ,
    good_with_cats: READ,
    good_with_small_animals: READ,
    energy_level: READ,
    exercise_needs: READ,
    grooming_needs: READ,
    training_notes: READ,
    temperament: READ,
    medical_notes: READ,
    behavioral_notes: READ,
    surrender_reason: READ,
    intake_date: READ,
    vaccination_status: READ,
    vaccination_date: READ,
    spay_neuter_status: READ,
    spay_neuter_date: READ,
    last_vet_checkup: READ,
    images: READ,
    videos: READ,
    location: READ,
    available_since: READ,
    adopted_date: READ,
    foster_start_date: READ,
    foster_end_date: READ,
    view_count: READ,
    favorite_count: READ,
    application_count: READ,
    tags: READ,
    created_at: READ,
    updated_at: READ,
  },
  rescue_staff: {
    pet_id: READ,
    distance: READ,
    name: WRITE,
    rescue_id: READ,
    short_description: WRITE,
    long_description: WRITE,
    age_years: WRITE,
    age_months: WRITE,
    age_group: WRITE,
    gender: WRITE,
    status: WRITE,
    type: WRITE,
    breed: WRITE,
    secondary_breed: WRITE,
    weight_kg: WRITE,
    size: WRITE,
    color: WRITE,
    markings: WRITE,
    microchip_id: WRITE,
    archived: WRITE,
    featured: WRITE,
    priority_listing: WRITE,
    adoption_fee: WRITE,
    special_needs: WRITE,
    special_needs_description: WRITE,
    house_trained: WRITE,
    good_with_children: WRITE,
    good_with_dogs: WRITE,
    good_with_cats: WRITE,
    good_with_small_animals: WRITE,
    energy_level: WRITE,
    exercise_needs: WRITE,
    grooming_needs: WRITE,
    training_notes: WRITE,
    temperament: WRITE,
    medical_notes: WRITE,
    behavioral_notes: WRITE,
    surrender_reason: WRITE,
    intake_date: WRITE,
    vaccination_status: WRITE,
    vaccination_date: WRITE,
    spay_neuter_status: WRITE,
    spay_neuter_date: WRITE,
    last_vet_checkup: WRITE,
    images: WRITE,
    videos: WRITE,
    location: WRITE,
    available_since: WRITE,
    adopted_date: WRITE,
    foster_start_date: WRITE,
    foster_end_date: WRITE,
    view_count: READ,
    favorite_count: READ,
    application_count: READ,
    tags: WRITE,
    created_at: READ,
    updated_at: READ,
  },
  adopter: {
    // Public pet-browsing view: basic details only. No internal notes,
    // no medical/behavioral history, no surrender reason, no microchip.
    pet_id: READ,
    distance: READ,
    name: READ,
    rescue_id: READ,
    short_description: READ,
    long_description: READ,
    age_years: READ,
    age_months: READ,
    age_group: READ,
    gender: READ,
    status: READ,
    type: READ,
    breed: READ,
    secondary_breed: READ,
    weight_kg: READ,
    size: READ,
    color: READ,
    markings: READ,
    adoption_fee: READ,
    special_needs: READ,
    special_needs_description: READ,
    house_trained: READ,
    good_with_children: READ,
    good_with_dogs: READ,
    good_with_cats: READ,
    good_with_small_animals: READ,
    energy_level: READ,
    exercise_needs: READ,
    grooming_needs: READ,
    temperament: READ,
    vaccination_status: READ,
    spay_neuter_status: READ,
    images: READ,
    videos: READ,
    available_since: READ,
    tags: READ,
    created_at: READ,
    updated_at: READ,
    // Restricted fields
    microchip_id: NONE,
    medical_notes: NONE,
    behavioral_notes: NONE,
    training_notes: NONE,
    surrender_reason: NONE,
    intake_date: NONE,
    vaccination_date: NONE,
    spay_neuter_date: NONE,
    last_vet_checkup: NONE,
    location: NONE,
    archived: NONE,
    featured: NONE,
    priority_listing: NONE,
    adopted_date: NONE,
    foster_start_date: NONE,
    foster_end_date: NONE,
    view_count: NONE,
    favorite_count: NONE,
    application_count: NONE,
  },
};

/**
 * Rescue resource field permissions
 *
 * Rescue model uses camelCase attributes with individual `field:` column
 * mappings — toJSON emits camelCase, so defaults use camelCase keys.
 *
 * Most rescue info is public. Internal settings and verification state
 * are restricted.
 */
const rescueFieldPermissions: FieldPermissionConfig['rescues'] = {
  admin: {
    rescueId: READ,
    readableId: READ,
    name: WRITE,
    email: WRITE,
    phone: WRITE,
    address: WRITE,
    city: WRITE,
    county: WRITE,
    postcode: WRITE,
    country: WRITE,
    website: WRITE,
    description: WRITE,
    mission: WRITE,
    ein: WRITE,
    registrationNumber: WRITE,
    contactPerson: WRITE,
    contactTitle: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    status: WRITE,
    verifiedAt: READ,
    verifiedBy: READ,
    settings: WRITE,
    createdAt: READ,
    updatedAt: READ,
  },
  moderator: {
    rescueId: READ,
    readableId: READ,
    name: READ,
    email: READ,
    phone: READ,
    address: READ,
    city: READ,
    county: READ,
    postcode: READ,
    country: READ,
    website: READ,
    description: READ,
    mission: READ,
    ein: NONE,
    registrationNumber: NONE,
    contactPerson: READ,
    contactTitle: READ,
    contactEmail: READ,
    contactPhone: READ,
    status: READ,
    verifiedAt: READ,
    verifiedBy: READ,
    settings: NONE,
    createdAt: READ,
    updatedAt: READ,
  },
  rescue_staff: {
    rescueId: READ,
    readableId: READ,
    name: WRITE,
    email: WRITE,
    phone: WRITE,
    address: WRITE,
    city: WRITE,
    county: WRITE,
    postcode: WRITE,
    country: WRITE,
    website: WRITE,
    description: WRITE,
    mission: WRITE,
    ein: READ,
    registrationNumber: READ,
    contactPerson: WRITE,
    contactTitle: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    status: READ,
    verifiedAt: READ,
    verifiedBy: NONE,
    settings: WRITE,
    createdAt: READ,
    updatedAt: READ,
  },
  adopter: {
    rescueId: READ,
    readableId: READ,
    name: READ,
    email: READ,
    phone: READ,
    address: READ,
    city: READ,
    county: READ,
    postcode: READ,
    country: READ,
    website: READ,
    description: READ,
    mission: READ,
    ein: NONE,
    registrationNumber: NONE,
    contactPerson: READ,
    contactTitle: READ,
    contactEmail: READ,
    contactPhone: READ,
    status: READ,
    verifiedAt: NONE,
    verifiedBy: NONE,
    settings: NONE,
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
 * Fields that are NEVER writable or readable via the field-permission system,
 * regardless of role or database override. This is a hard security floor
 * that cannot be loosened from the admin UI.
 *
 * Enforced in two places:
 *  1. `isSensitiveField` / `enforceSensitiveDenylist` — called by the backend
 *     middleware after merging defaults + overrides, so even if an admin
 *     sets an override like `{ resource: 'users', field: 'password', role:
 *     'admin', level: 'write' }` in the DB, it will be forced back to 'none'.
 *  2. Admin API routes (POST/bulk upsert) reject any attempt to create an
 *     override for a sensitive field at request-validation time.
 */
export const SENSITIVE_FIELD_DENYLIST: Readonly<
  Record<keyof FieldPermissionConfig, ReadonlyArray<string>>
> = {
  users: [
    'password',
    'resetToken',
    'resetTokenExpiration',
    'resetTokenForceFlag',
    'verificationToken',
    'verificationTokenExpiresAt',
    'twoFactorSecret',
    'backupCodes',
  ],
  pets: [],
  applications: [],
  rescues: [],
};

/**
 * Check whether a field is on the sensitive denylist for its resource.
 * Sensitive fields must always resolve to 'none' access regardless of
 * role, default, or database override.
 */
export const isSensitiveField = (
  resource: keyof FieldPermissionConfig,
  fieldName: string
): boolean => {
  const denylist = SENSITIVE_FIELD_DENYLIST[resource];
  if (!denylist) {
    return false;
  }
  return denylist.includes(fieldName);
};

/**
 * Apply the sensitive-field denylist to an access map in place.
 * Any sensitive field present in the map is forced to 'none'.
 * Returns the same map for chaining.
 */
export const enforceSensitiveDenylist = (
  resource: keyof FieldPermissionConfig,
  accessMap: Record<string, FieldAccessLevel>
): Record<string, FieldAccessLevel> => {
  const denylist = SENSITIVE_FIELD_DENYLIST[resource];
  if (!denylist || denylist.length === 0) {
    return accessMap;
  }
  for (const field of denylist) {
    accessMap[field] = 'none';
  }
  return accessMap;
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
  // Sensitive fields are hard-denied regardless of role or defaults.
  if (isSensitiveField(resource, fieldName)) {
    return 'none';
  }

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
 * Sensitive fields are forced to 'none' regardless of configuration.
 */
export const getFieldAccessMap = (
  resource: keyof FieldPermissionConfig,
  role: UserRole
): Record<string, FieldAccessLevel> => {
  const resourceConfig = defaultFieldPermissions[resource];
  if (!resourceConfig) {
    return {};
  }

  const map = { ...resourceConfig[role] };
  return enforceSensitiveDenylist(resource, map);
};
