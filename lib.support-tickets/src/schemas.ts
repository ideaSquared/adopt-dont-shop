import { z } from 'zod';

// Enums matching backend models
export const TicketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed',
  'escalated',
]);

export const TicketPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
  'critical',
]);

export const TicketCategorySchema = z.enum([
  'technical_issue',
  'account_problem',
  'adoption_inquiry',
  'payment_issue',
  'feature_request',
  'report_bug',
  'general_question',
  'compliance_concern',
  'data_request',
  'other',
]);

export const ResponderTypeSchema = z.enum(['staff', 'user']);

// Attachment schema
export const AttachmentSchema = z.object({
  filename: z.string(),
  url: z.string().url(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  uploadedAt: z.coerce.date().optional(),
});

// Ticket response schema
export const TicketResponseSchema = z.object({
  responseId: z.string(),
  responderId: z.string(),
  responderType: ResponderTypeSchema,
  content: z.string().min(1),
  attachments: z.array(AttachmentSchema).optional(),
  isInternal: z.boolean().default(false),
  createdAt: z.coerce.date(),
});

// Support ticket schema
export const SupportTicketSchema = z.object({
  ticketId: z.string(),
  userId: z.string().nullable().optional(),
  userEmail: z.string().email(),
  userName: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  category: TicketCategorySchema,
  subject: z.string().min(3).max(255),
  description: z.string().min(10).max(10000),
  tags: z.array(z.string()).default([]),
  responses: z.array(TicketResponseSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
  firstResponseAt: z.coerce.date().nullable().optional(),
  lastResponseAt: z.coerce.date().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
  closedAt: z.coerce.date().nullable().optional(),
  escalatedAt: z.coerce.date().nullable().optional(),
  escalatedTo: z.string().nullable().optional(),
  escalationReason: z.string().nullable().optional(),
  satisfactionRating: z.number().int().min(1).max(5).nullable().optional(),
  satisfactionFeedback: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedResolutionTime: z.number().int().positive().nullable().optional(),
  actualResolutionTime: z.number().int().positive().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create ticket request schema
export const CreateTicketRequestSchema = z.object({
  userId: z.string().optional(),
  userEmail: z.string().email(),
  userName: z.string().optional(),
  category: TicketCategorySchema,
  priority: TicketPrioritySchema.default('normal'),
  subject: z.string().min(3).max(255),
  description: z.string().min(10).max(10000),
  tags: z.array(z.string()).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Update ticket request schema
export const UpdateTicketRequestSchema = z.object({
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  category: TicketCategorySchema.optional(),
  subject: z.string().min(3).max(255).optional(),
  description: z.string().min(10).max(10000).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedResolutionTime: z.number().int().positive().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
});

// Assign ticket request schema
export const AssignTicketRequestSchema = z.object({
  assignedTo: z.string(),
});

// Add response request schema
export const AddResponseRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
  attachments: z.array(AttachmentSchema).optional(),
});

// Escalate ticket request schema
export const EscalateTicketRequestSchema = z.object({
  escalatedTo: z.string(),
  reason: z.string().min(10).max(1000),
});

// Rate ticket request schema
export const RateTicketRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional(),
});

// Filter schemas
export const TicketFiltersSchema = z.object({
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  category: TicketCategorySchema.optional(),
  assignedTo: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  isOverdue: z.boolean().optional(),
  hasResponses: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Response schemas
export const PaginationSchema = z.object({
  currentPage: z.number().int(),
  totalPages: z.number().int(),
  totalItems: z.number().int(),
  itemsPerPage: z.number().int(),
});

export const TicketsResponseSchema = z.object({
  data: z.array(SupportTicketSchema),
  pagination: PaginationSchema,
});

export const TicketStatsSchema = z.object({
  total: z.number().int(),
  open: z.number().int(),
  inProgress: z.number().int(),
  waitingForUser: z.number().int(),
  resolved: z.number().int(),
  closed: z.number().int(),
  escalated: z.number().int(),
  overdue: z.number().int(),
  unassigned: z.number().int(),
  averageResponseTime: z.number(),
  averageResolutionTime: z.number(),
  satisfactionAverage: z.number().nullable(),
  ticketsToday: z.number().int(),
  ticketsThisWeek: z.number().int(),
  ticketsThisMonth: z.number().int(),
  byPriority: z.object({
    low: z.number().int(),
    normal: z.number().int(),
    high: z.number().int(),
    urgent: z.number().int(),
    critical: z.number().int(),
  }),
  byCategory: z.array(
    z.object({
      category: TicketCategorySchema,
      count: z.number().int(),
    })
  ),
  staffActivity: z.array(
    z.object({
      staffId: z.string(),
      assignedCount: z.number().int(),
      resolvedCount: z.number().int(),
    })
  ).optional(),
});

// Export inferred types
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
export type TicketCategory = z.infer<typeof TicketCategorySchema>;
export type ResponderType = z.infer<typeof ResponderTypeSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type TicketResponse = z.infer<typeof TicketResponseSchema>;
export type SupportTicket = z.infer<typeof SupportTicketSchema>;
export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;
export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequestSchema>;
export type AssignTicketRequest = z.infer<typeof AssignTicketRequestSchema>;
export type AddResponseRequest = z.infer<typeof AddResponseRequestSchema>;
export type EscalateTicketRequest = z.infer<typeof EscalateTicketRequestSchema>;
export type RateTicketRequest = z.infer<typeof RateTicketRequestSchema>;
export type TicketFilters = z.infer<typeof TicketFiltersSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type TicketsResponse = z.infer<typeof TicketsResponseSchema>;
export type TicketStats = z.infer<typeof TicketStatsSchema>;
