// Stage-based application workflow types as per PRD requirements

export type ApplicationStage =
  | 'PENDING' // 📋 Applications submitted and awaiting initial review
  | 'REVIEWING' // 🔍 Active review process including reference checks and screening
  | 'VISITING' // 🏠 Home visit scheduled, in progress, or completed with positive outcome
  | 'DECIDING' // ⚖️ Final decision phase after successful home visit
  | 'RESOLVED'; // ✅ Application completed with final outcome

export type FinalOutcome =
  | 'APPROVED' // Application approved for adoption
  | 'REJECTED' // Application rejected
  | 'WITHDRAWN'; // Application withdrawn by applicant

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
  data?: Record<string, unknown>;
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
