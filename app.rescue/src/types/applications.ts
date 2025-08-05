import { ApplicationStatus, ApplicationWithPetInfo } from '@adopt-dont-shop/lib-applications';

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
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  data?: Record<string, any>;
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
