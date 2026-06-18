import type { ReferenceCheck, HomeVisit, ApplicationTimeline } from '../../types/applications';
import type { ApplicationStage, StageAction } from '../../types/applicationStages';

export type ApplicationReference = {
  id?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  clinicName?: string;
  status?: 'pending' | 'contacted' | 'completed' | 'failed';
  notes?: string;
  contacted_at?: string;
  contacted_by?: string;
};

export type ApplicationData = {
  id: string;
  status: string;
  petName?: string;
  petId?: string;
  applicantName?: string;
  userName?: string;
  submittedDaysAgo?: number;
  submittedAt?: string;
  stage?: ApplicationStage;
  references?: ApplicationReference[];
  data?: Record<string, unknown>;
};

export type ApplicationReviewProps = {
  application: ApplicationData;
  references: ReferenceCheck[];
  homeVisits: HomeVisit[];
  timeline: ApplicationTimeline[];
  timelineError?: string | null;
  referencesError?: string | null;
  homeVisitsError?: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string) => void;
  onStageTransition: (action: StageAction, notes?: string) => Promise<void>;
  onReferenceUpdate: (referenceId: string, status: string, notes?: string) => void;
  onScheduleVisit: (visitData: {
    scheduledDate: string;
    scheduledTime: string;
    assignedStaff: string;
    notes?: string;
  }) => void;
  onUpdateVisit: (visitId: string, updateData: Record<string, unknown>) => void;
  onAddTimelineEvent: (event: string, description: string, data?: Record<string, unknown>) => void;
  onRefresh?: () => void;
};
