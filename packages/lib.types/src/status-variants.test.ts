import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUS_VARIANTS,
  PET_STATUS_VARIANTS,
  REPORT_STATUS_VARIANTS,
  RESCUE_STATUS_VARIANTS,
  STATUS_KINDS,
  SUPPORT_TICKET_STATUS_VARIANTS,
  USER_STATUS_VARIANTS,
  applicationStatusVariant,
  getStatusDisplay,
  petStatusVariant,
  reportStatusVariant,
  rescueStatusVariant,
  supportTicketStatusVariant,
  userStatusVariant,
} from './status-variants';
import { petStatusLabel, supportTicketStatusLabel, userStatusLabel } from './status-labels';
import {
  APPLICATION_STATUSES,
  PET_STATUSES,
  REPORT_STATUSES,
  RESCUE_STATUSES,
  SUPPORT_TICKET_STATUSES,
  USER_STATUSES,
} from './types/domain-status';

describe('status variant maps', () => {
  it.each([
    ['application', APPLICATION_STATUSES, APPLICATION_STATUS_VARIANTS],
    ['pet', PET_STATUSES, PET_STATUS_VARIANTS],
    ['rescue', RESCUE_STATUSES, RESCUE_STATUS_VARIANTS],
    ['user', USER_STATUSES, USER_STATUS_VARIANTS],
    ['support ticket', SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_STATUS_VARIANTS],
    ['report', REPORT_STATUSES, REPORT_STATUS_VARIANTS],
  ] as const)('covers exactly the canonical %s statuses', (_name, statuses, variants) => {
    expect(Object.keys(variants).sort()).toEqual([...statuses].sort());
  });

  it('keeps the colours users see today for the statuses the apps agree on', () => {
    expect(applicationStatusVariant('approved')).toBe('success');
    expect(applicationStatusVariant('rejected')).toBe('error');
    expect(petStatusVariant('available')).toBe('success');
    expect(petStatusVariant('pending')).toBe('warning');
    expect(petStatusVariant('adopted')).toBe('info');
    expect(petStatusVariant('on_hold')).toBe('warning');
    expect(petStatusVariant('medical_care')).toBe('error');
    expect(rescueStatusVariant('verified')).toBe('success');
    expect(rescueStatusVariant('pending')).toBe('warning');
    expect(rescueStatusVariant('rejected')).toBe('error');
    expect(userStatusVariant('suspended')).toBe('error');
    expect(supportTicketStatusVariant('open')).toBe('error');
    expect(supportTicketStatusVariant('resolved')).toBe('success');
    expect(reportStatusVariant('under_review')).toBe('info');
    expect(reportStatusVariant('dismissed')).toBe('neutral');
  });
});

describe('new status labels', () => {
  it('labels every pet status', () => {
    PET_STATUSES.forEach(status => expect(petStatusLabel(status)).toBeTruthy());
    expect(petStatusLabel('on_hold')).toBe('On Hold');
    expect(petStatusLabel('medical_care')).toBe('Medical Care');
  });

  it('labels every user and support ticket status', () => {
    USER_STATUSES.forEach(status => expect(userStatusLabel(status)).toBeTruthy());
    SUPPORT_TICKET_STATUSES.forEach(status =>
      expect(supportTicketStatusLabel(status)).toBeTruthy()
    );
    expect(supportTicketStatusLabel('waiting_for_user')).toBe('Waiting for User');
  });
});

describe('getStatusDisplay', () => {
  it('returns the label and variant for a known status of each kind', () => {
    expect(getStatusDisplay('application', 'approved')).toEqual({
      label: 'Approved',
      variant: 'success',
    });
    expect(getStatusDisplay('pet', 'medical_care')).toEqual({
      label: 'Medical Care',
      variant: 'error',
    });
    expect(getStatusDisplay('rescue', 'verified')).toEqual({
      label: 'Verified',
      variant: 'success',
    });
    expect(getStatusDisplay('user', 'pending_verification')).toEqual({
      label: 'Pending Verification',
      variant: 'warning',
    });
    expect(getStatusDisplay('supportTicket', 'in_progress')).toEqual({
      label: 'In Progress',
      variant: 'info',
    });
    expect(getStatusDisplay('report', 'under_review')).toEqual({
      label: 'Under Review',
      variant: 'info',
    });
  });

  it('falls back to a neutral, humanised badge for an unknown status', () => {
    expect(getStatusDisplay('pet', 'awaiting_transport')).toEqual({
      label: 'Awaiting Transport',
      variant: 'neutral',
    });
  });

  it('handles every kind', () => {
    STATUS_KINDS.forEach(kind => expect(getStatusDisplay(kind, 'mystery').variant).toBe('neutral'));
  });
});
