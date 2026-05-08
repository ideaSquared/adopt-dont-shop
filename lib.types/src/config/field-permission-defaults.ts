/**
 * Default field permission configurations for all resources.
 *
 * These defaults define baseline field access levels per role.
 * Database overrides take precedence over these defaults.
 *
 * Convention: Any field not listed defaults to 'none' (secure by default).
 * Field names MUST exactly match the keys emitted by the backend API —
 * i.e., the Sequelize model's `toJSON()` output. All four models (Users,
 * Rescues, Pets, Applications) now emit camelCase.
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
/**
 * snake_case request-body aliases for the user resource.
 *
 * The User Sequelize model emits camelCase in toJSON(), so response masking
 * uses camelCase keys. However, `userValidation.updateProfile` validates
 * snake_case body fields (first_name, last_name, phone_number,
 * profile_image_url). fieldWriteGuard checks request body keys against this
 * map, so without aliases those writes would be falsely rejected as 'none'.
 * Each alias carries the same access level as its camelCase counterpart.
 */
type UserRequestAliases = {
  first_name: FieldAccessLevel;
  last_name: FieldAccessLevel;
  phone_number: FieldAccessLevel;
  profile_image_url: FieldAccessLevel;
};

const userRequestAliases: Record<UserRole, UserRequestAliases> = {
  admin: {
    first_name: WRITE,
    last_name: WRITE,
    phone_number: WRITE,
    profile_image_url: WRITE,
  },
  moderator: {
    first_name: READ,
    last_name: READ,
    phone_number: NONE,
    profile_image_url: READ,
  },
  rescue_staff: {
    first_name: READ,
    last_name: READ,
    phone_number: NONE,
    profile_image_url: READ,
  },
  adopter: {
    first_name: WRITE,
    last_name: WRITE,
    phone_number: WRITE,
    profile_image_url: WRITE,
  },
  super_admin: {
    first_name: WRITE,
    last_name: WRITE,
    phone_number: WRITE,
    profile_image_url: WRITE,
  },
};

const userFieldPermissions: FieldPermissionConfig['users'] = {
  admin: {
    userId: READ,
    firstName: WRITE,
    lastName: WRITE,
    email: WRITE,
    phoneNumber: WRITE,
    dateOfBirth: READ,
    bio: WRITE,
    location: WRITE,
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
    // Request-body snake_case aliases
    ...userRequestAliases.admin,
  },
  moderator: {
    userId: READ,
    firstName: READ,
    lastName: READ,
    email: READ,
    phoneNumber: NONE,
    dateOfBirth: NONE,
    bio: READ,
    location: READ,
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
    // Request-body snake_case aliases
    ...userRequestAliases.moderator,
  },
  rescue_staff: {
    userId: READ,
    firstName: READ,
    lastName: READ,
    email: READ,
    phoneNumber: NONE,
    dateOfBirth: NONE,
    bio: READ,
    location: READ,
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
    // Request-body snake_case aliases
    ...userRequestAliases.rescue_staff,
  },
  adopter: {
    userId: READ,
    // Adopter can edit own profile fields. Ownership is enforced by
    // requirePermissionOrOwnership in the route before fieldWriteGuard.
    firstName: WRITE,
    lastName: WRITE,
    bio: WRITE,
    location: WRITE,
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
    // Request-body snake_case aliases
    ...userRequestAliases.adopter,
  },
  super_admin: {
    userId: READ,
    firstName: WRITE,
    lastName: WRITE,
    email: WRITE,
    phoneNumber: WRITE,
    dateOfBirth: READ,
    bio: WRITE,
    location: WRITE,
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
    password: NONE,
    resetToken: NONE,
    resetTokenExpiration: NONE,
    resetTokenForceFlag: NONE,
    verificationToken: NONE,
    verificationTokenExpiresAt: NONE,
    twoFactorSecret: NONE,
    backupCodes: NONE,
    lockedUntil: READ,
    ...userRequestAliases.super_admin,
  },
};

/**
 * Application resource field permissions
 *
 * The Application model now emits camelCase from toJSON() (same as User/Rescue),
 * so all field keys here are camelCase. Both the response shape (fieldMask) and
 * the request body shape (fieldWriteGuard) use the same camelCase keys.
 *
 * Interview notes, home visit notes, and scoring are restricted.
 * Applicants see their own application data but not internal notes.
 */
