import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ApplicationStatusSchema = z.enum(['submitted', 'approved', 'rejected', 'withdrawn']);

export const ApplicationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// ── ApplicationData sub-schemas ───────────────────────────────────────────────

export const PersonalInfoSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
});

export const HouseholdMemberSchema = z.object({
  name: z.string(),
  age: z.number(),
  relationship: z.string(),
});

export const LivingSituationSchema = z.object({
  housingType: z.enum(['house', 'apartment', 'condo', 'other']),
  isOwned: z.boolean(),
  hasYard: z.boolean(),
  yardSize: z.enum(['small', 'medium', 'large']).optional(),
  yardFenced: z.boolean().optional(),
  allowsPets: z.boolean(),
  landlordContact: z.string().optional(),
  householdSize: z.number(),
  householdMembers: z.array(HouseholdMemberSchema).optional(),
  hasAllergies: z.boolean(),
  allergyDetails: z.string().optional(),
});

export const CurrentPetSchema = z.object({
  type: z.string(),
  breed: z.string().optional(),
  age: z.number(),
  spayedNeutered: z.boolean(),
  vaccinated: z.boolean(),
});

export const PreviousPetSchema = z.object({
  type: z.string(),
  breed: z.string().optional(),
  yearsOwned: z.number(),
  whatHappened: z.string(),
});

export const PetExperienceSchema = z.object({
  hasPetsCurrently: z.boolean(),
  currentPets: z.array(CurrentPetSchema).optional(),
  previousPets: z.array(PreviousPetSchema).optional(),
  experienceLevel: z.enum(['beginner', 'some', 'experienced', 'expert']),
  willingToTrain: z.boolean(),
  hoursAloneDaily: z.number(),
  exercisePlans: z.string(),
});

export const VeterinarianSchema = z.object({
  name: z.string(),
  clinicName: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  yearsUsed: z.number(),
});

export const PersonalReferenceSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  yearsKnown: z.number(),
});

export const ReferencesSchema = z.object({
  veterinarian: VeterinarianSchema.optional(),
  personal: z.array(PersonalReferenceSchema),
});

export const AdditionalInfoSchema = z.object({
  whyAdopt: z.string(),
  expectations: z.string(),
  petName: z.string().optional(),
  emergencyPlan: z.string(),
  agreement: z.boolean(),
});

export const ApplicationDataSchema = z.object({
  petId: z.string(),
  userId: z.string(),
  rescueId: z.string(),
  personalInfo: PersonalInfoSchema,
  livingsituation: LivingSituationSchema,
  petExperience: PetExperienceSchema,
  references: ReferencesSchema,
  additionalInfo: AdditionalInfoSchema.optional(),
});

// ── Document schemas ───────────────────────────────────────────────────────────

export const ApplicationDocumentSchema = z.object({
  id: z.string(),
  type: z.string(),
  filename: z.string(),
  url: z.string(),
  uploadedAt: z.string(),
});

export const DocumentUploadSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  type: z.string(),
  uploadedAt: z.string(),
});

export const DocumentSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  type: z.string(),
  filename: z.string(),
  url: z.string(),
  uploadedAt: z.string(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
});

// ── Application schemas ────────────────────────────────────────────────────────

export const ApplicationSchema = z.object({
  id: z.string(),
  petId: z.string(),
  userId: z.string(),
  rescueId: z.string(),
  status: ApplicationStatusSchema,
  priority: ApplicationPrioritySchema.optional(),
  submittedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().optional(),
  data: ApplicationDataSchema,
  documents: z.array(ApplicationDocumentSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApplicationWithPetInfoSchema = ApplicationSchema.extend({
  petName: z.string().optional(),
  petType: z.string().optional(),
  petBreed: z.string().optional(),
});

// Backend getApplicationById returns a flat structure: personalInfo, livingsituation,
// petExperience at root level rather than nested under `data`.
export const ApplicationFlatResponseSchema = z.object({
  id: z.string(),
  petId: z.string(),
  userId: z.string(),
  rescueId: z.string(),
  status: ApplicationStatusSchema,
  submittedAt: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  personalInfo: PersonalInfoSchema.optional(),
  livingsituation: LivingSituationSchema.optional(),
  petExperience: PetExperienceSchema.optional(),
  references: ReferencesSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
  documents: z.array(ApplicationDocumentSchema).optional().default([]),
  petName: z.string().optional(),
  petType: z.string().optional(),
  petBreed: z.string().optional(),
});

// ── Response schemas ───────────────────────────────────────────────────────────

export const ApplicationListResponseSchema = z.object({
  data: z
    .union([z.object({ applications: z.array(ApplicationSchema) }), z.array(ApplicationSchema)])
    .optional(),
});

export const ApplicationByPetResponseSchema = z.object({
  data: z
    .object({
      data: z
        .object({
          applications: z.array(ApplicationSchema),
          total: z.number(),
          page: z.number(),
          totalPages: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export const RescueApplicationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ApplicationSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export const ApplicationStatsSchema = z.object({
  total: z.number().default(0),
  submitted: z.number().default(0),
  underReview: z.number().default(0),
  approved: z.number().default(0),
  rejected: z.number().default(0),
  pendingReferences: z.number().default(0),
});

export const DocumentsResponseSchema = z.object({
  data: z.array(DocumentSchema).optional(),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type ApplicationPriority = z.infer<typeof ApplicationPrioritySchema>;
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type LivingSituation = z.infer<typeof LivingSituationSchema>;
export type PetExperience = z.infer<typeof PetExperienceSchema>;
export type References = z.infer<typeof ReferencesSchema>;
export type AdditionalInfo = z.infer<typeof AdditionalInfoSchema>;
export type ApplicationData = z.infer<typeof ApplicationDataSchema>;
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationWithPetInfo = z.infer<typeof ApplicationWithPetInfoSchema>;
export type ApplicationStats = z.infer<typeof ApplicationStatsSchema>;
