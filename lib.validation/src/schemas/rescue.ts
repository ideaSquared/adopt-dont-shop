import { z } from 'zod';
import type { RescueId } from '@adopt-dont-shop/lib.types';

/**
 * Canonical Zod schemas for the Rescue domain.
 *
 * Same role as schemas/user.ts and schemas/pet.ts: one source of truth
 * for Rescue-shaped data, used by service.backend request validation
 * and (over time) the rescue / admin frontends.
 *
 * The values mirror the validators in service.backend/src/models/Rescue.ts
 * and the express-validator chains in service.backend/src/routes/rescue.routes.ts.
 */

// ----- Enums --------------------------------------------------------------

export const RescueStatusSchema = z.enum([
  'pending',
  'verified',
  'suspended',
  'inactive',
  'rejected',
]);
export type RescueStatusValue = z.infer<typeof RescueStatusSchema>;

// ----- Primitives ---------------------------------------------------------

export const RescueIdSchema = z
  .string()
  .min(1, 'Rescue ID is required')
  .transform((v) => v as RescueId);

/**
 * UK postcode — case- and whitespace-insensitive. Mirrors the regex used
 * by `isUKPostcode` in service.backend's UK validators middleware so the
 * backend and the frontend agree on what counts as valid.
 */
const UkPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
export const UkPostcodeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase().replace(/\s+/g, ' '))
  .pipe(z.string().regex(UkPostcodeRegex, 'Please enter a valid UK postcode'));

/**
 * UK phone number — light normalization (strip whitespace and common
 * separators) then a 10–15 digit check that mirrors the existing
 * `isUKPhoneNumber` middleware. Full E.164 normalization is deferred
 * (see plan 3.3, same caveat as User.PhoneNumberSchema).
 */
export const UkPhoneNumberSchema = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^(?:\+44|0)\d{9,10}$/, 'Please enter a valid UK phone number'));

const NameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);
const ContactNameSchema = z
  .string()
  .trim()
  .min(2, 'Contact person must be at least 2 characters')
  .max(100);

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(255)
  .email('Please enter a valid email address');

const AddressSchema = z.string().trim().min(5, 'Address must be at least 5 characters').max(255);

const CitySchema = z.string().trim().min(2).max(100);
const CountySchema = z.string().trim().min(2).max(100);

/**
 * ISO 3166-1 alpha-2 country code, uppercase (e.g. GB, US). Mirrors
 * the Rescue.country column's CHAR(2) regex check (plan 5.5.9). The
 * input transform uppercases for ergonomics ("gb" → "GB"), then the
 * pipe enforces shape.
 */
export const CountryCodeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/, 'Country must be an ISO 3166-1 alpha-2 code (e.g. GB, US)'));
export type CountryCodeValue = z.infer<typeof CountryCodeSchema>;

const WebsiteSchema = z.string().url('Please enter a valid website URL');
const DescriptionSchema = z.string().trim().max(1000);
const MissionSchema = z.string().trim().max(500);

/**
 * UK Companies House registration number: always 8 alphanumeric characters,
 * zero-padded (e.g. 00123456, SC123456, OC123456).
 */
const CompaniesHouseNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8}$/, 'Companies House number must be exactly 8 alphanumeric characters');

/**
 * Charity Commission registration number: 7 digits, optionally followed by
 * a hyphen and 1–2 digit suffix for sub-charities (e.g. 1234567, 1234567-1).
 */
const CharityRegistrationNumberSchema = z
  .string()
  .trim()
  .regex(
    /^\d{7}(-\d{1,2})?$/,
    'Charity registration number must be 7 digits, optionally followed by -N or -NN for sub-charities'
  );
const ContactTitleSchema = z.string().trim().max(100);
const NotesSchema = z.string().trim().max(500);
const ReasonSchema = z.string().trim().max(500);

export const VerificationSourceSchema = z.enum(['companies_house', 'charity_commission', 'manual']);
export type VerificationSourceValue = z.infer<typeof VerificationSourceSchema>;

