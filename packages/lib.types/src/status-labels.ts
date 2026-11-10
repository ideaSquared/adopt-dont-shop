import type {
  ApplicationStatus,
  ApplicationStage,
  PetStatus,
  REPORT_STATUSES,
  RescueStatus,
  SupportTicketStatus,
  UserStatus,
} from './types/domain-status.js';

// ── Applications ──────────────────────────────────────────────────────────────

export const applicationStatusLabel = (status: ApplicationStatus): string => {
  const labels: Record<ApplicationStatus, string> = {
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status];
};

export const applicationStageLabel = (stage: ApplicationStage): string => {
  const labels: Record<ApplicationStage, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    visiting: 'Home Visit',
    deciding: 'Deciding',
    resolved: 'Resolved',
    withdrawn: 'Withdrawn',
  };
  return labels[stage];
};

// ── Reports (moderation) ──────────────────────────────────────────────────────

export type ReportStatusValue = (typeof REPORT_STATUSES)[number];

export const reportStatusLabel = (status: ReportStatusValue): string => {
  const labels: Record<ReportStatusValue, string> = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
    escalated: 'Escalated',
  };
  return labels[status];
};

// ── Rescues ───────────────────────────────────────────────────────────────────

export const rescueStatusLabel = (status: RescueStatus): string => {
  const labels: Record<RescueStatus, string> = {
    pending: 'Pending Verification',
    verified: 'Verified',
    suspended: 'Suspended',
    inactive: 'Inactive',
    rejected: 'Rejected',
  };
  return labels[status];
};

// ── Pets ──────────────────────────────────────────────────────────────────────

export const petStatusLabel = (status: PetStatus): string => {
  const labels: Record<PetStatus, string> = {
    available: 'Available',
    pending: 'Pending',
    adopted: 'Adopted',
    foster: 'Foster',
    medical_hold: 'Medical Hold',
    behavioral_hold: 'Behavioural Hold',
    on_hold: 'On Hold',
    medical_care: 'Medical Care',
    not_available: 'Unavailable',
    deceased: 'Deceased',
  };
  return labels[status];
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const userStatusLabel = (status: UserStatus): string => {
  const labels: Record<UserStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending_verification: 'Pending Verification',
    deactivated: 'Deactivated',
  };
  return labels[status];
};

// ── Support tickets ───────────────────────────────────────────────────────────

export const supportTicketStatusLabel = (status: SupportTicketStatus): string => {
  const labels: Record<SupportTicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_for_user: 'Waiting for User',
    resolved: 'Resolved',
    closed: 'Closed',
    escalated: 'Escalated',
  };
  return labels[status];
};
