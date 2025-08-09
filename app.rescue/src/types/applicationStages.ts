// Stage-based application workflow types as per PRD requirements

export type ApplicationStage =
  | 'PENDING' // 📋 Applications submitted and awaiting initial review
  | 'REVIEWING' // 🔍 Active review process including reference checks and screening
  | 'VISITING' // 🏠 Home visit scheduled, in progress, or completed with positive outcome
  | 'DECIDING' // ⚖️ Final decision phase after successful home visit
  | 'RESOLVED'; // ✅ Application completed with final outcome

export type FinalOutcome =
  | 'APPROVED' // Application approved for adoption
  | 'CONDITIONAL' // Application approved with conditions
  | 'REJECTED' // Application rejected
  | 'WITHDRAWN'; // Application withdrawn by applicant

// Stage progression tracking
export interface StageProgress {
  stage: ApplicationStage;
  completedAt?: Date;
  assignedStaff?: string;
  notes?: string;
  automaticTransition?: boolean;
}

// Stage-specific actions and transitions
export interface StageAction {
  type:
    | 'START_REVIEW'
    | 'SCHEDULE_VISIT'
    | 'COMPLETE_VISIT'
    | 'MAKE_DECISION'
    | 'REJECT'
    | 'WITHDRAW';
  stage: ApplicationStage;
  nextStage?: ApplicationStage;
  requiresInput?: boolean;
  data?: Record<string, any>;
}

// Updated Application interface for stage-based workflow
export interface ApplicationWithStages {
  // Existing fields
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  submittedAt: Date;

  // Legacy status (for backward compatibility)
  status: string;

  // New stage-based system
  stage: ApplicationStage;
  finalOutcome?: FinalOutcome;

  // Stage progress tracking
  stageHistory: StageProgress[];
  currentStageStarted: Date;

  // Stage-specific timestamps
  reviewStartedAt?: Date;
  visitScheduledAt?: Date;
  visitCompletedAt?: Date;
  resolvedAt?: Date;

  // Outcome documentation
  withdrawalReason?: string;
  rejectionReason?: string;
  approvalConditions?: string;

  // Progress metrics
  stageProgressPercentage: number; // 0-100% completion
  estimatedCompletionDate?: Date;

  // Staff assignments
  assignedReviewer?: string;
  assignedVisitor?: string;

  // References and visits
  references?: ApplicationReference[];
  homeVisits?: ApplicationHomeVisit[];

  // Application data
  answers: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
}

export interface ApplicationReference {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  status: 'pending' | 'contacted' | 'completed' | 'failed';
  notes?: string;
  contactedAt?: Date;
  completedAt?: Date;
}

export interface ApplicationHomeVisit {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  assignedStaff: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  outcome?: 'positive' | 'negative' | 'conditional';
  notes?: string;
  completedAt?: Date;
}

// Stage-based analytics types
export interface StageAnalytics {
  stageDistribution: Record<ApplicationStage, number>;
  stageConversionRates: Record<ApplicationStage, number>;
  averageTimePerStage: Record<ApplicationStage, number>;
  stagePerfectionRate: Record<ApplicationStage, number>;
  bottlenecks: Array<{
    stage: ApplicationStage;
    averageTime: number;
    applicationsStuck: number;
  }>;
}

// Action definitions for each stage
export const STAGE_ACTIONS: Record<ApplicationStage, StageAction[]> = {
  PENDING: [
    { type: 'START_REVIEW', stage: 'PENDING', nextStage: 'REVIEWING' },
    { type: 'REJECT', stage: 'PENDING', nextStage: 'RESOLVED' },
    { type: 'WITHDRAW', stage: 'PENDING', nextStage: 'RESOLVED' },
  ],
  REVIEWING: [
    { type: 'SCHEDULE_VISIT', stage: 'REVIEWING', nextStage: 'VISITING' },
    { type: 'MAKE_DECISION', stage: 'REVIEWING', nextStage: 'DECIDING' }, // Skip visit option
    { type: 'REJECT', stage: 'REVIEWING', nextStage: 'RESOLVED' },
    { type: 'WITHDRAW', stage: 'REVIEWING', nextStage: 'RESOLVED' },
  ],
  VISITING: [
    { type: 'COMPLETE_VISIT', stage: 'VISITING', nextStage: 'DECIDING' },
    { type: 'REJECT', stage: 'VISITING', nextStage: 'RESOLVED' },
    { type: 'WITHDRAW', stage: 'VISITING', nextStage: 'RESOLVED' },
  ],
  DECIDING: [
    { type: 'MAKE_DECISION', stage: 'DECIDING', nextStage: 'RESOLVED' },
    { type: 'WITHDRAW', stage: 'DECIDING', nextStage: 'RESOLVED' },
  ],
  RESOLVED: [],
};

// Stage display configuration
export const STAGE_CONFIG = {
  PENDING: {
    label: 'Pending',
    emoji: '📋',
    color: '#3B82F6',
    description: 'Applications submitted and awaiting initial review',
  },
  REVIEWING: {
    label: 'Reviewing',
    emoji: '🔍',
    color: '#F59E0B',
    description: 'Active review process including reference checks and screening',
  },
  VISITING: {
    label: 'Visiting',
    emoji: '🏠',
    color: '#F97316',
    description: 'Home visit scheduled, in progress, or completed',
  },
  DECIDING: {
    label: 'Deciding',
    emoji: '⚖️',
    color: '#8B5CF6',
    description: 'Final decision phase after successful evaluation',
  },
  RESOLVED: {
    label: 'Resolved',
    emoji: '✅',
    color: '#10B981',
    description: 'Application completed with final outcome',
  },
};

// Outcome display configuration
export const OUTCOME_CONFIG = {
  APPROVED: {
    label: 'Approved',
    color: '#10B981',
    emoji: '✅',
  },
  CONDITIONAL: {
    label: 'Conditionally Approved',
    color: '#F59E0B',
    emoji: '⚠️',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#EF4444',
    emoji: '❌',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: '#6B7280',
    emoji: '↩️',
  },
};
