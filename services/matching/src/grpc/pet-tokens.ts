// Shared lowercase-token <-> proto-enum lookup tables for the pets
// PetType / PetSize / PetAgeGroup enums. Both the filters_json the SPA
// sends (Recommend, SearchPets) and the lowercase tokens the top-picks
// surface returns (TopPick.type/size/age_group) use this exact
// vocabulary, so the tables live here once rather than duplicated per
// handler file.

import { PetsV1 } from '@adopt-dont-shop/proto';

export const SPECIES_TO_TYPE: Record<string, PetsV1.PetType> = {
  dog: PetsV1.PetType.PET_TYPE_DOG,
  cat: PetsV1.PetType.PET_TYPE_CAT,
  rabbit: PetsV1.PetType.PET_TYPE_RABBIT,
  bird: PetsV1.PetType.PET_TYPE_BIRD,
  reptile: PetsV1.PetType.PET_TYPE_REPTILE,
  small_mammal: PetsV1.PetType.PET_TYPE_SMALL_MAMMAL,
  fish: PetsV1.PetType.PET_TYPE_FISH,
  other: PetsV1.PetType.PET_TYPE_OTHER,
};

export const SIZE_TO_ENUM: Record<string, PetsV1.PetSize> = {
  extra_small: PetsV1.PetSize.PET_SIZE_EXTRA_SMALL,
  small: PetsV1.PetSize.PET_SIZE_SMALL,
  medium: PetsV1.PetSize.PET_SIZE_MEDIUM,
  large: PetsV1.PetSize.PET_SIZE_LARGE,
  extra_large: PetsV1.PetSize.PET_SIZE_EXTRA_LARGE,
};

export const AGE_GROUP_TO_ENUM: Record<string, PetsV1.PetAgeGroup> = {
  baby: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY,
  young: PetsV1.PetAgeGroup.PET_AGE_GROUP_YOUNG,
  adult: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  senior: PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR,
};

// PetType enum → the lowercase species token PetCandidate.species /
// TopPick.type carry. UNSPECIFIED / UNRECOGNIZED fall back to 'unknown'.
export const TYPE_TO_SPECIES: Record<PetsV1.PetType, string> = {
  [PetsV1.PetType.PET_TYPE_UNSPECIFIED]: 'unknown',
  [PetsV1.PetType.PET_TYPE_DOG]: 'dog',
  [PetsV1.PetType.PET_TYPE_CAT]: 'cat',
  [PetsV1.PetType.PET_TYPE_RABBIT]: 'rabbit',
  [PetsV1.PetType.PET_TYPE_BIRD]: 'bird',
  [PetsV1.PetType.PET_TYPE_REPTILE]: 'reptile',
  [PetsV1.PetType.PET_TYPE_SMALL_MAMMAL]: 'small_mammal',
  [PetsV1.PetType.PET_TYPE_FISH]: 'fish',
  [PetsV1.PetType.PET_TYPE_OTHER]: 'other',
  [PetsV1.PetType.UNRECOGNIZED]: 'unknown',
};

export const SIZE_TO_TOKEN: Record<PetsV1.PetSize, string> = {
  [PetsV1.PetSize.PET_SIZE_UNSPECIFIED]: 'unknown',
  [PetsV1.PetSize.PET_SIZE_EXTRA_SMALL]: 'extra_small',
  [PetsV1.PetSize.PET_SIZE_SMALL]: 'small',
  [PetsV1.PetSize.PET_SIZE_MEDIUM]: 'medium',
  [PetsV1.PetSize.PET_SIZE_LARGE]: 'large',
  [PetsV1.PetSize.PET_SIZE_EXTRA_LARGE]: 'extra_large',
  [PetsV1.PetSize.UNRECOGNIZED]: 'unknown',
};

export const AGE_GROUP_TO_TOKEN: Record<PetsV1.PetAgeGroup, string> = {
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED]: 'unknown',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY]: 'baby',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_YOUNG]: 'young',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT]: 'adult',
  [PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR]: 'senior',
  [PetsV1.PetAgeGroup.UNRECOGNIZED]: 'unknown',
};

export function lookupToken<T>(value: unknown, table: Record<string, T>): T | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return table[value.trim().toLowerCase()];
}