// ----- Adoption policy ---------------------------------------------------

/**
 * Mirror of the adoption-policy validators in rescue.routes. Stored on
 * Rescue.settings (JSONB today; will move to a typed table in Tier 5.6).
 */
export const AdoptionPolicySchema = z.object({
  requireHomeVisit: z.boolean().optional(),
  requireReferences: z.boolean().optional(),
  requireVeterinarianReference: z.boolean().optional(),
  minimumReferenceCount: z.coerce.number().int().min(0).max(10).optional(),
  adoptionFeeRange: z
    .object({
      min: z.coerce.number().min(0),
      max: z.coerce.number().min(0),
    })
    .refine((v) => v.max >= v.min, {
      message: 'adoptionFeeRange.max must be ≥ adoptionFeeRange.min',
      path: ['max'],
    })
    .optional(),
  requirements: z.array(z.string().trim().min(1)).optional(),
  policies: z.array(z.string().trim().min(1)).optional(),
  returnPolicy: z.string().trim().max(1000).optional(),
  spayNeuterPolicy: z.string().trim().max(1000).optional(),
  followUpPolicy: z.string().trim().max(1000).optional(),
});
export type AdoptionPolicy = z.infer<typeof AdoptionPolicySchema>;

// ----- Request shapes ----------------------------------------------------

/**
 * POST /api/v1/rescues — create a new rescue listing.
 *
 * Mirrors validateCreateRescue. Country has a sensible default in the
 * model (`United Kingdom`), but the original validator made it required;
 * we keep that contract here.
 */
export const RescueCreateRequestSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  phone: UkPhoneNumberSchema.optional(),
  address: AddressSchema,
  city: CitySchema,
  county: CountySchema.optional(),
  postcode: UkPostcodeSchema,
  country: CountryCodeSchema,
  website: WebsiteSchema.optional(),
  description: DescriptionSchema.optional(),
  mission: MissionSchema.optional(),
  companiesHouseNumber: CompaniesHouseNumberSchema.optional(),
  charityRegistrationNumber: CharityRegistrationNumberSchema.optional(),
  contactPerson: ContactNameSchema,
  contactTitle: ContactTitleSchema.optional(),
  contactEmail: EmailSchema.optional(),
  contactPhone: UkPhoneNumberSchema.optional(),
});
export type RescueCreateRequest = z.infer<typeof RescueCreateRequestSchema>;

/**
 * PUT/PATCH /api/v1/rescues/:rescueId — same fields, all optional.
 * Status and verification fields are privilege-sensitive and must never be
 * updated via this schema. .strip() silently drops any unknown keys so that
 * injected fields (status, verifiedAt, verificationSource, etc.) cannot reach
 * Sequelize. This is the single authoritative update schema — do not use a
 * partial of RescueCreateRequestSchema directly.
 */
export const RescueUpdateRequestSchema = z
  .object({
    name: NameSchema.optional(),
    email: EmailSchema.optional(),
    phone: UkPhoneNumberSchema.optional(),
    address: AddressSchema.optional(),
    city: CitySchema.optional(),
    county: CountySchema.optional(),
    postcode: UkPostcodeSchema.optional(),
    country: CountryCodeSchema.optional(),
    website: WebsiteSchema.optional().or(z.literal('')),
    description: DescriptionSchema.optional(),
    mission: MissionSchema.optional(),
    companiesHouseNumber: CompaniesHouseNumberSchema.optional(),
    charityRegistrationNumber: CharityRegistrationNumberSchema.optional(),
    contactPerson: ContactNameSchema.optional(),
    contactTitle: ContactTitleSchema.optional(),
    contactEmail: EmailSchema.optional(),
    contactPhone: UkPhoneNumberSchema.optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .strip();
export type RescueUpdateRequest = z.infer<typeof RescueUpdateRequestSchema>;

/**
 * GET /api/v1/rescues — search query.
 */
export const RescueSearchSortBySchema = z.enum(['name', 'createdAt', 'verifiedAt']);
export type RescueSearchSortBy = z.infer<typeof RescueSearchSortBySchema>;

export const RescueSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: RescueStatusSchema.optional(),
  location: z.string().trim().max(100).optional(),
  sortBy: RescueSearchSortBySchema.optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
});
export type RescueSearchQuery = z.infer<typeof RescueSearchQuerySchema>;

