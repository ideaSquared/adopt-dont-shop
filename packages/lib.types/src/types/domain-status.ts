// ---------------------------------------------------------------------------
// Domain status types — canonical value sets shared across apps and libs
// ---------------------------------------------------------------------------
//
// These are the single source of truth for status/stage value sets.
// Domain libs (lib.pets, lib.rescue, etc.) should validate against these
// using Zod schemas, e.g.: `z.enum(USER_STATUSES)`.

export const USER_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'pending_verification',
  'deactivated',
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PET_STATUSES = [
  'available',
  'pending',
  'adopted',
  'foster',
  'medical_hold',
  'behavioral_hold',
  'on_hold',
  'medical_care',
  'not_available',
  'deceased',
] as const;
export type PetStatus = (typeof PET_STATUSES)[number];

export const PET_TYPES = [
  'dog',
  'cat',
  'rabbit',
  'bird',
  'reptile',
  'small_mammal',
  'fish',
  'other',
] as const;
export type PetType = (typeof PET_TYPES)[number];

export const PET_GENDERS = ['male', 'female', 'unknown'] as const;
export type PetGender = (typeof PET_GENDERS)[number];

export const PET_SIZES = ['extra_small', 'small', 'medium', 'large', 'extra_large'] as const;
export type PetSize = (typeof PET_SIZES)[number];

export const PET_AGE_GROUPS = ['baby', 'young', 'adult', 'senior'] as const;
export type PetAgeGroup = (typeof PET_AGE_GROUPS)[number];

export const PET_ENERGY_LEVELS = ['low', 'medium', 'high', 'very_high'] as const;
export type PetEnergyLevel = (typeof PET_ENERGY_LEVELS)[number];

export const RESCUE_STATUSES = [
  'pending',
  'verified',
  'suspended',
  'inactive',
  'rejected',
] as const;
export type RescueStatus = (typeof RESCUE_STATUSES)[number];

export const RESCUE_TYPES = ['individual', 'organization'] as const;
export type RescueType = (typeof RESCUE_TYPES)[number];

export const APPLICATION_STATUSES = ['submitted', 'approved', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STAGES = [
  'pending',
  'reviewing',
  'visiting',
  'deciding',
  'resolved',
  'withdrawn',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];
