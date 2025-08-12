import { ApplicationPriority, ApplicationStatus } from '../models/Application';
import { QuestionCategory, QuestionType } from '../models/ApplicationQuestion';
import { PaginationOptions } from './api';
import { JsonObject, JsonValue } from './common';

// Core Application Types
export interface ApplicationData {
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  actioned_by?: string | null;
  actioned_at?: Date | null;
  rejection_reason?: string | null;
  answers: JsonObject;
  references: ApplicationReference[];
  documents: ApplicationDocument[];
  interview_notes?: string | null;
  home_visit_notes?: string | null;
  score?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  submitted_at?: Date | null;
  reviewed_at?: Date | null;
  decision_at?: Date | null;
  expires_at?: Date | null;
  follow_up_date?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;

  // New stage-based fields
  stage?: string;
  final_outcome?: string | null;
  review_started_at?: Date | null;
  visit_scheduled_at?: Date | null;
  visit_completed_at?: Date | null;
  resolved_at?: Date | null;
  withdrawal_reason?: string | null;
  stage_rejection_reason?: string | null;
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
  document_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: Date;
  verified: boolean;
}

// Request/Response Types
export interface CreateApplicationRequest {
  pet_id: string;
  answers: JsonObject;
  references: Omit<ApplicationReference, 'contacted_at' | 'status'>[];
  priority?: ApplicationPriority;
  notes?: string;
  tags?: string[];
}

export interface UpdateApplicationRequest {
  answers?: JsonObject;
  references?: ApplicationReference[];
  priority?: ApplicationPriority;
  notes?: string;
  tags?: string[];
  interview_notes?: string;
  home_visit_notes?: string;
  score?: number;
}

export interface ApplicationStatusUpdateRequest {
  status: ApplicationStatus;
  actioned_by: string;
  rejection_reason?: string;
  notes?: string;
  follow_up_date?: Date;
}

export interface ApplicationDocumentUpload {
  document_type: string;
  file_name: string;
  file_url: string;
}

// Search and Filter Types
export interface ApplicationSearchFilters {
  search?: string;
  status?: ApplicationStatus | ApplicationStatus[];
  priority?: ApplicationPriority | ApplicationPriority[];
  user_id?: string;
  pet_id?: string;
  rescue_id?: string;
  actioned_by?: string;
  score_min?: number;
  score_max?: number;
  tags?: string[];
  has_interview_notes?: boolean;
  has_home_visit_notes?: boolean;
  submitted_from?: Date;
  submitted_to?: Date;
  reviewed_from?: Date;
  reviewed_to?: Date;
  decision_from?: Date;
  decision_to?: Date;
  expires_from?: Date;
  expires_to?: Date;
  follow_up_from?: Date;
  follow_up_to?: Date;
  created_from?: Date;
  created_to?: Date;
}

export interface ApplicationSearchOptions extends PaginationOptions {
  include_deleted?: boolean;
  include_user?: boolean;
  include_pet?: boolean;
  include_rescue?: boolean;
}

// Statistics and Analytics Types
export interface ApplicationStatistics {
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  applications_by_priority: Record<ApplicationPriority, number>;
  average_processing_time: number; // in days
  approval_rate: number; // percentage
  rejection_rate: number; // percentage
  withdrawal_rate: number; // percentage
  pending_applications: number;
  overdue_applications: number;
  applications_this_month: number;
  applications_last_month: number;
  growth_rate: number; // percentage
  average_score: number;
  top_rejection_reasons: Array<{ reason: string; count: number }>;
  applications_by_rescue: Array<{ rescue_id: string; rescue_name: string; count: number }>;
  applications_by_month: Array<{ month: string; count: number }>;
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
  activity_id: string;
  application_id: string;
  user_id: string;
  activity_type:
    | 'status_change'
    | 'note_added'
    | 'document_uploaded'
    | 'reference_updated'
    | 'score_updated';
  description: string;
  metadata?: JsonObject;
  created_at: Date;
}

export interface ApplicationStatusHistory {
  history_id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  changed_by: string;
  reason?: string;
  notes?: string;
  changed_at: Date;
}

// Bulk Operations Types
export interface BulkApplicationUpdate {
  application_ids: string[];
  updates: {
    status?: ApplicationStatus;
    priority?: ApplicationPriority;
    tags?: string[];
    notes?: string;
    actioned_by?: string;
  };
}

export interface BulkApplicationResult {
  success_count: number;
  failure_count: number;
  successes: string[];
  failures: Array<{ application_id: string; error: string }>;
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
  question_id: string;
  rescue_id?: string | null;
  question_key: string;
  scope: 'core' | 'rescue_specific';
  category: QuestionCategory;
  question_type: QuestionType;
  question_text: string;
  help_text?: string | null;
  placeholder?: string | null;
  options?: string[] | null;
  validation_rules?: JsonObject | null;
  display_order: number;
  is_enabled: boolean;
  is_required: boolean;
  conditional_logic?: JsonObject | null;
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
  application_id: string;
  reference_index: number;
  contact_method: 'email' | 'phone';
  message?: string;
  scheduled_at?: Date;
}

export interface ReferenceUpdateRequest {
  reference_index?: number; // Support for index-based reference updates
  referenceId?: string; // Support for ID-based approach (ref-0, ref-1, etc.)
  status: 'pending' | 'contacted' | 'verified' | 'failed';
  notes?: string;
  contacted_at?: Date;
}

// Visit Scheduling Types
export interface ScheduleVisitRequest {
  application_id: string;
  visit_type: 'interview' | 'home_visit';
  scheduled_date: Date;
  location?: string;
  notes?: string;
  staff_member_id?: string;
}

export interface VisitUpdateRequest {
  visit_id: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  score?: number;
  completed_at?: Date;
  rescheduled_date?: Date;
}

// Notification Types
export interface ApplicationNotification {
  notification_id: string;
  application_id: string;
  recipient_id: string;
  notification_type: 'status_update' | 'reminder' | 'document_request' | 'reference_check';
  title: string;
  message: string;
  scheduled_at?: Date;
  sent_at?: Date;
  read_at?: Date;
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
