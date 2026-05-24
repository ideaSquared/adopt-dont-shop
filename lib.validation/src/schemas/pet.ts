import { z } from 'zod';
import {
  PET_STATUSES,
  PET_TYPES,
  PET_GENDERS,
  PET_SIZES,
  PET_AGE_GROUPS,
  PET_ENERGY_LEVELS,
  type PetId,
  type RescueId,
} from '@adopt-dont-shop/lib.types';
import { boundedRecord } from './bounded-record';
import { BulkOperationFailedIdsSchema } from './bulk-response';

// ----- Enums (canonical values from lib.types) ---------------------------

export const PetStatusSchema = z.enum(PET_STATUSES);

export const PetTypeSchema = z.enum(PET_TYPES);

export const GenderSchema = z.enum(PET_GENDERS);

export const SizeSchema = z.enum(PET_SIZES);

export const AgeGroupSchema = z.enum(PET_AGE_GROUPS);

export const EnergyLevelSchema = z.enum(PET_ENERGY_LEVELS);

export const VaccinationStatusSchema = z.enum([
  'up_to_date',
  'partial',
  'not_vaccinated',
  'unknown',
]);
export type VaccinationStatusValue = z.infer<typeof VaccinationStatusSchema>;

export const SpayNeuterStatusSchema = z.enum(['spayed', 'neutered', 'not_altered', 'unknown']);
export type SpayNeuterStatusValue = z.infer<typeof SpayNeuterStatusSchema>;

export const GoodWithSchema = z.enum(['children', 'dogs', 'cats', 'small_animals']);
export type GoodWithValue = z.infer<typeof GoodWithSchema>;

// ----- Primitives --------------------------------------------------------

export const PetIdSchema = z
  .string()
  .min(1, 'Pet ID is required')
  .transform((v) => v as PetId);

// RescueIdSchema lives in schemas/rescue.ts — Pet uses RescueId only
// for FK references in shapes below.

const PetNameSchema = z.string().trim().min(1, 'Name is required').max(100);
const BreedSchema = z.string().trim().min(1).max(100);
const ColorSchema = z.string().trim().min(1).max(100);

const ShortDescriptionSchema = z.string().trim().max(500);
const LongDescriptionSchema = z.string().trim().max(5000);

/**
 * Age years / months bounds match the Sequelize column validators
 * (ageYears 0..30, ageMonths 0..11). z.coerce so query-string values
 * arrive as numbers without route-level handwiring.
 */
const AgeYearsSchema = z.coerce.number().int().min(0).max(30);
const AgeMonthsSchema = z.coerce.number().int().min(0).max(11);
const WeightKgSchema = z.coerce.number().min(0.1).max(200);
/**
 * Minor units (pence/cents/etc.). Integer-only — float currency is a
 * known source of rounding bugs. Bound matches Pet.adoptionFeeMinor's
 * column validator (1,000,000 minor units = £10,000 / $10,000).
 */
const AdoptionFeeMinorSchema = z.coerce.number().int().min(0).max(1_000_000);

/**
 * Major-units bound used for the search-filter range. The model
 * column itself is minor units; this is a UX nicety for the API
 * surface — pass £50, the service multiplies by 100.
 */
const AdoptionFeeMajorRangeSchema = z.coerce.number().min(0).max(10_000);

/**
 * ISO 4217 alpha-3 currency code, normalised to uppercase. Mirrors
 * the Pet.adoptionFeeCurrency column validator.
 */
const CurrencyCodeSchema = z
  .string()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 alpha-3 code'));

/**
 * Birth date — coerce-on-input (accepts ISO strings or Date), refuse
 * future dates. Pet.birthDate is DATEONLY in Postgres, so the time-of-
 * day component is meaningless; downstream code treats it as a calendar
 * date.
 */
const BirthDateSchema = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now(), 'Birth date cannot be in the future');

/**
 * Image / video shapes — kept JSON-style for now to avoid churning the
 * Pet.images / Pet.videos columns. The plan (2.1) will move these into
 * dedicated tables; the schema rebases at that point.
 */
export const PetImageSchema = z.object({
  imageId: z.string().min(1).optional(),
  url: z.string().url('Image URL must be valid'),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});
export type PetImage = z.infer<typeof PetImageSchema>;

export const PetVideoSchema = z.object({
  videoId: z.string().min(1).optional(),
  url: z.string().url('Video URL must be valid'),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
  durationSeconds: z.coerce.number().int().min(0).optional(),
});
export type PetVideo = z.infer<typeof PetVideoSchema>;

// ----- Request shapes ----------------------------------------------------

