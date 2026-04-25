import { z } from 'zod';
import type { ApplicationId, PetId } from '@adopt-dont-shop/lib.types';

/**
 * Canonical Zod schemas for the Application domain.
 *
 * Final entity in the Phase 3 Zod rollout. Same role as
 * schemas/user.ts, schemas/pet.ts, and schemas/rescue.ts: one source
 * of truth for Application-shaped data, used by service.backend
 * request validation and (over time) the application-related forms in
 * app.client / app.rescue.
 *
 * Values mirror the enums and validators in
 * service.backend/src/models/Application.ts and the express-validator
 * chains in service.backend/src/controllers/application.controller.ts.
 */

// ----- Enums --------------------------------------------------------------

export const ApplicationStatusSchema = z.enum(['submitted', 'approved', 'rejected', 'withdrawn']);
export type ApplicationStatusValue = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type ApplicationPriorityValue = z.infer<typeof ApplicationPrioritySchema>;

export const ApplicationStageSchema = z.enum([
  'pending',
  'reviewing',
  'visiting',
  'deciding',
  'resolved',
  'withdrawn',
]);
export type ApplicationStageValue = z.infer<typeof ApplicationStageSchema>;

export const ApplicationOutcomeSchema = z.enum(['approved', 'rejected', 'withdrawn']);
export type ApplicationOutcomeValue = z.infer<typeof ApplicationOutcomeSchema>;

/**
 * Reference status — distinct from ApplicationStatus. Tracks the state
 * of an individual reference contact, not the application as a whole.
 */
export const ReferenceStatusSchema = z.enum(['pending', 'contacted', 'verified', 'failed']);
export type ReferenceStatusValue = z.infer<typeof ReferenceStatusSchema>;

/**
 * Document categories accepted on applications. Hardcoded in the
 * controller today; surfacing here so the rule lives in one place.
 */
export const ApplicationDocumentTypeSchema = z.enum([
  'REFERENCE',
  'VETERINARY_RECORD',
  'PROOF_OF_RESIDENCE',
  'OTHER',
]);
export type ApplicationDocumentTypeValue = z.infer<typeof ApplicationDocumentTypeSchema>;

// ----- Primitives ---------------------------------------------------------

export const ApplicationIdSchema = z
  .string()
  .min(1, 'Application ID is required')
  .transform((v) => v as ApplicationId);

const NameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);
const RelationshipSchema = z
  .string()
  .trim()
  .min(2, 'Relationship must be at least 2 characters')
  .max(100);

/**
 * Same shape as the controller's reference phone validator: international
 * format, optional + or 0 prefix, 7–15 digits after stripping separators.
 */
const ReferencePhoneSchema = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'Please enter a valid reference phone number'));

const EmailSchema = z.string().trim().toLowerCase().email('Please enter a valid email address');

const NotesSchema = z.string().trim().max(2000);
const ShortNotesSchema = z.string().trim().max(500);
const RejectionReasonSchema = z
  .string()
  .trim()
  .min(10, 'Rejection reason must be at least 10 characters')
  .max(2000);
const ScoreSchema = z.coerce.number().min(0).max(100);
const TagSchema = z.string().trim().min(1).max(50);

// ----- Reference / Document shapes ---------------------------------------

/**
 * Inbound reference shape — `id` and `status` are filled in by the
 * service when the application is created (status defaults to
 * 'pending'), so the Create request omits them. The full shape
 * including those fields is ApplicationReferenceSchema below.
 */
export const ApplicationReferenceCreateSchema = z.object({
  name: NameSchema,
  relationship: RelationshipSchema,
  phone: ReferencePhoneSchema,
  email: EmailSchema.optional(),
  notes: ShortNotesSchema.optional(),
});
export type ApplicationReferenceCreate = z.infer<typeof ApplicationReferenceCreateSchema>;

export const ApplicationReferenceSchema = ApplicationReferenceCreateSchema.extend({
  id: z.string().min(1),
  status: ReferenceStatusSchema,
  contacted_at: z.coerce.date().nullable().optional(),
  contacted_by: z.string().min(1).nullable().optional(),
});
export type ApplicationReference = z.infer<typeof ApplicationReferenceSchema>;

export const ApplicationDocumentSchema = z.object({
  documentId: z.string().min(1),
  documentType: ApplicationDocumentTypeSchema,
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  uploadedAt: z.coerce.date(),
  verified: z.boolean().optional(),
});
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;

// ----- Request shapes ----------------------------------------------------

/**
 * POST /api/v1/applications — payload from the apply-for-pet flow.
 *
 * Mirrors validateCreateApplication. References cap at 5 (matches the
 * controller); answers is a free-form JSON object whose shape depends
 * on per-rescue questions (validated separately by the question
 * service, not here).
 */
export const CreateApplicationRequestSchema = z.object({
  petId: z
    .string()
    .min(1, 'Valid pet ID is required')
    .transform((v) => v as PetId),
  answers: z.record(z.string(), z.unknown()),
  references: z.array(ApplicationReferenceCreateSchema).max(5).optional(),
  priority: ApplicationPrioritySchema.optional(),
  notes: NotesSchema.optional(),
  tags: z.array(TagSchema).max(20).optional(),
});
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequestSchema>;

/**
 * PUT /api/v1/applications/:applicationId — partial update from the
 * applicant or staff side. Status changes go through the dedicated
 * /:applicationId/status endpoint; this schema deliberately doesn't
 * include status.
 */
export const UpdateApplicationRequestSchema = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
  references: z.array(ApplicationReferenceCreateSchema).max(5).optional(),
  priority: ApplicationPrioritySchema.optional(),
  notes: NotesSchema.optional(),
  tags: z.array(TagSchema).max(20).optional(),
  interviewNotes: NotesSchema.optional(),
  homeVisitNotes: NotesSchema.optional(),
  score: ScoreSchema.optional(),
});
export type UpdateApplicationRequest = z.infer<typeof UpdateApplicationRequestSchema>;