const applicationFieldPermissions: FieldPermissionConfig['applications'] = {
  admin: {
    id: READ,
    petId: WRITE,
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
    answers: WRITE,
    references: WRITE,
    priority: WRITE,
    notes: WRITE,
    tags: WRITE,
    interviewNotes: WRITE,
    homeVisitNotes: WRITE,
    score: WRITE,
  },
  moderator: {
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
    answers: READ,
    references: READ,
    priority: READ,
    notes: READ,
    tags: READ,
    interviewNotes: READ,
    homeVisitNotes: READ,
    score: READ,
  },
  rescue_staff: {
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
    answers: READ,
    references: READ,
    priority: WRITE,
    notes: WRITE,
    tags: WRITE,
    interviewNotes: WRITE,
    homeVisitNotes: WRITE,
    score: WRITE,
  },
  adopter: {
    id: READ,
    petId: WRITE,
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
    answers: WRITE,
    references: WRITE,
    priority: NONE,
    notes: WRITE,
    tags: NONE,
    // Internal staff assessment fields are NEVER writable by adopters
    interviewNotes: NONE,
    homeVisitNotes: NONE,
    score: NONE,
    // ADS-535: applicant must declare references-consent on submit; the
    // model hook rejects SUBMITTED rows without it.
    referencesConsented: WRITE,
  },
  super_admin: {
    id: READ,
    petId: WRITE,
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
    answers: WRITE,
    references: WRITE,
    priority: WRITE,
    notes: WRITE,
    tags: WRITE,
    interviewNotes: WRITE,
    homeVisitNotes: WRITE,
    score: WRITE,
  },
};

