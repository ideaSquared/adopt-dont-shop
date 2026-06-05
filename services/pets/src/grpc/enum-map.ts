// Mappers between the Postgres ENUM string values (`pet_status`,
// `pet_type`, `pet_gender`, `pet_size`, `pet_age_group`) and the proto
// enum integers generated under `PetsV1`. Same shape as
// services/auth/src/grpc/enum-map.ts.
//
// The DB-side values are the canonical source of truth (they match the
// migration ENUMs from Phase 3.2), so the maps are one-line switch
// tables and the test file asserts every variant exhaustively.

import { PetsV1 } from '@adopt-dont-shop/proto';

export type PetStatusDb =
  | 'available'
  | 'pending'
  | 'adopted'
  | 'foster'
  | 'medical_hold'
  | 'behavioral_hold'
  | 'not_available'
  | 'deceased';

export type PetTypeDb =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'bird'
  | 'reptile'
  | 'small_mammal'
  | 'fish'
  | 'other';

export type PetGenderDb = 'male' | 'female' | 'unknown';
export type PetSizeDb = 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
export type PetAgeGroupDb = 'baby' | 'young' | 'adult' | 'senior';

// --- status ----------------------------------------------------------

const STATUS_TO_DB: Record<PetsV1.PetStatus, PetStatusDb | null> = {
  [PetsV1.PetStatus.PET_STATUS_UNSPECIFIED]: null,
  [PetsV1.PetStatus.PET_STATUS_AVAILABLE]: 'available',
  [PetsV1.PetStatus.PET_STATUS_PENDING]: 'pending',
  [PetsV1.PetStatus.PET_STATUS_ADOPTED]: 'adopted',
  [PetsV1.PetStatus.PET_STATUS_FOSTER]: 'foster',
  [PetsV1.PetStatus.PET_STATUS_MEDICAL_HOLD]: 'medical_hold',
  [PetsV1.PetStatus.PET_STATUS_BEHAVIORAL_HOLD]: 'behavioral_hold',
  [PetsV1.PetStatus.PET_STATUS_NOT_AVAILABLE]: 'not_available',
  [PetsV1.PetStatus.PET_STATUS_DECEASED]: 'deceased',
  [PetsV1.PetStatus.UNRECOGNIZED]: null,
};

const DB_TO_STATUS: Record<PetStatusDb, PetsV1.PetStatus> = {
  available: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
  pending: PetsV1.PetStatus.PET_STATUS_PENDING,
  adopted: PetsV1.PetStatus.PET_STATUS_ADOPTED,
  foster: PetsV1.PetStatus.PET_STATUS_FOSTER,
  medical_hold: PetsV1.PetStatus.PET_STATUS_MEDICAL_HOLD,
  behavioral_hold: PetsV1.PetStatus.PET_STATUS_BEHAVIORAL_HOLD,
  not_available: PetsV1.PetStatus.PET_STATUS_NOT_AVAILABLE,
  deceased: PetsV1.PetStatus.PET_STATUS_DECEASED,
};

export function statusToDb(proto: PetsV1.PetStatus): PetStatusDb {
  const db = STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid PetStatus proto value: ${proto}`);
  }
  return db;
}

export function statusFromDb(db: string): PetsV1.PetStatus {
  const proto = DB_TO_STATUS[db as PetStatusDb];
  if (!proto) {
    throw new Error(`unknown pet_status value: ${db}`);
  }
  return proto;
}

// --- type ------------------------------------------------------------

const TYPE_TO_DB: Record<PetsV1.PetType, PetTypeDb | null> = {
  [PetsV1.PetType.PET_TYPE_UNSPECIFIED]: null,
  [PetsV1.PetType.PET_TYPE_DOG]: 'dog',
  [PetsV1.PetType.PET_TYPE_CAT]: 'cat',
  [PetsV1.PetType.PET_TYPE_RABBIT]: 'rabbit',
  [PetsV1.PetType.PET_TYPE_BIRD]: 'bird',
  [PetsV1.PetType.PET_TYPE_REPTILE]: 'reptile',
  [PetsV1.PetType.PET_TYPE_SMALL_MAMMAL]: 'small_mammal',
  [PetsV1.PetType.PET_TYPE_FISH]: 'fish',
  [PetsV1.PetType.PET_TYPE_OTHER]: 'other',
  [PetsV1.PetType.UNRECOGNIZED]: null,
};

const DB_TO_TYPE: Record<PetTypeDb, PetsV1.PetType> = {
  dog: PetsV1.PetType.PET_TYPE_DOG,
  cat: PetsV1.PetType.PET_TYPE_CAT,
  rabbit: PetsV1.PetType.PET_TYPE_RABBIT,
  bird: PetsV1.PetType.PET_TYPE_BIRD,
  reptile: PetsV1.PetType.PET_TYPE_REPTILE,
  small_mammal: PetsV1.PetType.PET_TYPE_SMALL_MAMMAL,
  fish: PetsV1.PetType.PET_TYPE_FISH,
  other: PetsV1.PetType.PET_TYPE_OTHER,
};

export function typeToDb(proto: PetsV1.PetType): PetTypeDb {
  const db = TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid PetType proto value: ${proto}`);
  }
  return db;
}

