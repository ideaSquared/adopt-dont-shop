// Canonical dev/e2e fixtures for the pets.* schema.
//
// Recreates the headline pet catalogue the old service.backend seeder
// populated, attached to the seeded rescues. The pet ids are PINNED to
// the values e2e/helpers/seeds.ts SEEDED_PET_IDS expects so the read-side
// fixtures resolve. rescue_id / created_by are the FIXED ids from the
// rescue + auth seeds (application-side link, no cross-schema FK).

export type SeedPet = {
  petId: string;
  rescueId: string;
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'reptile' | 'small_mammal' | 'fish' | 'other';
  gender: 'male' | 'female' | 'unknown';
  size: 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
  ageGroup: 'baby' | 'young' | 'adult' | 'senior';
  status: 'available' | 'pending' | 'adopted' | 'foster' | 'medical_hold' | 'not_available';
  shortDescription: string;
};

// Pinned rescue ids (see services/rescue/src/db/seed-data.ts).
const PAWS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000001';
const HAPPY_TAILS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000002';

// Pinned rescue-staff user id used as created_by (the Paws manager).
export const PAWS_MANAGER_ID = 'b0000000-0000-4000-8000-000000000001';

export const SEED_PETS: readonly SeedPet[] = [
  // Pet ids match e2e/helpers/seeds.ts SEEDED_PET_IDS.
  {
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    rescueId: PAWS_RESCUE_ID,
    name: 'Buddy',
    type: 'dog',
    gender: 'male',
    size: 'large',
    ageGroup: 'adult',
    status: 'available',
    shortDescription: 'A friendly Labrador looking for an active family.',
  },
  {
    petId: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f',
    rescueId: PAWS_RESCUE_ID,
    name: 'Luna',
    type: 'cat',
    gender: 'female',
    size: 'small',
    ageGroup: 'young',
    status: 'pending',
    shortDescription: 'A gentle tabby cat, currently under adoption review.',
  },
  {
    petId: 'e2e0a000-0000-4000-8000-000000000001',
    // Paws-owned so the rescue.manager persona (Paws staff) can read this
    // adopted pet — adopted pets are hidden from non-owning callers
    // (handlers.ts PUBLIC_HIDDEN_STATUSES), which the archive-adopted-pet
    // e2e spec exercises.
    rescueId: PAWS_RESCUE_ID,
    name: 'Max',
    type: 'dog',
    gender: 'male',
    size: 'medium',
    ageGroup: 'senior',
    status: 'adopted',
    shortDescription: 'A senior terrier who has found his forever home.',
  },
  {
    petId: 'e2e0a000-0000-4000-8000-000000000002',
    rescueId: HAPPY_TAILS_RESCUE_ID,
    name: 'Bella',
    type: 'dog',
    gender: 'female',
    size: 'medium',
    ageGroup: 'adult',
    status: 'not_available',
    shortDescription: 'On hold pending a home check.',
  },
];

// John Smith (the seeded adopter — id from the auth seed). Used as the
// owner of the pre-seeded favourites the client/swipe-and-favourite
// journey reads back.
export const SEEDED_ADOPTER_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';

export type SeedFavorite = {
  id: string;
  userId: string;
  petId: string;
};

// Two favourites for John Smith, pinned to existing catalogue pets so the
// /favorites page renders cards and the e2e can delete one and watch the
// count drop. Fixed ids so the seed is idempotent (ON CONFLICT revives a
// row a prior e2e run soft-deleted).
export const SEED_FAVORITES: readonly SeedFavorite[] = [
  {
    id: 'f0000000-0000-4000-8000-000000000001',
    userId: SEEDED_ADOPTER_ID,
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78', // Buddy (available)
  },
  {
    id: 'f0000000-0000-4000-8000-000000000002',
    userId: SEEDED_ADOPTER_ID,
    petId: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f', // Luna (pending)
  },
];