/**
 * POST /api/v1/pets — create a new pet listing.
 *
 * Mirrors pet.controller.validateCreatePet but drops the duplicated
 * length re-checks: descriptions, fees, and age bounds live on the
 * primitives above.
 */
export const PetCreateRequestSchema = z.object({
  name: PetNameSchema,
  type: PetTypeSchema,
  breed: BreedSchema.optional(),
  secondaryBreed: BreedSchema.optional(),
  color: ColorSchema.optional(),
  gender: GenderSchema,
  size: SizeSchema,
  ageGroup: AgeGroupSchema,
  ageYears: AgeYearsSchema.optional(),
  ageMonths: AgeMonthsSchema.optional(),
  // birthDate is the canonical age input — when set, the model's
  // getAgeDisplay() / getAgeInMonths() prefer it over ageYears/ageMonths
  // so age doesn't drift over time. Many rescues only have an estimate;
  // isBirthDateEstimate records that.
  birthDate: BirthDateSchema.optional(),
  isBirthDateEstimate: z.boolean().optional(),
  weightKg: WeightKgSchema.optional(),
  shortDescription: ShortDescriptionSchema.optional(),
  longDescription: LongDescriptionSchema.optional(),
  // Money: integer minor units + ISO 4217 currency code (plan 3.2 /
  // 5.5.8). Float DECIMAL is gone — no rounding surprises, no
  // implicit-currency ambiguity.
  adoptionFeeMinor: AdoptionFeeMinorSchema.optional(),
  adoptionFeeCurrency: CurrencyCodeSchema.optional(),
  energyLevel: EnergyLevelSchema.optional(),
  vaccinationStatus: VaccinationStatusSchema.optional(),
  spayNeuterStatus: SpayNeuterStatusSchema.optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  goodWithSmallAnimals: z.boolean().optional(),
  houseTrained: z.boolean().optional(),
  specialNeeds: z.boolean().optional(),
  featured: z.boolean().optional(),
  priorityListing: z.boolean().optional(),
  microchipId: z.string().trim().min(1).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  images: z.array(PetImageSchema).max(20).optional(),
  videos: z.array(PetVideoSchema).max(10).optional(),
});
export type PetCreateRequest = z.infer<typeof PetCreateRequestSchema>;

/**
 * PUT/PATCH /api/v1/pets/:petId — update an existing listing.
 *
 * Status updates have their own dedicated endpoint so it's intentionally
 * absent here. (See PetStatusUpdateSchema below.) Everything else is the
 * create shape made partial.
 */
export const PetUpdateRequestSchema = PetCreateRequestSchema.partial();
export type PetUpdateRequest = z.infer<typeof PetUpdateRequestSchema>;

/**
 * PATCH /api/v1/pets/:petId/status — append a transition.
 *
 * The actual transition write goes through PetStatusTransition (see
 * slice 5). This schema is only for the inbound request payload.
 */
export const PetStatusUpdateRequestSchema = z.object({
  status: PetStatusSchema,
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  effectiveDate: z.coerce.date().optional(),
});
export type PetStatusUpdateRequest = z.infer<typeof PetStatusUpdateRequestSchema>;

/**
 * GET /api/v1/pets — search filters.
 *
 * z.coerce on numerics so the schema accepts both query-string and
 * JSON-body callers without per-route conversion.
 */
export const PetSearchFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: PetTypeSchema.optional(),
  status: PetStatusSchema.optional(),
  gender: GenderSchema.optional(),
  size: SizeSchema.optional(),
  ageGroup: AgeGroupSchema.optional(),
  energyLevel: EnergyLevelSchema.optional(),
  vaccinationStatus: VaccinationStatusSchema.optional(),
  spayNeuterStatus: SpayNeuterStatusSchema.optional(),
  breed: z.string().trim().min(1).max(100).optional(),
  rescueId: z.string().trim().min(1).optional(),
  goodWithChildren: z.coerce.boolean().optional(),
  goodWithDogs: z.coerce.boolean().optional(),
  goodWithCats: z.coerce.boolean().optional(),
  goodWithSmallAnimals: z.coerce.boolean().optional(),
  houseTrained: z.coerce.boolean().optional(),
  specialNeeds: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  adoptionFeeMin: AdoptionFeeMajorRangeSchema.optional(),
  adoptionFeeMax: AdoptionFeeMajorRangeSchema.optional(),
  weightMin: WeightKgSchema.optional(),
  weightMax: WeightKgSchema.optional(),
  ageMin: AgeYearsSchema.optional(),
  ageMax: AgeYearsSchema.optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  // Geo filters — coordinates are tightly bounded; maxDistance in km.
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  maxDistance: z.coerce.number().positive().max(20_000).optional(),
});
export type PetSearchFilters = z.infer<typeof PetSearchFiltersSchema>;

