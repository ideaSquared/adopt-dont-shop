import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────
//
// Schemas mirror the backend's Sequelize enum definitions in
// `service.backend/src/models/Pet.ts`. Keep them in sync — any value the
// backend can emit but the schema rejects will throw inside `normalisePet`
// and surface as "empty pet list" in the UI (no card renders, search
// looks broken). When the backend grows a new variant, add it here in
// the same commit.

export const PetStatusSchema = z.enum([
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
]);

export const PetTypeSchema = z.enum([
  'dog',
  'cat',
  'rabbit',
  'bird',
  'reptile',
  'small_mammal',
  'fish',
  'other',
]);

export const PetGenderSchema = z.enum(['male', 'female', 'unknown']);

export const PetSizeSchema = z.enum(['extra_small', 'small', 'medium', 'large', 'extra_large']);

export const PetAgeGroupSchema = z.enum(['baby', 'young', 'adult', 'senior']);

export const PetEnergyLevelSchema = z.enum(['low', 'medium', 'high', 'very_high']);

export const PetVaccinationStatusSchema = z.enum([
  'up_to_date',
  'partial',
  'not_vaccinated',
  'unknown',
]);

export const PetSpayNeuterStatusSchema = z.enum([
  'spayed',
  'neutered',
  'not_altered',
  'intact',
  'unknown',
]);

// ── Adoption fee ──────────────────────────────────────────────────────────────
//
// The fee is captured as a string in the create/update payload (the backend
// further normalises it into `adoption_fee_minor`/`adoption_fee_currency`),
// but the value must encode a non-negative monetary amount with at most two
// decimal places. Anything else (`"free"`, `"£150"`, `"tbd"`) should be
// rejected at the form boundary — see ADS-578.
export const AdoptionFeeStringSchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    'Adoption fee must be a non-negative number with up to 2 decimal places'
  );

// ── Sub-schemas ───────────────────────────────────────────────────────────────

export const PetImageSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
  image_id: z.string(),
  is_primary: z.boolean(),
  order_index: z.number(),
  uploaded_at: z.string(),
  thumbnail_url: z.string().optional(),
});

export const PetVideoSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
  video_id: z.string(),
  order_index: z.number(),
  uploaded_at: z.string(),
  thumbnail_url: z.string().optional(),
});

export const PetLocationSchema = z.object({
  type: z.string(),
  coordinates: z.tuple([z.number(), z.number()]),
  crs: z
    .object({
      type: z.string(),
      properties: z.object({ name: z.string() }),
    })
    .optional(),
});

export const PetRescueSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

// ── Pet schema ─────────────────────────────────────────────────────────────────
// Most fields are optional because different API endpoints return different
// subsets of the full pet record.

export const PetSchema = z.object({
  pet_id: z.string(),
  name: z.string(),
  rescue_id: z.string().optional(),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  age_years: z.number().optional(),
  age_months: z.number().optional(),
  age_group: PetAgeGroupSchema.optional(),
  gender: PetGenderSchema.optional(),
  status: PetStatusSchema.optional(),
  type: PetTypeSchema.optional(),
  breed: z.string().optional(),
  secondary_breed: z.string().optional(),
  weight_kg: z.string().optional(),
  size: PetSizeSchema.optional(),
  color: z.string().optional(),
  markings: z.string().optional(),
  microchip_id: z.string().optional(),
  archived: z.boolean().optional(),
  featured: z.boolean().optional(),
  priority_listing: z.boolean().optional(),
  adoption_fee: z.string().optional(),
  special_needs: z.boolean().optional(),
  special_needs_description: z.string().optional(),
  house_trained: z.boolean().optional(),
  good_with_children: z.boolean().optional(),
  good_with_dogs: z.boolean().optional(),
  good_with_cats: z.boolean().optional(),
  good_with_small_animals: z.boolean().optional(),
  energy_level: PetEnergyLevelSchema.optional(),
  exercise_needs: z.string().optional(),
  grooming_needs: z.string().optional(),
  training_notes: z.string().optional(),
  temperament: z.array(z.string()).optional(),
  medical_notes: z.string().optional(),
  behavioral_notes: z.string().optional(),
  surrender_reason: z.string().optional(),
  intake_date: z.string().optional(),
  vaccination_status: PetVaccinationStatusSchema.optional(),
  vaccination_date: z.string().optional(),
  spay_neuter_status: PetSpayNeuterStatusSchema.optional(),
  spay_neuter_date: z.string().optional(),
  last_vet_checkup: z.string().optional(),
  images: z.array(PetImageSchema).optional(),
  videos: z.array(PetVideoSchema).optional(),
  location: PetLocationSchema.optional(),
  available_since: z.string().optional(),
  adopted_date: z.string().optional(),
  foster_start_date: z.string().optional(),
  foster_end_date: z.string().optional(),
  view_count: z.number().optional(),
  favorite_count: z.number().optional(),
  application_count: z.number().optional(),
  search_vector: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().optional(),
  distance: z.number().optional(),
  rescue: PetRescueSchema.optional(),
});

// ── Search / filter schema ────────────────────────────────────────────────────

