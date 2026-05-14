import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const RescueStatusSchema = z.enum([
  'pending',
  'verified',
  'suspended',
  'inactive',
  'rejected',
]);

export const RescueTypeSchema = z.enum(['individual', 'organization']);

export const VerificationSourceSchema = z.enum(['companies_house', 'charity_commission', 'manual']);

// ── Sub-schemas ───────────────────────────────────────────────────────────────

export const RescueLocationSchema = z.object({
  address: z.string(),
  city: z.string(),
  county: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
});

export const AdoptionPolicySchema = z.object({
  requireHomeVisit: z.boolean(),
  requireReferences: z.boolean(),
  minimumReferenceCount: z.number(),
  requireVeterinarianReference: z.boolean(),
  adoptionFeeRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  requirements: z.array(z.string()),
  policies: z.array(z.string()),
  returnPolicy: z.string().optional(),
  spayNeuterPolicy: z.string().optional(),
  followUpPolicy: z.string().optional(),
});

// ── Rescue schemas ─────────────────────────────────────────────────────────────

export const RescueSchema = z.object({
  rescueId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string(),
  city: z.string(),
  county: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  companiesHouseNumber: z.string().optional(),
  charityRegistrationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactTitle: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  status: RescueStatusSchema,
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
  verificationSource: VerificationSourceSchema.optional(),
  verificationFailureReason: z.string().optional(),
  manualVerificationRequestedAt: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  adoptionPolicies: AdoptionPolicySchema.optional(),
  isDeleted: z.boolean(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  verified: z.boolean(),
  location: RescueLocationSchema,
  type: RescueTypeSchema,
});

// The raw API response shape — accepts both snake_case and camelCase field names
// since the backend may return either depending on the endpoint.
export const RescueAPIResponseSchema = z.object({
  rescue_id: z.string().optional(),
  rescueId: z.string().optional(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string(),
  city: z.string(),
  county: z.string().optional(),
  postcode: z.string(),
  country: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().optional(),
  companies_house_number: z.string().optional(),
  companiesHouseNumber: z.string().optional(),
  charity_registration_number: z.string().optional(),
  charityRegistrationNumber: z.string().optional(),
  contact_person: z.string().optional(),
  contactPerson: z.string().optional(),
  contact_title: z.string().optional(),
  contactTitle: z.string().optional(),
  contact_email: z.string().optional(),
  contactEmail: z.string().optional(),
  contact_phone: z.string().optional(),
  contactPhone: z.string().optional(),
  status: RescueStatusSchema,
  verified_at: z.string().optional(),
  verifiedAt: z.string().optional(),
  verified_by: z.string().optional(),
  verifiedBy: z.string().optional(),
  verification_source: VerificationSourceSchema.optional(),
  verificationSource: VerificationSourceSchema.optional(),
  verification_failure_reason: z.string().optional(),
  verificationFailureReason: z.string().optional(),
  manual_verification_requested_at: z.string().optional(),
  manualVerificationRequestedAt: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  is_deleted: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  deleted_at: z.string().optional(),
  deletedAt: z.string().optional(),
  deleted_by: z.string().optional(),
  deletedBy: z.string().optional(),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  updated_at: z.string().optional(),
  updatedAt: z.string().optional(),
  type: RescueTypeSchema.optional(),
});

// ── Search / filter schema ────────────────────────────────────────────────────

export const RescueSearchFiltersSchema = z.object({
  search: z.string().optional(),
  type: RescueTypeSchema.optional(),
  location: z.string().optional(),
  verified: z.boolean().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

// ── Internal Pet schema (scoped to rescue context) ────────────────────────────

export const RescuePetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  breed: z.string().optional(),
  age: z.number().optional(),
  size: z.string().optional(),
  rescueId: z.string(),
  status: z.string().optional(),
});

// ── Response schemas ──────────────────────────────────────────────────────────

export const RescueResponseSchema = z.object({
  success: z.boolean(),
  data: RescueAPIResponseSchema.optional(),
  message: z.string().optional(),
});

// getFeaturedRescues returns either an array directly or {data: array}
export const FeaturedRescuesResponseSchema = z.union([
  z.array(RescueAPIResponseSchema),
  z.object({ data: z.array(RescueAPIResponseSchema) }),
]);

export const AdoptionPolicyResponseSchema = z.object({
  success: z.boolean(),
  data: AdoptionPolicySchema.nullable().optional(),
  message: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type RescueStatus = z.infer<typeof RescueStatusSchema>;
export type RescueType = z.infer<typeof RescueTypeSchema>;
export type VerificationSource = z.infer<typeof VerificationSourceSchema>;
export type RescueLocation = z.infer<typeof RescueLocationSchema>;
export type AdoptionPolicy = z.infer<typeof AdoptionPolicySchema>;
export type Rescue = z.infer<typeof RescueSchema>;
export type RescueAPIResponse = z.infer<typeof RescueAPIResponseSchema>;
export type RescueSearchFilters = z.infer<typeof RescueSearchFiltersSchema>;