export const PetSearchSortBySchema = z.enum([
  'name',
  'ageYears',
  'createdAt',
  'adoptionFeeMinor',
  'distance',
]);
export type PetSearchSortBy = z.infer<typeof PetSearchSortBySchema>;

export const PetSearchPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: PetSearchSortBySchema.optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
});
export type PetSearchPagination = z.infer<typeof PetSearchPaginationSchema>;

/**
 * POST /api/v1/pets/:petId/report — user reporting a listing.
 */
export const ReportPetRequestSchema = z.object({
  reason: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});
export type ReportPetRequest = z.infer<typeof ReportPetRequestSchema>;

/**
 * POST /api/v1/pets/bulk-update — admin bulk operation.
 */
export const BulkPetOperationTypeSchema = z.enum(['update_status', 'archive', 'feature', 'delete']);
export type BulkPetOperationType = z.infer<typeof BulkPetOperationTypeSchema>;

export const BulkPetOperationRequestSchema = z.object({
  petIds: z.array(z.string().trim().min(1)).min(1, 'At least one pet ID is required'),
  operation: BulkPetOperationTypeSchema,
  // Free-form per-operation payload persisted to JSONB. Caps protect
  // against DoS via unbounded payloads: max 200 top-level keys, 5,000
  // chars per string value, 100KB total stringified size.
  data: boundedRecord({
    maxKeys: 200,
    maxStringLength: 5_000,
    maxPayloadBytes: 100_000,
  }).optional(),
  reason: z.string().trim().max(500).optional(),
});
export type BulkPetOperationRequest = z.infer<typeof BulkPetOperationRequestSchema>;

/**
 * Response shape for POST /api/v1/pets/bulk-update. `failedIds` is
 * always present (may be empty) so the admin UI can offer per-item
 * retry.
 */
export const BulkPetOperationResponseSchema = z
  .object({
    successCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    errors: z
      .array(
        z.object({
          petId: z.string(),
          error: z.string(),
        })
      )
      .optional(),
  })
  .merge(BulkOperationFailedIdsSchema);
export type BulkPetOperationResponse = z.infer<typeof BulkPetOperationResponseSchema>;

// ----- Read / model shape ------------------------------------------------

/**
 * Public-facing read shape. Excludes counters and lifecycle-only fields
 * the API clients don't typically consume; those still live on the
 * Sequelize model.
 */
export const PetProfileSchema = z.object({
  petId: PetIdSchema,
  // FK to Rescue. Brand at the type level without dragging the rescue
  // schema in as a runtime dep here.
  rescueId: z
    .string()
    .min(1)
    .transform((v) => v as RescueId),
  name: PetNameSchema,
  type: PetTypeSchema,
  breed: BreedSchema.nullable().optional(),
  secondaryBreed: BreedSchema.nullable().optional(),
  color: ColorSchema.nullable().optional(),
  gender: GenderSchema,
  size: SizeSchema,
  ageGroup: AgeGroupSchema,
  status: PetStatusSchema,
  ageYears: AgeYearsSchema.nullable().optional(),
  ageMonths: AgeMonthsSchema.nullable().optional(),
  birthDate: BirthDateSchema.nullable().optional(),
  isBirthDateEstimate: z.boolean().optional(),
  weightKg: WeightKgSchema.nullable().optional(),
  shortDescription: ShortDescriptionSchema.nullable().optional(),
  longDescription: LongDescriptionSchema.nullable().optional(),
  adoptionFeeMinor: AdoptionFeeMinorSchema.nullable().optional(),
  adoptionFeeCurrency: CurrencyCodeSchema.nullable().optional(),
  energyLevel: EnergyLevelSchema.optional(),
  vaccinationStatus: VaccinationStatusSchema.optional(),
  spayNeuterStatus: SpayNeuterStatusSchema.optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  goodWithSmallAnimals: z.boolean().optional(),
  houseTrained: z.boolean().optional(),
  specialNeeds: z.boolean().optional(),
  featured: z.boolean().optional(),
  priorityListing: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(PetImageSchema).optional(),
  videos: z.array(PetVideoSchema).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type PetProfile = z.infer<typeof PetProfileSchema>;

/**
 * Partial shape for the model-side beforeValidate cross-check (parallels
 * UserModelShapeSchema). Doesn't gate creation — Sequelize column-level
 * `allowNull` / required checks still own "must be present".
 */
export const PetModelShapeSchema = PetProfileSchema.partial();
export type PetModelShape = z.infer<typeof PetModelShapeSchema>;
