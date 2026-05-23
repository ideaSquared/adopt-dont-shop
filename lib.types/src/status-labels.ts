/**
 * Centralized display labels for status enums shared across all apps.
 *
 * Background: the cross-app UX audit (third pass, finding C5) found that
 * status labels diverged between apps — e.g. `submitted` rendered as
 * "Submitted" in one app, "Pending" in another, and "Under Review"
 * elsewhere. These functions are the single source of truth for the
 * human-readable label of each enum value.
 *
 * The union types here mirror the canonical backend enums in
 * service.backend/src/models/{Application,Report}.ts and the Zod schemas
 * in lib.rescue. They are duplicated (not imported) because lib.types is
 * zero-dep and consumed by both frontend and backend.
 */

// ── Applications ──────────────────────────────────────────────────────────────

export type ApplicationStatusValue = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

export const applicationStatusLabel = (status: ApplicationStatusValue): string => {
  const labels: Record<ApplicationStatusValue, string> = {
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status];
};

export type ApplicationStageValue =
  | 'pending'
  | 'reviewing'
  | 'visiting'
  | 'deciding'
  | 'resolved'
  | 'withdrawn';

export const applicationStageLabel = (stage: ApplicationStageValue): string => {
  const labels: Record<ApplicationStageValue, string> = {
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

export type RescueStatusValue = 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';

export const rescueStatusLabel = (status: RescueStatusValue): string => {
  const labels: Record<RescueStatusValue, string> = {
    pending: 'Pending Verification',
    verified: 'Verified',
    suspended: 'Suspended',
    inactive: 'Inactive',
    rejected: 'Rejected',
  };
  return labels[status];
};