/**
 * Pet resource field permissions
 *
 * Pet model uses camelCase attributes with individual `field:` column
 * mappings — toJSON emits camelCase, so defaults use camelCase keys.
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
    petId: READ,
    distance: READ,
    name: WRITE,
    rescueId: READ,
    shortDescription: WRITE,
    longDescription: WRITE,
    ageYears: WRITE,
    ageMonths: WRITE,
    ageGroup: WRITE,
    gender: WRITE,
    status: WRITE,
    type: WRITE,
    breed: WRITE,
    secondaryBreed: WRITE,
    weightKg: WRITE,
    size: WRITE,
    color: WRITE,
    markings: WRITE,
    microchipId: WRITE,
    archived: WRITE,
    featured: WRITE,
    priorityListing: WRITE,
    adoptionFee: WRITE,
    specialNeeds: WRITE,
    specialNeedsDescription: WRITE,
    houseTrained: WRITE,
    goodWithChildren: WRITE,
    goodWithDogs: WRITE,
    goodWithCats: WRITE,
    goodWithSmallAnimals: WRITE,
    energyLevel: WRITE,
    exerciseNeeds: WRITE,
    groomingNeeds: WRITE,
    trainingNotes: WRITE,
    temperament: WRITE,
    medicalNotes: WRITE,
    behavioralNotes: WRITE,
    surrenderReason: WRITE,
    intakeDate: WRITE,
    vaccinationStatus: WRITE,
    vaccinationDate: WRITE,
    spayNeuterStatus: WRITE,
    spayNeuterDate: WRITE,
    lastVetCheckup: WRITE,
    images: WRITE,
    videos: WRITE,
    location: WRITE,
    availableSince: WRITE,
    adoptedDate: WRITE,
    fosterStartDate: WRITE,
    fosterEndDate: WRITE,
    viewCount: READ,
    favoriteCount: READ,
    applicationCount: READ,
    tags: WRITE,
    createdAt: READ,
    updatedAt: READ,
  },
  moderator: {
    petId: READ,
    distance: READ,
    name: READ,
    rescueId: READ,
    shortDescription: READ,
    longDescription: READ,
    ageYears: READ,
    ageMonths: READ,
    ageGroup: READ,
    gender: READ,
    status: READ,
    type: READ,
    breed: READ,
    secondaryBreed: READ,
    weightKg: READ,
    size: READ,
    color: READ,
    markings: READ,
    microchipId: READ,
    archived: READ,
    featured: READ,
    priorityListing: READ,
    adoptionFee: READ,
    specialNeeds: READ,
    specialNeedsDescription: READ,
    houseTrained: READ,
    goodWithChildren: READ,
    goodWithDogs: READ,
    goodWithCats: READ,
    goodWithSmallAnimals: READ,
    energyLevel: READ,
    exerciseNeeds: READ,
    groomingNeeds: READ,
    trainingNotes: READ,
    temperament: READ,
    medicalNotes: READ,
    behavioralNotes: READ,
    surrenderReason: READ,
    intakeDate: READ,
    vaccinationStatus: READ,
    vaccinationDate: READ,
    spayNeuterStatus: READ,
    spayNeuterDate: READ,
    lastVetCheckup: READ,
    images: READ,
    videos: READ,
    location: READ,
    availableSince: READ,
    adoptedDate: READ,
    fosterStartDate: READ,
    fosterEndDate: READ,
    viewCount: READ,
    favoriteCount: READ,
    applicationCount: READ,
    tags: READ,
    createdAt: READ,
    updatedAt: READ,
  },
  rescue_staff: {
    petId: READ,
    distance: READ,
    name: WRITE,
    rescueId: READ,
    shortDescription: WRITE,
    longDescription: WRITE,
    ageYears: WRITE,
    ageMonths: WRITE,
    ageGroup: WRITE,
    gender: WRITE,
    status: WRITE,
    type: WRITE,
    breed: WRITE,
    secondaryBreed: WRITE,
    weightKg: WRITE,
    size: WRITE,
    color: WRITE,
    markings: WRITE,
    microchipId: WRITE,
    archived: WRITE,
    featured: WRITE,
    priorityListing: WRITE,
    adoptionFee: WRITE,
    specialNeeds: WRITE,
    specialNeedsDescription: WRITE,
    houseTrained: WRITE,
    goodWithChildren: WRITE,
    goodWithDogs: WRITE,
    goodWithCats: WRITE,
    goodWithSmallAnimals: WRITE,
    energyLevel: WRITE,
    exerciseNeeds: WRITE,
    groomingNeeds: WRITE,
    trainingNotes: WRITE,
    temperament: WRITE,
    medicalNotes: WRITE,
    behavioralNotes: WRITE,
    surrenderReason: WRITE,
    intakeDate: WRITE,
    vaccinationStatus: WRITE,
    vaccinationDate: WRITE,
    spayNeuterStatus: WRITE,
    spayNeuterDate: WRITE,
    lastVetCheckup: WRITE,
    images: WRITE,
    videos: WRITE,
    location: WRITE,
    availableSince: WRITE,
    adoptedDate: WRITE,
    fosterStartDate: WRITE,
    fosterEndDate: WRITE,
    viewCount: READ,
    favoriteCount: READ,
    applicationCount: READ,
    tags: WRITE,
    createdAt: READ,
    updatedAt: READ,
  },
  adopter: {
    // Public pet-browsing view: basic details only. No internal notes,
    // no medical/behavioral history, no surrender reason, no microchip.
    petId: READ,
    distance: READ,
    name: READ,
    rescueId: READ,
    shortDescription: READ,
    longDescription: READ,
    ageYears: READ,
    ageMonths: READ,
    ageGroup: READ,
    gender: READ,
    status: READ,
    type: READ,
    breed: READ,
    secondaryBreed: READ,
    weightKg: READ,
    size: READ,
    color: READ,
    markings: READ,
    adoptionFee: READ,
    specialNeeds: READ,
    specialNeedsDescription: READ,
    houseTrained: READ,
    goodWithChildren: READ,
    goodWithDogs: READ,
    goodWithCats: READ,
    goodWithSmallAnimals: READ,
    energyLevel: READ,
    exerciseNeeds: READ,
    groomingNeeds: READ,
    temperament: READ,
    vaccinationStatus: READ,
    spayNeuterStatus: READ,
    images: READ,
    videos: READ,
    availableSince: READ,
    tags: READ,
    createdAt: READ,
    updatedAt: READ,
    // Restricted fields
    microchipId: NONE,
    medicalNotes: NONE,
    behavioralNotes: NONE,
    trainingNotes: NONE,
    surrenderReason: NONE,
    intakeDate: NONE,
    vaccinationDate: NONE,
    spayNeuterDate: NONE,
    lastVetCheckup: NONE,
    location: NONE,
    archived: NONE,
    featured: NONE,
    priorityListing: NONE,
    adoptedDate: NONE,
    fosterStartDate: NONE,
    fosterEndDate: NONE,
    viewCount: NONE,
    favoriteCount: NONE,
    applicationCount: NONE,
  },
  super_admin: {
    petId: READ,
    distance: READ,
    name: WRITE,
    rescueId: READ,
    shortDescription: WRITE,
    longDescription: WRITE,
    ageYears: WRITE,
    ageMonths: WRITE,
    ageGroup: WRITE,
    gender: WRITE,
    status: WRITE,
    type: WRITE,
    breed: WRITE,
    secondaryBreed: WRITE,
    weightKg: WRITE,
    size: WRITE,
    color: WRITE,
    markings: WRITE,
    microchipId: WRITE,
    archived: WRITE,
    featured: WRITE,
    priorityListing: WRITE,
    adoptionFee: WRITE,
    specialNeeds: WRITE,
    specialNeedsDescription: WRITE,
    houseTrained: WRITE,
    goodWithChildren: WRITE,
    goodWithDogs: WRITE,
    goodWithCats: WRITE,
    goodWithSmallAnimals: WRITE,
    energyLevel: WRITE,
    exerciseNeeds: WRITE,
    groomingNeeds: WRITE,
    trainingNotes: WRITE,
    temperament: WRITE,
    medicalNotes: WRITE,
    behavioralNotes: WRITE,
    surrenderReason: WRITE,
    intakeDate: WRITE,
    vaccinationStatus: WRITE,
    vaccinationDate: WRITE,
    spayNeuterStatus: WRITE,
    spayNeuterDate: WRITE,
    lastVetCheckup: WRITE,
    images: WRITE,
    videos: WRITE,
    location: WRITE,
    availableSince: WRITE,
    adoptedDate: WRITE,
    fosterStartDate: WRITE,
    fosterEndDate: WRITE,
    viewCount: READ,
    favoriteCount: READ,
    applicationCount: READ,
    tags: WRITE,
    createdAt: READ,
    updatedAt: READ,
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
    companiesHouseNumber: WRITE,
    charityRegistrationNumber: WRITE,
    contactPerson: WRITE,
    contactTitle: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    status: WRITE,
    verifiedAt: READ,
    verifiedBy: READ,
    verificationSource: READ,
    verificationFailureReason: READ,
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
    companiesHouseNumber: NONE,
    charityRegistrationNumber: NONE,
    contactPerson: READ,
    contactTitle: READ,
    contactEmail: READ,
    contactPhone: READ,
    status: READ,
    verifiedAt: READ,
    verifiedBy: READ,
    verificationSource: READ,
    verificationFailureReason: NONE,
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
    companiesHouseNumber: READ,
    charityRegistrationNumber: READ,
    contactPerson: WRITE,
    contactTitle: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    status: READ,
    verifiedAt: READ,
    verifiedBy: NONE,
    verificationSource: READ,
    verificationFailureReason: READ,
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
    companiesHouseNumber: NONE,
    charityRegistrationNumber: NONE,
    contactPerson: READ,
    contactTitle: READ,
    contactEmail: READ,
    contactPhone: READ,
    status: READ,
    verifiedAt: NONE,
    verifiedBy: NONE,
    verificationSource: NONE,
    verificationFailureReason: NONE,
    settings: NONE,
    createdAt: NONE,
    updatedAt: NONE,
  },
  super_admin: {
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
    companiesHouseNumber: WRITE,
    charityRegistrationNumber: WRITE,
    contactPerson: WRITE,
    contactTitle: WRITE,
    contactEmail: WRITE,
    contactPhone: WRITE,
    status: WRITE,
    verifiedAt: READ,
    verifiedBy: READ,
    verificationSource: READ,
    verificationFailureReason: READ,
    settings: WRITE,
    createdAt: READ,
    updatedAt: READ,
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
