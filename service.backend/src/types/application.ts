import { ApplicationPriority, ApplicationStatus } from '../models/Application';
import { QuestionCategory, QuestionType } from '../models/ApplicationQuestion';
import { PaginationOptions } from './api';
import { JsonObject, JsonValue } from './common';

// Core Application Types
export interface ApplicationData {
  applicationId: string;
  userId: string;
  petId: string;
  rescueId: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  actionedBy?: string | null;
  actionedAt?: Date | null;
  rejectionReason?: string | null;
  answers: JsonObject;
  // references[] is sourced from the application_references table now
  // (plan 2.1). Optional on the wire shape because most read paths
  // don't eager-load it; populated by the routes that surface
  // references explicitly.
  references?: ApplicationReference[];
  documents: ApplicationDocument[];
  interviewNotes?: string | null;
  homeVisitNotes?: string | null;
  score?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  decisionAt?: Date | null;
  expiresAt?: Date | null;
  followUpDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  // New stage-based fields
  stage?: string;
  finalOutcome?: string | null;
  reviewStartedAt?: Date | null;
  visitScheduledAt?: Date | null;
  visitCompletedAt?: Date | null;
  resolvedAt?: Date | null;
  withdrawalReason?: string | null;
  stageRejectionReason?: string | null;
}

export interface ApplicationReference {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  contacted_at?: Date;
  status: 'pending' | 'contacted' | 'verified' | 'failed';
  notes?: string;
  contacted_by?: string;
}

// Frontend-compatible Application format
export interface FrontendApplication {
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  status: ApplicationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  data: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    householdInfo?: {
      householdSize?: number;
      hasChildren?: boolean;
      childrenAges?: number[];
      householdMembers?: string[];
    };
    petExperience?: {
      previousPets?: boolean;
      currentPets?: boolean;
      petTypes?: string[];
      experience?: string;
    };
    livingConditions?: {
      homeType?: string;
      hasYard?: boolean;
      yardSize?: string;
      rentOrOwn?: string;
      landlordContact?: string;
    };
    answers?: Record<string, unknown>;
    references?: {
      personal?: ApplicationReference[];
    };
    documents?: ApplicationDocument[];
  };
  documents?: Array<{
    id: string;
    type: string;
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  petName?: string;
  petType?: string;
  petBreed?: string;
  userName?: string;
  userEmail?: string;
}

export interface ApplicationDocument {
  documentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  verified: boolean;
}

// Request/Response Types
export interface CreateApplicationRequest {
  petId: string;
  answers: JsonObject;
  references: Omit<ApplicationReference, 'contacted_at' | 'status'>[];
  priority?: ApplicationPriority;
  notes?: string;
  tags?: string[];
  // ADS-535: applicant must confirm references have consented to contact
  // before SUBMITTED applications are accepted. The Application model's
  // beforeValidate hook enforces this, so the API has to thread the flag in.
  referencesConsented?: boolean;
}

export interface UpdateApplicationRequest {
  answers?: JsonObject;
  references?: ApplicationReference[];
  priority?: ApplicationPriority;
  notes?: string;
  tags?: string[];
  interviewNotes?: string;
  homeVisitNotes?: string;
  score?: number;
}

export interface ApplicationStatusUpdateRequest {
  status: ApplicationStatus;
  actionedBy: string;
  rejectionReason?: string;
  notes?: string;
  followUpDate?: Date;
}

export interface ApplicationDocumentUpload {
  documentType: string;
  fileName: string;
  fileUrl: string;
}

