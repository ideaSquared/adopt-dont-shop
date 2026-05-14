import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ApplicationStatusSchema = z.enum(['submitted', 'approved', 'rejected', 'withdrawn']);

export const ApplicationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// ── ApplicationData sub-schemas ───────────────────────────────────────────────
//
// These schemas describe the `data` payload returned by the backend's
// transformApplicationModel (service.backend/src/controllers/application.controller.ts).
// Every field inside `data` is best-effort: the transform projects loose
// application_answers rows into a frontend shape, so any individual field
// may be missing depending on which answers the adopter has supplied.
// Keep these schemas permissive — strict typing belongs at the form
// validator, not at the read boundary.

export const PersonalInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
});

export const HouseholdMemberSchema = z.object({
  name: z.string().optional(),
  age: z.number().optional(),
  relationship: z.string().optional(),
});

export const LivingSituationSchema = z.object({
  // Backend transform emits a plain string from answers.housing_type;
  // legacy form mocks use the narrow enum. Accept both.
  housingType: z.string().optional(),
  homeType: z.string().optional(),
  isOwned: z.boolean().optional(),
  rentOrOwn: z.string().optional(),
  hasYard: z.boolean().optional(),
  yardSize: z.string().optional(),
  yardFenced: z.boolean().optional(),
  allowsPets: z.boolean().optional(),
  landlordContact: z.string().optional(),
  householdSize: z.number().optional(),
  householdMembers: z.array(HouseholdMemberSchema).optional(),
  hasAllergies: z.boolean().optional(),
  allergyDetails: z.string().optional(),
});

export const CurrentPetSchema = z.object({
  type: z.string().optional(),
  breed: z.string().optional(),
  age: z.number().optional(),
  spayedNeutered: z.boolean().optional(),
  vaccinated: z.boolean().optional(),
});

export const PreviousPetSchema = z.object({
  type: z.string().optional(),
  breed: z.string().optional(),
  yearsOwned: z.number().optional(),
  whatHappened: z.string().optional(),
});

export const PetExperienceSchema = z.object({
  hasPetsCurrently: z.boolean().optional(),
  currentPets: z.array(CurrentPetSchema).optional(),
  previousPets: z.array(PreviousPetSchema).optional(),
  // experienceLevel: plain string from the form answer (test mocks use the
  // narrow enum value 'experienced' — still a string, so this accepts both).
  experienceLevel: z.string().optional(),
  willingToTrain: z.boolean().optional(),
  // hoursAloneDaily: backend emits the raw answer string (e.g. '4–6 hours');
  // form mocks pass a number. Accept either.
  hoursAloneDaily: z.union([z.string(), z.number()]).optional(),
  exercisePlans: z.string().optional(),
});

export const VeterinarianSchema = z.object({
  name: z.string().optional(),
  clinicName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  yearsUsed: z.number().optional(),
});

export const PersonalReferenceSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  // Backend transform hard-codes 'Unknown' here; form mocks pass a number.
  yearsKnown: z.union([z.string(), z.number()]).optional(),
});

export const ReferencesSchema = z.object({
  veterinarian: VeterinarianSchema.optional(),
  personal: z.array(PersonalReferenceSchema).optional(),
});

export const AdditionalInfoSchema = z.object({
  whyAdopt: z.string().optional(),
  expectations: z.string().optional(),
  petName: z.string().optional(),
  emergencyPlan: z.string().optional(),
  agreement: z.boolean().optional(),
});

export const ApplicationDataSchema = z.object({
  // Top-level FrontendApplication carries petId/userId/rescueId, but the
  // backend transform does not duplicate them inside `data`. Form mocks
  // include them; keep them as optional so both shapes parse.
  petId: z.string().optional(),
  userId: z.string().optional(),
  rescueId: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  livingConditions: LivingSituationSchema.optional(),
  petExperience: PetExperienceSchema.optional(),
  references: ReferencesSchema.optional(),
  additionalInfo: AdditionalInfoSchema.optional(),
  // Raw form answers are echoed through by the backend; allow them.
  answers: z.record(z.string(), z.unknown()).optional(),
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
  // `data` is best-effort projection from application_answers; it can be
  // absent on freshly-created applications before any answers are saved.
  data: ApplicationDataSchema.optional(),
  documents: z.array(ApplicationDocumentSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApplicationWithPetInfoSchema = ApplicationSchema.extend({
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
