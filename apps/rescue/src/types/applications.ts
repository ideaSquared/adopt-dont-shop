import {
  ApplicationStatus,
  ApplicationWithPetInfo,
  ApplicationPriority,
} from '@adopt-dont-shop/lib.applications';
import { ApplicationStage, FinalOutcome } from './applicationStages';

// Timeline Event Types (matching backend enum)
export enum TimelineEventType {
  STAGE_CHANGE = 'stage_change',
  STATUS_UPDATE = 'status_update',
  NOTE_ADDED = 'note_added',
  REFERENCE_CONTACTED = 'reference_contacted',
  REFERENCE_VERIFIED = 'reference_verified',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  HOME_VISIT_COMPLETED = 'home_visit_completed',
  HOME_VISIT_RESCHEDULED = 'home_visit_rescheduled',
  HOME_VISIT_CANCELLED = 'home_visit_cancelled',
  SCORE_UPDATED = 'score_updated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DECISION_MADE = 'decision_made',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  APPLICATION_REOPENED = 'application_reopened',
  COMMUNICATION_SENT = 'communication_sent',
  COMMUNICATION_RECEIVED = 'communication_received',
  SYSTEM_AUTO_PROGRESSION = 'system_auto_progression',
  MANUAL_OVERRIDE = 'manual_override',
}

// Extended types for rescue app UI. Omit lib.applications' `stage`
// (lowercase, optional) so the local uppercase ApplicationStage from
// ./applicationStages stays the source of truth for the rescue UI.
// The two enums represent the same workflow; aligning them on
// lowercase is a separate follow-up.
export interface ApplicationListItem extends Omit<ApplicationWithPetInfo, 'stage'> {
  applicantName: string;
  submittedDaysAgo: number;
  priority: ApplicationPriority;
  referencesStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  homeVisitStatus: 'not_scheduled' | 'scheduled' | 'completed' | 'failed';

  // New stage-based fields
  stage: ApplicationStage;
  finalOutcome?: FinalOutcome;
  stageProgressPercentage: number;
  assignedStaff?: string;
  tags?: string[];
}

export interface ApplicationFilter {
  status?: ApplicationStatus[];
  petId?: string;
  petType?: string;
  petBreed?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: string[];
  referencesStatus?: string;
  homeVisitStatus?: string;
  searchQuery?: string;
}

export interface ApplicationSort {
  field: 'submittedAt' | 'status' | 'petName' | 'applicantName' | 'priority';
  direction: 'asc' | 'desc';
}

export interface ReferenceCheck {
  id: string;
  applicationId: string;
  type: 'veterinarian' | 'personal';
  contactName: string;
  contactInfo: string;
  status: 'pending' | 'contacted' | 'completed' | 'failed';
  notes?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface HomeVisit {
  id: string;
  applicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  assignedStaff: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  outcome?: 'approved' | 'rejected' | 'conditional';
  outcomeNotes?: string;
  cancelReason?: string;
  cancelledAt?: string;
  completedAt?: string;
}

export interface ApplicationTimeline {
  id: string;
  applicationId: string;
  event: string;
  title?: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName: string;
  data?: Record<string, unknown>;
  eventType?: string;
  isSystemGenerated?: boolean;
  previousStage?: string;
  newStage?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  avgProcessingTime: number;
  recentSubmissions: number;
  pendingReferences: number;
  scheduledVisits: number;
}

export interface BulkAction {
  type: 'approve' | 'reject' | 'withdraw' | 'schedule_visit' | 'send_message';
  applicationIds: string[];
  data?: Record<string, unknown>;
}

/**
 * ADS-699: raw shapes returned by the backend `/applications` endpoints
 * before the rescue service transforms them into UI-facing types. These
 * are intentionally loose (everything optional, most fields `unknown`)
 * because the backend payloads still mix snake_case and camelCase and
 * the rescue service has to tolerate both. Use these instead of `any`
 * so the compiler at least checks that fields exist on the type.
 */
export interface RawReference {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  status?: ReferenceCheck['status'];
  notes?: string;
  contactedAt?: string;
  contactedBy?: string;
}

export interface RawTimelineItemUser {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface RawTimelineItem {
  id?: string;
  timeline_id?: string;
  application_id?: string;
  event_type?: string;
  event?: string;
  title?: string;
  description?: string;
  created_at?: string;
  timestamp?: string;
  created_by?: string;
  userId?: string;
  created_by_system?: boolean;
  created_by_name?: string;
  userName?: string;
  CreatedBy?: RawTimelineItemUser;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  previous_stage?: string;
  new_stage?: string;
  previous_status?: string;
  new_status?: string;
}

export interface RawApplicationPersonalInfo {
  firstName?: string;
  lastName?: string;
}

export interface RawApplicationData {
  personalInfo?: RawApplicationPersonalInfo;
  [key: string]: unknown;
}

export interface RawApplication {
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  petName?: string;
  petType?: string;
  petBreed?: string;
  stage?: ApplicationStage;
  priority?: string;
  submittedAt?: string | null;
  data?: RawApplicationData;
  references?: RawReference[];
  assignedStaff?: string;
  tags?: string[];
  finalOutcome?: FinalOutcome;
  referencesCompleted?: boolean;
  homeVisitCompleted?: boolean;
  interviewCompleted?: boolean;
}