export function typeFromDb(db: string): PetsV1.PetType {
  const proto = DB_TO_TYPE[db as PetTypeDb];
  if (!proto) {
    throw new Error(`unknown pet_type value: ${db}`);
  }
  return proto;
}

// --- gender ----------------------------------------------------------

const GENDER_TO_DB: Record<PetsV1.PetGender, PetGenderDb | null> = {
  [PetsV1.PetGender.PET_GENDER_UNSPECIFIED]: null,
  [PetsV1.PetGender.PET_GENDER_MALE]: 'male',
  [PetsV1.PetGender.PET_GENDER_FEMALE]: 'female',
  [PetsV1.PetGender.PET_GENDER_UNKNOWN]: 'unknown',
  [PetsV1.PetGender.UNRECOGNIZED]: null,
};

const DB_TO_GENDER: Record<PetGenderDb, PetsV1.PetGender> = {
  male: PetsV1.PetGender.PET_GENDER_MALE,
  female: PetsV1.PetGender.PET_GENDER_FEMALE,
  unknown: PetsV1.PetGender.PET_GENDER_UNKNOWN,
};

// UNSPECIFIED is a legal "leave unchanged" sentinel for gender on
// Create/Update — callers that omit it get the DB default 'unknown'.
export function genderToDb(proto: PetsV1.PetGender): PetGenderDb {
  const db = GENDER_TO_DB[proto];
  return db ?? 'unknown';
}

export function genderFromDb(db: string): PetsV1.PetGender {
  const proto = DB_TO_GENDER[db as PetGenderDb];
  if (!proto) {
    throw new Error(`unknown pet_gender value: ${db}`);
  }
  return proto;
}

// --- size ------------------------------------------------------------

const SIZE_TO_DB: Record<PetsV1.PetSize, PetSizeDb | null> = {
  [PetsV1.PetSize.PET_SIZE_UNSPECIFIED]: null,
  [PetsV1.PetSize.PET_SIZE_EXTRA_SMALL]: 'extra_small',
  [PetsV1.PetSize.PET_SIZE_SMALL]: 'small',
  [PetsV1.PetSize.PET_SIZE_MEDIUM]: 'medium',
  [PetsV1.PetSize.PET_SIZE_LARGE]: 'large',
  [PetsV1.PetSize.PET_SIZE_EXTRA_LARGE]: 'extra_large',
  [PetsV1.PetSize.UNRECOGNIZED]: null,
};

const DB_TO_SIZE: Record<PetSizeDb, PetsV1.PetSize> = {
  extra_small: PetsV1.PetSize.PET_SIZE_EXTRA_SMALL,
  small: PetsV1.PetSize.PET_SIZE_SMALL,
  medium: PetsV1.PetSize.PET_SIZE_MEDIUM,
  large: PetsV1.PetSize.PET_SIZE_LARGE,
  extra_large: PetsV1.PetSize.PET_SIZE_EXTRA_LARGE,
};

export function sizeToDb(proto: PetsV1.PetSize): PetSizeDb {
  const db = SIZE_TO_DB[proto];
  return db ?? 'medium';
}

export function sizeFromDb(db: string): PetsV1.PetSize {
  const proto = DB_TO_SIZE[db as PetSizeDb];
  if (!proto) {
    throw new Error(`unknown pet_size value: ${db}`);
  }
  return proto;
}

// --- age group -------------------------------------------------------

const AGE_GROUP_TO_DB: Record<PetsV1.PetAgeGroup, PetAgeGroupDb | null> = {
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED]: null,
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY]: 'baby',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_YOUNG]: 'young',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT]: 'adult',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR]: 'senior',
  [PetsV1.PetAgeGroup.UNRECOGNIZED]: null,
};

const DB_TO_AGE_GROUP: Record<PetAgeGroupDb, PetsV1.PetAgeGroup> = {
  baby: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY,
  young: PetsV1.PetAgeGroup.PET_AGE_GROUP_YOUNG,
  adult: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  senior: PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR,
};

export function ageGroupToDb(proto: PetsV1.PetAgeGroup): PetAgeGroupDb {
  const db = AGE_GROUP_TO_DB[proto];
  return db ?? 'adult';
}

export function ageGroupFromDb(db: string): PetsV1.PetAgeGroup {
  const proto = DB_TO_AGE_GROUP[db as PetAgeGroupDb];
  if (!proto) {
    throw new Error(`unknown pet_age_group value: ${db}`);
  }
  return proto;
}

// Exported for exhaustiveness tests.
export const ALL_PET_STATUSES: ReadonlyArray<PetStatusDb> = [
  'available',
  'pending',
  'adopted',
  'foster',
  'medical_hold',
  'behavioral_hold',
  'not_available',
  'deceased',
];

export const ALL_PET_TYPES: ReadonlyArray<PetTypeDb> = [
  'dog',
  'cat',
  'rabbit',
  'bird',
  'reptile',
  'small_mammal',
  'fish',
  'other',
];
