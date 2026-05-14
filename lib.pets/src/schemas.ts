import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const PetStatusSchema = z.enum([
  'available',
  'pending',
  'adopted',
  'on_hold',
  'medical_care',
  'foster',
  'not_available',
]);

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
  age_group: z.enum(['young', 'adult', 'senior']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  status: PetStatusSchema.optional(),
  type: z.enum(['dog', 'cat', 'rabbit', 'bird', 'other']).optional(),
  breed: z.string().optional(),
  secondary_breed: z.string().optional(),
  weight_kg: z.string().optional(),
  size: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
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
  energy_level: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
  exercise_needs: z.string().optional(),
  grooming_needs: z.string().optional(),
  training_notes: z.string().optional(),
  temperament: z.array(z.string()).optional(),
  medical_notes: z.string().optional(),
  behavioral_notes: z.string().optional(),
  surrender_reason: z.string().optional(),
  intake_date: z.string().optional(),
  vaccination_status: z.enum(['unknown', 'partial', 'up_to_date']).optional(),
  vaccination_date: z.string().optional(),
  spay_neuter_status: z.enum(['unknown', 'intact', 'spayed', 'neutered']).optional(),
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
  type: z.enum(['dog', 'cat', 'rabbit', 'bird', 'other']),
  breed: z.string(),
  secondaryBreed: z.string().optional(),
  ageYears: z.number().optional(),
  ageMonths: z.number().optional(),
  ageGroup: z.enum(['young', 'adult', 'senior']).optional(),
  gender: z.enum(['male', 'female']),
  size: z.enum(['small', 'medium', 'large', 'extra_large']),
  color: z.string(),
  markings: z.string().optional(),
  weightKg: z.string().optional(),
  microchipId: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  adoptionFee: z.string().optional(),
  energyLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
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
  vaccinationStatus: z.enum(['unknown', 'partial', 'up_to_date']).optional(),
  vaccinationDate: z.string().optional(),
  spayNeuterStatus: z.enum(['unknown', 'intact', 'spayed', 'neutered']).optional(),
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
  type: z.enum(['dog', 'cat', 'rabbit', 'bird', 'other']).optional(),
  breed: z.string().optional(),
  secondaryBreed: z.string().optional(),
  ageYears: z.number().optional(),
  ageMonths: z.number().optional(),
  ageGroup: z.enum(['young', 'adult', 'senior']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  size: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
  color: z.string().optional(),
  markings: z.string().optional(),
  weightKg: z.string().optional(),
  microchipId: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  adoptionFee: z.string().optional(),
  energyLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
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
  vaccinationStatus: z.enum(['unknown', 'partial', 'up_to_date']).optional(),
  vaccinationDate: z.string().optional(),
  spayNeuterStatus: z.enum(['unknown', 'intact', 'spayed', 'neutered']).optional(),
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
