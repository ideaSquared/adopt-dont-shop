import type { ApplicationStatus, ApplicationStage, RescueStatus } from './types/domain-status';

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

export type ReportStatusValue = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';

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
