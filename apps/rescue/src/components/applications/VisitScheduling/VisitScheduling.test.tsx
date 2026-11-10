/**
 * Behaviour tests for VisitScheduling module.
 *
 * Tests verify the scheduling, rescheduling, completing, and cancelling
 * of home visits from the rescue staff perspective, exercising the
 * cancel-visit modal flow (UX P2 B) in particular.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisitScheduling } from './VisitScheduling';

// The dialogs under test (cancel, visit details) are the shared Modal, so use
// the real shared components rather than the app-wide stubs.
vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
}));

// Stub vanilla-extract CSS module — styles are not the subject of these tests.
vi.mock('../ApplicationReview.css', () => {
  const names = [
    'button',
    'card',
    'completeVisitForm',
    'completeVisitTitle',
    'emptyVisits',
    'field',
    'fieldLabel',
    'fieldValue',
    'fieldValueFullWidth',
    'fieldVertical',
    'formActions',
    'formGroup',
    'formInput',
    'formLabel',
    'formRow',
    'formSelect',
    'formTextarea',
    'rescheduleForm',
    'rescheduleTitle',
    'scheduleVisitForm',
    'scheduleVisitTitle',
    'section',
    'sectionHeader',
    'sectionTitle',
    'visitActions',
    'visitCard',
    'visitCompletedInfo',
    'visitDate',
    'visitDetailsBody',
    'visitDetailsContent',
    'visitDetailsHeader',
    'visitDetailsModal',
    'visitHeader',
    'visitInfo',
    'visitNotes',
    'visitOutcome',
    'visitStaff',
    'visitStatus',
    'visitTime',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

const EMPTY_VISIT_FORM = { scheduledDate: '', scheduledTime: '', assignedStaff: '', notes: '' };
const EMPTY_RESCHEDULE_FORM = { scheduledDate: '', scheduledTime: '', reason: '' };
const EMPTY_COMPLETE_FORM = { outcome: '' as const, notes: '', conditions: '' };

const scheduledVisit = {
  id: 'visit-1',
  applicationId: 'app-1',
  scheduledDate: '2026-06-01',
  scheduledTime: '10:00',
  assignedStaff: 'Jane Smith',
  status: 'scheduled' as const,
};

const defaultProps = {
  homeVisits: [scheduledVisit],
  homeVisitsError: null,
  staff: [],
  staffLoading: false,
  showScheduleVisit: false,
  setShowScheduleVisit: vi.fn(),
  visitForm: EMPTY_VISIT_FORM,
  setVisitForm: vi.fn(),
  isSchedulingVisit: false,
  editingVisit: null,
  setEditingVisit: vi.fn(),
  rescheduleForm: EMPTY_RESCHEDULE_FORM,
  setRescheduleForm: vi.fn(),
  completingVisit: null,
  setCompletingVisit: vi.fn(),
  completeForm: EMPTY_COMPLETE_FORM,
  setCompleteForm: vi.fn(),
  viewingVisit: null,
  setViewingVisit: vi.fn(),
  cancellingVisit: null,
  setCancellingVisit: vi.fn(),
  cancelReason: '',
  setCancelReason: vi.fn(),
  emptyVisitForm: EMPTY_VISIT_FORM,
  emptyRescheduleForm: EMPTY_RESCHEDULE_FORM,
  emptyCompleteForm: EMPTY_COMPLETE_FORM,
  onScheduleVisit: vi.fn(),
  onMarkVisitInProgress: vi.fn(),
  onRescheduleVisit: vi.fn(),
  onCompleteVisit: vi.fn(),
  onCancelVisit: vi.fn(),
};

describe('VisitScheduling — home visit list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the empty state when there are no visits', () => {
    render(<VisitScheduling {...defaultProps} homeVisits={[]} />);
    expect(screen.getByText(/no home visits scheduled yet/i)).toBeInTheDocument();
  });

  it('renders a scheduled visit with its date and assigned staff', () => {
    render(<VisitScheduling {...defaultProps} />);
    expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('writes the visit date day-first, as UK readers expect', () => {
    render(<VisitScheduling {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Monday 1 June 2026' })).toBeInTheDocument();
  });

  it('shows a home-visits load error when homeVisitsError is set', () => {
    render(<VisitScheduling {...defaultProps} homeVisitsError="network down" homeVisits={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load home visits/i);
  });

  it('disables Schedule Visit button when a visit is already active', () => {
    render(<VisitScheduling {...defaultProps} />);
    const scheduleBtn = screen.getByRole('button', { name: /visit already scheduled/i });
    expect(scheduleBtn).toBeDisabled();
  });
});

describe('VisitScheduling — cancel visit modal (UX P2 B)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the cancel modal when Cancel Visit is clicked', () => {
    const setCancellingVisit = vi.fn();
    render(<VisitScheduling {...defaultProps} setCancellingVisit={setCancellingVisit} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel visit/i }));
    expect(setCancellingVisit).toHaveBeenCalledWith('visit-1');
  });

  it('renders the cancel dialog when cancellingVisit matches the visit id', () => {
    render(<VisitScheduling {...defaultProps} cancellingVisit="visit-1" cancelReason="" />);
    expect(screen.getByRole('dialog', { name: /cancel home visit/i })).toBeInTheDocument();
  });

  it('keeps Confirm Cancellation disabled when reason is empty', () => {
    render(<VisitScheduling {...defaultProps} cancellingVisit="visit-1" cancelReason="" />);
    expect(screen.getByRole('button', { name: /confirm cancellation/i })).toBeDisabled();
  });

  it('enables Confirm Cancellation when a non-empty reason is provided', () => {
    render(
      <VisitScheduling
        {...defaultProps}
        cancellingVisit="visit-1"
        cancelReason="Family emergency"
      />
    );
    expect(screen.getByRole('button', { name: /confirm cancellation/i })).not.toBeDisabled();
  });

  it('calls onCancelVisit with the visit id when Confirm Cancellation is clicked', async () => {
    const onCancelVisit = vi.fn();
    render(
      <VisitScheduling
        {...defaultProps}
        cancellingVisit="visit-1"
        cancelReason="Family emergency"
        onCancelVisit={onCancelVisit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));
    await waitFor(() => {
      expect(onCancelVisit).toHaveBeenCalledWith('visit-1');
    });
  });
});

describe('VisitScheduling — start visit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onMarkVisitInProgress when Start Visit is clicked', () => {
    const onMarkVisitInProgress = vi.fn();
    render(<VisitScheduling {...defaultProps} onMarkVisitInProgress={onMarkVisitInProgress} />);
    fireEvent.click(screen.getByRole('button', { name: /start visit/i }));
    expect(onMarkVisitInProgress).toHaveBeenCalledWith('visit-1');
  });
});

describe('VisitScheduling — visit details dialog', () => {
  beforeEach(() => vi.clearAllMocks());

  const completedVisit = {
    ...scheduledVisit,
    status: 'completed' as const,
    outcome: 'approved' as const,
    completedAt: '2026-06-01T14:30:00Z',
    notes: 'Spacious garden',
  };

  it('opens the details dialog for the viewed visit with UK-formatted dates', () => {
    render(
      <VisitScheduling {...defaultProps} homeVisits={[completedVisit]} viewingVisit="visit-1" />
    );

    const dialog = screen.getByRole('dialog', { name: 'Visit Details' });
    expect(dialog).toHaveTextContent('01/06/2026 at 10:00');
    expect(dialog).toHaveTextContent(/Completed At01\/06\/2026 at \d{2}:\d{2}/);
    expect(dialog).toHaveTextContent('Approved');
    expect(dialog).toHaveTextContent('Spacious garden');
  });

  it('closes the details dialog with Escape', () => {
    const setViewingVisit = vi.fn();
    render(
      <VisitScheduling
        {...defaultProps}
        homeVisits={[completedVisit]}
        viewingVisit="visit-1"
        setViewingVisit={setViewingVisit}
      />
    );

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Visit Details' }), { key: 'Escape' });
    expect(setViewingVisit).toHaveBeenCalledWith(null);
  });
});
