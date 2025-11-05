import { z } from 'zod';

// Enums matching backend models
export const ReportCategorySchema = z.enum([
  'inappropriate_content',
  'spam',
  'harassment',
  'false_information',
  'scam',
  'animal_welfare',
  'identity_theft',
  'other',
]);

export const ReportStatusSchema = z.enum([
  'pending',
  'under_review',
  'resolved',
  'dismissed',
  'escalated',
]);

export const ReportSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const ReportedEntityTypeSchema = z.enum([
  'user',
  'rescue',
  'pet',
  'application',
  'message',
  'conversation',
]);

export const ResolutionTypeSchema = z.enum([
  'no_action',
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'escalated',
]);

export const ActionTypeSchema = z.enum([
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'account_restricted',
  'content_flagged',
  'report_dismissed',
  'escalation',
  'appeal_reviewed',
  'no_action',
]);

export const ActionSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const EvidenceTypeSchema = z.enum(['screenshot', 'url', 'text', 'file']);

// Evidence schema (used by both Report and ModeratorAction)
export const EvidenceItemSchema = z.object({
  type: EvidenceTypeSchema,
  content: z.string(),
  description: z.string().optional(),
  uploadedAt: z.coerce.date().optional(),
});

// Report schema
export const ReportSchema = z.object({
  reportId: z.string(),
  reporterId: z.string(),
  reportedEntityType: ReportedEntityTypeSchema,
  reportedEntityId: z.string(),
  reportedUserId: z.string().nullable().optional(),
  category: ReportCategorySchema,
  severity: ReportSeveritySchema,
  status: ReportStatusSchema,
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(5000),
  evidence: z.array(EvidenceItemSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
  assignedModerator: z.string().nullable().optional(),
  assignedAt: z.coerce.date().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
  resolution: ResolutionTypeSchema.nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  escalatedTo: z.string().nullable().optional(),
  escalatedAt: z.coerce.date().nullable().optional(),
  escalationReason: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create report request schema
export const CreateReportRequestSchema = z.object({
  reportedEntityType: ReportedEntityTypeSchema,
  reportedEntityId: z.string(),
  reportedUserId: z.string().optional(),
  category: ReportCategorySchema,
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(5000),
  evidence: z.array(EvidenceItemSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Update report status request schema
export const UpdateReportStatusRequestSchema = z.object({
  status: ReportStatusSchema,
  notes: z.string().optional(),
});

// Assign report request schema
export const AssignReportRequestSchema = z.object({
  moderatorId: z.string(),
});

// Escalate report request schema
export const EscalateReportRequestSchema = z.object({
  escalatedTo: z.string(),
  reason: z.string().min(10).max(1000),
});

// Bulk update reports request schema
export const BulkUpdateReportsRequestSchema = z.object({
  reportIds: z.array(z.string()).min(1),
  action: z.enum(['resolve', 'dismiss', 'assign', 'escalate']),
  moderatorId: z.string().optional(),
  escalatedTo: z.string().optional(),
  notes: z.string().optional(),
});

// Moderator action schema
export const ModeratorActionSchema = z.object({
  actionId: z.string(),
  moderatorId: z.string(),
  reportId: z.string().optional(),
  targetEntityType: ReportedEntityTypeSchema,
  targetEntityId: z.string(),
  targetUserId: z.string().optional(),
  actionType: ActionTypeSchema,
  severity: ActionSeveritySchema,
  reason: z.string().min(3).max(500),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  duration: z.number().int().min(1).max(8760).optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  reversedBy: z.string().optional(),
  reversedAt: z.coerce.date().optional(),
  reversalReason: z.string().optional(),
  evidence: z.array(EvidenceItemSchema).default([]),
  notificationSent: z.boolean().default(false),
  internalNotes: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create moderator action request schema
export const CreateModeratorActionRequestSchema = z.object({
  reportId: z.string().optional(),
  targetEntityType: ReportedEntityTypeSchema,
  targetEntityId: z.string(),
  targetUserId: z.string().optional(),
  actionType: ActionTypeSchema,
  severity: ActionSeveritySchema,
  reason: z.string().min(3).max(500),
  description: z.string().optional(),
  duration: z.number().int().min(1).max(8760).optional(),
  evidence: z.array(EvidenceItemSchema).optional(),
  internalNotes: z.string().optional(),
});

// Filter schemas
export const ReportFiltersSchema = z.object({
  status: ReportStatusSchema.optional(),
  category: ReportCategorySchema.optional(),
  severity: ReportSeveritySchema.optional(),
  reportedEntityType: ReportedEntityTypeSchema.optional(),
  assignedModerator: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'severity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ActionFiltersSchema = z.object({
  actionType: ActionTypeSchema.optional(),
  severity: ActionSeveritySchema.optional(),
  isActive: z.boolean().optional(),
  moderatorId: z.string().optional(),
  targetUserId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Response schemas
export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const ReportsResponseSchema = z.object({
  data: z.array(ReportSchema),
  pagination: PaginationSchema,
});

export const ActionsResponseSchema = z.object({
  data: z.array(ModeratorActionSchema),
  pagination: PaginationSchema,
});

export const ModerationMetricsSchema = z.object({
  totalReports: z.number().int(),
  pendingReports: z.number().int(),
  underReviewReports: z.number().int(),
  resolvedReports: z.number().int(),
  dismissedReports: z.number().int(),
  escalatedReports: z.number().int(),
  criticalReports: z.number().int(),
  averageResolutionTime: z.number(),
  reportsToday: z.number().int(),
  reportsThisWeek: z.number().int(),
  reportsThisMonth: z.number().int(),
  topCategories: z.array(
    z.object({
      category: ReportCategorySchema,
      count: z.number().int(),
    })
  ),
  moderatorActivity: z.array(
    z.object({
      moderatorId: z.string(),
      actionsCount: z.number().int(),
      resolvedCount: z.number().int(),
    })
  ),
});

// Export inferred types
export type ReportCategory = z.infer<typeof ReportCategorySchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export type ReportSeverity = z.infer<typeof ReportSeveritySchema>;
export type ReportedEntityType = z.infer<typeof ReportedEntityTypeSchema>;
export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ActionSeverity = z.infer<typeof ActionSeveritySchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
export type UpdateReportStatusRequest = z.infer<typeof UpdateReportStatusRequestSchema>;
export type AssignReportRequest = z.infer<typeof AssignReportRequestSchema>;
export type EscalateReportRequest = z.infer<typeof EscalateReportRequestSchema>;
export type BulkUpdateReportsRequest = z.infer<typeof BulkUpdateReportsRequestSchema>;
export type ModeratorAction = z.infer<typeof ModeratorActionSchema>;
export type CreateModeratorActionRequest = z.infer<typeof CreateModeratorActionRequestSchema>;
export type ReportFilters = z.infer<typeof ReportFiltersSchema>;
export type ActionFilters = z.infer<typeof ActionFiltersSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ReportsResponse = z.infer<typeof ReportsResponseSchema>;
export type ActionsResponse = z.infer<typeof ActionsResponseSchema>;
export type ModerationMetrics = z.infer<typeof ModerationMetricsSchema>;