// Search and Filter Types
export interface ApplicationSearchFilters {
  search?: string;
  status?: ApplicationStatus | ApplicationStatus[];
  priority?: ApplicationPriority | ApplicationPriority[];
  userId?: string;
  petId?: string;
  rescueId?: string;
  actionedBy?: string;
  score_min?: number;
  score_max?: number;
  tags?: string[];
  hasInterviewNotes?: boolean;
  hasHomeVisitNotes?: boolean;
  // ADS-575: narrow results by the associated pet's type / breed. Both
  // are matched case-insensitively against the eager-loaded Pet record.
  petType?: string;
  petBreed?: string;
  submittedFrom?: Date;
  submittedTo?: Date;
  reviewedFrom?: Date;
  reviewedTo?: Date;
  decisionFrom?: Date;
  decisionTo?: Date;
  expiresFrom?: Date;
  expiresTo?: Date;
  followUpFrom?: Date;
  followUpTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface ApplicationSearchOptions extends PaginationOptions {
  include_deleted?: boolean;
  include_user?: boolean;
  include_pet?: boolean;
  include_rescue?: boolean;
}

// Statistics and Analytics Types
export interface ApplicationStatistics {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  applicationsByPriority: Record<ApplicationPriority, number>;
  averageProcessingTime: number; // in days
  approvalRate: number; // percentage
  rejectionRate: number; // percentage
  withdrawalRate: number; // percentage
  pendingApplications: number;
  overdueApplications: number;
  applicationsThisMonth: number;
  applicationsLastMonth: number;
  growthRate: number; // percentage
  averageScore: number;
  topRejectionReasons: Array<{ reason: string; count: number }>;
  applicationsByRescue: Array<{ rescueId: string; rescueName: string; count: number }>;
  applicationsByMonth: Array<{ month: string; count: number }>;
}

export interface ApplicationWorkflowStatistics {
  average_time_by_status: Record<ApplicationStatus, number>; // in hours
  conversion_rates: Record<ApplicationStatus, number>; // percentage moving to next stage
  bottlenecks: Array<{ status: ApplicationStatus; avg_time: number; count: number }>;
  completion_rates: {
    submitted_to_approved: number;
    submitted_to_rejected: number;
  };
}

// Activity and History Types
export interface ApplicationActivity {
  activityId: string;
  applicationId: string;
  userId: string;
  activityType:
    | 'status_change'
    | 'note_added'
    | 'document_uploaded'
    | 'reference_updated'
    | 'score_updated';
  description: string;
  metadata?: JsonObject;
  createdAt: Date;
}

export interface ApplicationStatusHistory {
  historyId: string;
  applicationId: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  changedBy: string;
  reason?: string;
  notes?: string;
  changedAt: Date;
}

// Bulk Operations Types
export interface BulkApplicationUpdate {
  applicationIds: string[];
  updates: {
    status?: ApplicationStatus;
    priority?: ApplicationPriority;
    tags?: string[];
    notes?: string;
    actionedBy?: string;
  };
}

export interface BulkApplicationResult {
  successCount: number;
  failureCount: number;
  successes: string[];
  failures: Array<{ applicationId: string; error: string }>;
}

// Workflow and Business Logic Types
export interface ApplicationWorkflowConfig {
  auto_approve_score_threshold?: number;
  auto_reject_score_threshold?: number;
  require_references_for_approval: boolean;
  require_interview_for_approval: boolean;
  require_home_visit_for_approval: boolean;
  application_expiry_days: number;
  follow_up_reminder_days: number;
  reference_contact_timeout_days: number;
}

export interface ApplicationScoring {
  criteria: Array<{
    category: string;
    weight: number;
    questions: string[];
    scoring_rules: Record<string, number>;
  }>;
  maximum_score: number;
  passing_score?: number;
}

// Question Configuration Types
export interface QuestionConfigData {
  questionId: string;
  rescueId?: string | null;
  questionKey: string;
  scope: 'core' | 'rescue_specific';
  category: QuestionCategory;
  questionType: QuestionType;
  questionText: string;
  helpText?: string | null;
  placeholder?: string | null;
  options?: string[] | null;
  validationRules?: JsonObject | null;
  displayOrder: number;
  isEnabled: boolean;
  isRequired: boolean;
  conditionalLogic?: JsonObject | null;
}

// Application Form Types
export interface ApplicationFormStructure {
  categories: Array<{
    category: QuestionCategory;
    title: string;
    description?: string;
    questions: QuestionConfigData[];
  }>;
  total_questions: number;
  required_questions: number;
  estimated_time_minutes: number;
}

// Reference Management Types
export interface ReferenceContactRequest {
  applicationId: string;
  referenceIndex: number;
  contact_method: 'email' | 'phone';
  message?: string;
  scheduled_at?: Date;
}

export interface ReferenceUpdateRequest {
  reference_index?: number; // Support for index-based reference updates
  referenceId?: string; // Support for ID-based approach (ref-0, ref-1, etc.)
  status: 'pending' | 'contacted' | 'verified' | 'failed';
  notes?: string;
  contactedAt?: Date;
}

// Visit Scheduling Types
export interface ScheduleVisitRequest {
  applicationId: string;
  visit_type: 'interview' | 'home_visit';
  scheduled_date: Date;
  location?: string;
  notes?: string;
  staff_member_id?: string;
}

export interface VisitUpdateRequest {
  visitId: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  score?: number;
  completedAt?: Date;
  rescheduledDate?: Date;
}

// Notification Types
export interface ApplicationNotification {
  notificationId: string;
  applicationId: string;
  recipientId: string;
  notificationType: 'status_update' | 'reminder' | 'document_request' | 'reference_check';
  title: string;
  message: string;
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  metadata?: JsonObject;
}

// Export Types
export interface ApplicationExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  filters?: ApplicationSearchFilters;
  include_answers?: boolean;
  include_references?: boolean;
  include_documents?: boolean;
  include_history?: boolean;
  date_range?: {
    start_date: Date;
    end_date: Date;
  };
}

// Validation Types
export interface ApplicationValidationResult {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  completion_percentage: number;
  missing_required_fields: string[];
}

// Service Response Types
export interface ApplicationServiceResponse<T = JsonValue> {
  success: boolean;
  data?: T;
  error?: string;
  details?: JsonObject;
}

export interface PaginatedApplicationResponse {
  applications: ApplicationData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters_applied?: ApplicationSearchFilters;
  total_filtered?: number;
}
