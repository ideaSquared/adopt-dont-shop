import {
  applicationStatusLabel,
  petStatusLabel,
  reportStatusLabel,
  rescueStatusLabel,
  supportTicketStatusLabel,
  userStatusLabel,
  type ReportStatusValue,
} from './status-labels.js';
import {
  APPLICATION_STATUSES,
  PET_STATUSES,
  REPORT_STATUSES,
  RESCUE_STATUSES,
  SUPPORT_TICKET_STATUSES,
  USER_STATUSES,
  type ApplicationStatus,
  type PetStatus,
  type RescueStatus,
  type SupportTicketStatus,
  type UserStatus,
} from './types/domain-status.js';

/**
 * Semantic colour of a status badge. A subset of the `Badge` variants in
 * lib.components, so the value can be passed straight through.
 */
export type StatusBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

// ── Status → variant maps ─────────────────────────────────────────────────────

export const APPLICATION_STATUS_VARIANTS: Readonly<Record<ApplicationStatus, StatusBadgeVariant>> =
  {
    submitted: 'info',
    approved: 'success',
    rejected: 'error',
    withdrawn: 'neutral',
  };

export const PET_STATUS_VARIANTS: Readonly<Record<PetStatus, StatusBadgeVariant>> = {
  available: 'success',
  pending: 'warning',
  adopted: 'info',
  foster: 'info',
  medical_hold: 'neutral',
  behavioral_hold: 'neutral',
  on_hold: 'warning',
  medical_care: 'error',
  not_available: 'neutral',
  deceased: 'neutral',
};

export const RESCUE_STATUS_VARIANTS: Readonly<Record<RescueStatus, StatusBadgeVariant>> = {
  pending: 'warning',
  verified: 'success',
  suspended: 'neutral',
  inactive: 'neutral',
  rejected: 'error',
};

export const USER_STATUS_VARIANTS: Readonly<Record<UserStatus, StatusBadgeVariant>> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'error',
  pending_verification: 'warning',
  deactivated: 'neutral',
};

export const SUPPORT_TICKET_STATUS_VARIANTS: Readonly<
  Record<SupportTicketStatus, StatusBadgeVariant>
> = {
  open: 'error',
  in_progress: 'info',
  waiting_for_user: 'warning',
  resolved: 'success',
  closed: 'neutral',
  escalated: 'error',
};

export const REPORT_STATUS_VARIANTS: Readonly<Record<ReportStatusValue, StatusBadgeVariant>> = {
  pending: 'error',
  under_review: 'info',
  resolved: 'success',
  dismissed: 'neutral',
  escalated: 'neutral',
};

export const applicationStatusVariant = (status: ApplicationStatus): StatusBadgeVariant =>
  APPLICATION_STATUS_VARIANTS[status];

export const petStatusVariant = (status: PetStatus): StatusBadgeVariant =>
  PET_STATUS_VARIANTS[status];

export const rescueStatusVariant = (status: RescueStatus): StatusBadgeVariant =>
  RESCUE_STATUS_VARIANTS[status];

export const userStatusVariant = (status: UserStatus): StatusBadgeVariant =>
  USER_STATUS_VARIANTS[status];

export const supportTicketStatusVariant = (status: SupportTicketStatus): StatusBadgeVariant =>
  SUPPORT_TICKET_STATUS_VARIANTS[status];

export const reportStatusVariant = (status: ReportStatusValue): StatusBadgeVariant =>
  REPORT_STATUS_VARIANTS[status];

// ── Kind + raw string → label and variant ─────────────────────────────────────

export const STATUS_KINDS = [
  'application',
  'pet',
  'rescue',
  'user',
  'supportTicket',
  'report',
] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

export type StatusDisplay = { label: string; variant: StatusBadgeVariant };

const humanizeStatus = (status: string): string =>
  status
    .split('_')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const isOneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value);

/**
 * Label and variant for a status that arrives from the API as a plain string.
 * Values outside the kind's canonical set (new backend statuses, missing data)
 * render as a neutral badge with a humanised label instead of throwing.
 */
export const getStatusDisplay = (kind: StatusKind, status: string): StatusDisplay => {
  const fallback: StatusDisplay = { label: humanizeStatus(status), variant: 'neutral' };
  switch (kind) {
    case 'application':
      return isOneOf(APPLICATION_STATUSES, status)
        ? { label: applicationStatusLabel(status), variant: applicationStatusVariant(status) }
        : fallback;
    case 'pet':
      return isOneOf(PET_STATUSES, status)
        ? { label: petStatusLabel(status), variant: petStatusVariant(status) }
        : fallback;
    case 'rescue':
      return isOneOf(RESCUE_STATUSES, status)
        ? { label: rescueStatusLabel(status), variant: rescueStatusVariant(status) }
        : fallback;
    case 'user':
      return isOneOf(USER_STATUSES, status)
        ? { label: userStatusLabel(status), variant: userStatusVariant(status) }
        : fallback;
    case 'supportTicket':
      return isOneOf(SUPPORT_TICKET_STATUSES, status)
        ? { label: supportTicketStatusLabel(status), variant: supportTicketStatusVariant(status) }
        : fallback;
    case 'report':
      return isOneOf(REPORT_STATUSES, status)
        ? { label: reportStatusLabel(status), variant: reportStatusVariant(status) }
        : fallback;
  }
};
