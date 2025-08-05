import { ApplicationStatus, ApplicationWithPetInfo } from '@adopt-dont-shop/lib-applications';

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

// Extended types for rescue app UI
export interface ApplicationListItem extends ApplicationWithPetInfo {
  applicantName: string;
  submittedDaysAgo: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  referencesStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  homeVisitStatus: 'not_scheduled' | 'scheduled' | 'completed' | 'failed';
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
  data?: Record<string, any>;
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
  type: 'approve' | 'reject' | 'schedule_visit' | 'request_references' | 'send_message';
  applicationIds: string[];
  data?: Record<string, any>;
}