/**
 * PATCH /api/v1/applications/:applicationId/status — append-only status
 * change (the actual write goes through ApplicationStatusTransition,
 * see slice 4). This schema covers the inbound payload.
 */
export const ApplicationStatusUpdateRequestSchema = z.object({
  status: ApplicationStatusSchema,
  rejectionReason: RejectionReasonSchema.optional(),
  notes: NotesSchema.optional(),
  followUpDate: z.coerce.date().optional(),
});
export type ApplicationStatusUpdateRequest = z.infer<typeof ApplicationStatusUpdateRequestSchema>;

/**
 * PATCH /api/v1/applications/:applicationId/references — update a single
 * reference's contact status.
 *
 * The controller currently accepts EITHER `reference_index` (0–4) OR
 * `referenceId` (string in the form `ref-N`) — kept here for parity.
 * One must be present.
 */
export const ReferenceUpdateRequestSchema = z
  .object({
    reference_index: z.coerce.number().int().min(0).max(4).optional(),
    referenceId: z
      .string()
      .regex(/^ref-\d+$/, 'Reference ID must be in the form ref-N')
      .optional(),
    status: ReferenceStatusSchema,
    notes: ShortNotesSchema.optional(),
    contactedAt: z.coerce.date().optional(),
  })
  .refine((v) => v.reference_index !== undefined || v.referenceId !== undefined, {
    message: 'Either reference_index or referenceId is required',
    path: ['referenceId'],
  });
export type ReferenceUpdateRequest = z.infer<typeof ReferenceUpdateRequestSchema>;

/**
 * POST /api/v1/applications/:applicationId/documents — file upload
 * metadata. The actual file bytes go through multer; this schema
 * validates the JSON-shaped portion of the body.
 */
export const ApplicationDocumentUploadRequestSchema = z.object({
  documentType: ApplicationDocumentTypeSchema.optional(),
});
export type ApplicationDocumentUploadRequest = z.infer<
  typeof ApplicationDocumentUploadRequestSchema
>;

// ----- Search query ------------------------------------------------------

export const ApplicationSearchSortBySchema = z.enum([
  'createdAt',
  'updatedAt',
  'submittedAt',
  'status',
  'priority',
  'score',
]);
export type ApplicationSearchSortBy = z.infer<typeof ApplicationSearchSortBySchema>;

export const ApplicationSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  userId: z.string().min(1).optional(),
  petId: z.string().min(1).optional(),
  rescueId: z.string().min(1).optional(),
  status: ApplicationStatusSchema.optional(),
  priority: ApplicationPrioritySchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: ApplicationSearchSortBySchema.optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
  score_min: ScoreSchema.optional(),
  score_max: ScoreSchema.optional(),
});
export type ApplicationSearchQuery = z.infer<typeof ApplicationSearchQuerySchema>;

// ----- Bulk update -------------------------------------------------------

/**
 * POST /api/v1/applications/bulk — staff-side bulk update. The
 * controller accepts an `applicationIds` array plus an `updates`
 * record; we mirror that here.
 */
export const ApplicationBulkUpdateRequestSchema = z.object({
  applicationIds: z
    .array(z.string().uuid('Each application ID must be a UUID'))
    .min(1, 'At least one application ID is required'),
  updates: z
    .object({
      status: ApplicationStatusSchema.optional(),
      priority: ApplicationPrioritySchema.optional(),
      tags: z.array(TagSchema).max(20).optional(),
      notes: NotesSchema.optional(),
    })
    .refine((v) => Object.keys(v).length > 0, 'updates must contain at least one field to apply'),
});
export type ApplicationBulkUpdateRequest = z.infer<typeof ApplicationBulkUpdateRequestSchema>;

// ----- Read / model shape -----------------------------------------------

export const ApplicationProfileSchema = z.object({
  applicationId: ApplicationIdSchema,
  userId: z.string().min(1),
  petId: z
    .string()
    .min(1)
    .transform((v) => v as PetId),
  rescueId: z.string().min(1),
  status: ApplicationStatusSchema,
  priority: ApplicationPrioritySchema,
  stage: ApplicationStageSchema.optional(),
  finalOutcome: ApplicationOutcomeSchema.nullable().optional(),
  answers: z.record(z.string(), z.unknown()),
  references: z.array(ApplicationReferenceSchema).optional(),
  documents: z.array(ApplicationDocumentSchema).optional(),
  notes: NotesSchema.nullable().optional(),
  interviewNotes: NotesSchema.nullable().optional(),
  homeVisitNotes: NotesSchema.nullable().optional(),
  rejectionReason: RejectionReasonSchema.nullable().optional(),
  withdrawalReason: NotesSchema.nullable().optional(),
  score: ScoreSchema.nullable().optional(),
  tags: z.array(TagSchema).optional(),
  submittedAt: z.coerce.date().nullable().optional(),
  reviewStartedAt: z.coerce.date().nullable().optional(),
  visitScheduledAt: z.coerce.date().nullable().optional(),
  visitCompletedAt: z.coerce.date().nullable().optional(),
  decisionAt: z.coerce.date().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  followUpDate: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type ApplicationProfile = z.infer<typeof ApplicationProfileSchema>;

/**
 * Partial shape for the future Sequelize beforeValidate cross-check —
 * parallel to UserModelShapeSchema / PetModelShapeSchema /
 * RescueModelShapeSchema.
 */
export const ApplicationModelShapeSchema = ApplicationProfileSchema.partial();
export type ApplicationModelShape = z.infer<typeof ApplicationModelShapeSchema>;