export const PetSearchFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  breed: z.string().optional(),
  age: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  ageGroup: z.string().optional(),
  size: z.string().optional(),
  gender: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxDistance: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Stats schema ──────────────────────────────────────────────────────────────

export const PetStatsSchema = z.object({
  totalPets: z.number().default(0),
  availablePets: z.number().default(0),
  adoptedPets: z.number().default(0),
  fosterPets: z.number().default(0),
  featuredPets: z.number().default(0),
  specialNeedsPets: z.number().default(0),
  petsByType: z.record(z.string(), z.number()).default({}),
  petsByStatus: z.record(z.string(), z.number()).default({}),
  petsBySize: z.record(z.string(), z.number()).default({}),
  petsByAgeGroup: z.record(z.string(), z.number()).default({}),
  averageAdoptionTime: z.number().default(0),
  monthlyAdoptions: z
    .array(
      z.object({
        month: z.string(),
        year: z.number(),
        adoptions: z.number(),
        newIntakes: z.number(),
      })
    )
    .default([]),
  popularBreeds: z
    .array(
      z.object({
        breed: z.string(),
        count: z.number(),
        percentage: z.number(),
      })
    )
    .default([]),
});

// ── Create / Update schemas ───────────────────────────────────────────────────

export const PetCreateDataSchema = z.object({
  name: z.string(),
  type: PetTypeSchema,
  breed: z.string(),
  secondaryBreed: z.string().optional(),
  ageYears: z.number().optional(),
  ageMonths: z.number().optional(),
  ageGroup: PetAgeGroupSchema.optional(),
  gender: PetGenderSchema,
  size: PetSizeSchema,
  color: z.string(),
  markings: z.string().optional(),
  weightKg: z.string().optional(),
  microchipId: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  adoptionFee: AdoptionFeeStringSchema.optional(),
  energyLevel: PetEnergyLevelSchema.optional(),
  exerciseNeeds: z.string().optional(),
  groomingNeeds: z.string().optional(),
  temperament: z.array(z.string()).optional(),
  trainingNotes: z.string().optional(),
  medicalNotes: z.string().optional(),
  behavioralNotes: z.string().optional(),
  surrenderReason: z.string().optional(),
  specialNeeds: z.boolean().optional(),
  specialNeedsDescription: z.string().optional(),
  houseTrained: z.boolean().optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  goodWithSmallAnimals: z.boolean().optional(),
  vaccinationStatus: PetVaccinationStatusSchema.optional(),
  vaccinationDate: z.string().optional(),
  spayNeuterStatus: PetSpayNeuterStatusSchema.optional(),
  spayNeuterDate: z.string().optional(),
  lastVetCheckup: z.string().optional(),
  intakeDate: z.string().optional(),
  availableSince: z.string().optional(),
  fosterStartDate: z.string().optional(),
  fosterEndDate: z.string().optional(),
  featured: z.boolean().optional(),
  priorityListing: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  rescueId: z.string(),
});

export const PetUpdateDataSchema = z.object({
  name: z.string().optional(),
  type: PetTypeSchema.optional(),
  breed: z.string().optional(),
  secondaryBreed: z.string().optional(),
  ageYears: z.number().optional(),
  ageMonths: z.number().optional(),
  ageGroup: PetAgeGroupSchema.optional(),
  gender: PetGenderSchema.optional(),
  size: PetSizeSchema.optional(),
  color: z.string().optional(),
  markings: z.string().optional(),
  weightKg: z.string().optional(),
  microchipId: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  adoptionFee: AdoptionFeeStringSchema.optional(),
  energyLevel: PetEnergyLevelSchema.optional(),
  exerciseNeeds: z.string().optional(),
  groomingNeeds: z.string().optional(),
  temperament: z.array(z.string()).optional(),
  trainingNotes: z.string().optional(),
  medicalNotes: z.string().optional(),
  behavioralNotes: z.string().optional(),
  surrenderReason: z.string().optional(),
  specialNeeds: z.boolean().optional(),
  specialNeedsDescription: z.string().optional(),
  houseTrained: z.boolean().optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  goodWithSmallAnimals: z.boolean().optional(),
  vaccinationStatus: PetVaccinationStatusSchema.optional(),
  vaccinationDate: z.string().optional(),
  spayNeuterStatus: PetSpayNeuterStatusSchema.optional(),
  spayNeuterDate: z.string().optional(),
  lastVetCheckup: z.string().optional(),
  intakeDate: z.string().optional(),
  availableSince: z.string().optional(),
  fosterStartDate: z.string().optional(),
  fosterEndDate: z.string().optional(),
  featured: z.boolean().optional(),
  priorityListing: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  status: PetStatusSchema.optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type PetStatus = z.infer<typeof PetStatusSchema>;
export type PetImage = z.infer<typeof PetImageSchema>;
export type PetVideo = z.infer<typeof PetVideoSchema>;
export type Pet = z.infer<typeof PetSchema>;
export type PetSearchFilters = z.infer<typeof PetSearchFiltersSchema>;
export type PetStats = z.infer<typeof PetStatsSchema>;
export type PetCreateData = z.infer<typeof PetCreateDataSchema>;
export type PetUpdateData = z.infer<typeof PetUpdateDataSchema>;