/**
 * Staff invitation (POST /:rescueId/invitations) and add-staff
 * (POST /:rescueId/staff).
 */
export const StaffInvitationRequestSchema = z.object({
  email: EmailSchema,
  title: ContactTitleSchema.optional(),
});
export type StaffInvitationRequest = z.infer<typeof StaffInvitationRequestSchema>;

export const AddStaffMemberRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: ContactTitleSchema.optional(),
});
export type AddStaffMemberRequest = z.infer<typeof AddStaffMemberRequestSchema>;

/**
 * Verification / rejection / deletion bodies — all small.
 */
export const RescueVerificationRequestSchema = z.object({
  notes: NotesSchema.optional(),
});
export type RescueVerificationRequest = z.infer<typeof RescueVerificationRequestSchema>;

export const RescueRejectionRequestSchema = z.object({
  reason: ReasonSchema.optional(),
  notes: NotesSchema.optional(),
});
export type RescueRejectionRequest = z.infer<typeof RescueRejectionRequestSchema>;

export const RescueDeletionRequestSchema = z.object({
  reason: ReasonSchema.optional(),
});
export type RescueDeletionRequest = z.infer<typeof RescueDeletionRequestSchema>;

/**
 * POST /api/v1/rescues/bulk-update — admin bulk operation.
 */
export const RescueBulkActionSchema = z.enum(['approve', 'suspend', 'verify']);
export type RescueBulkAction = z.infer<typeof RescueBulkActionSchema>;

export const RescueBulkUpdateRequestSchema = z.object({
  rescueIds: z
    .array(z.string().uuid('Each rescue ID must be a UUID'))
    .min(1, 'At least one rescue ID is required'),
  action: RescueBulkActionSchema,
  reason: ReasonSchema.optional(),
});
export type RescueBulkUpdateRequest = z.infer<typeof RescueBulkUpdateRequestSchema>;

// ----- Read / model shape ------------------------------------------------

export const RescueProfileSchema = z.object({
  rescueId: RescueIdSchema,
  name: NameSchema,
  email: EmailSchema,
  phone: UkPhoneNumberSchema.nullable().optional(),
  address: AddressSchema,
  city: CitySchema,
  county: CountySchema.nullable().optional(),
  postcode: UkPostcodeSchema,
  country: CountryCodeSchema,
  website: WebsiteSchema.nullable().optional(),
  description: DescriptionSchema.nullable().optional(),
  mission: MissionSchema.nullable().optional(),
  companiesHouseNumber: CompaniesHouseNumberSchema.nullable().optional(),
  charityRegistrationNumber: CharityRegistrationNumberSchema.nullable().optional(),
  contactPerson: ContactNameSchema,
  contactTitle: ContactTitleSchema.nullable().optional(),
  contactEmail: EmailSchema.nullable().optional(),
  contactPhone: UkPhoneNumberSchema.nullable().optional(),
  status: RescueStatusSchema,
  verificationSource: VerificationSourceSchema.nullable().optional(),
  verificationFailureReason: z.string().nullable().optional(),
  manualVerificationRequestedAt: z.coerce.date().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  verifiedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type RescueProfile = z.infer<typeof RescueProfileSchema>;

/**
 * Partial shape for the future Sequelize beforeValidate cross-check
 * (parallel to UserModelShapeSchema / PetModelShapeSchema).
 */
export const RescueModelShapeSchema = RescueProfileSchema.partial();
export type RescueModelShape = z.infer<typeof RescueModelShapeSchema>;
