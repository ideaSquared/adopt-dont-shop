/**
 * ADS-579: rejection confirmation flow.
 *
 * Behaviour under test: when a rescue staff member selects "rejected" in the
 * status dropdown and clicks "Update Status", a confirmation dialog must
 * appear. The onStatusUpdate callback must only fire after the user confirms.
 * Cancelling must keep the application unchanged.
 *
 * Other transitions (approved, withdrawn) intentionally bypass the
 * confirmation — those branches are exercised here too, to lock in that we
 * didn't accidentally gate every transition behind the dialog.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ADS-644: ApplicationReview now renders cross-link <Link>s and calls
// fosterService.list to find the pet's active foster placement. Stub the
// service so tests don't need network access.
vi.mock('../../services/fosterService', () => ({
  fosterService: { list: vi.fn().mockResolvedValue([]) },
}));

// vanilla-extract CSS objects evaluated at import time are noisy in JSDOM and
// not what these tests care about. Replace with simple class strings.
// Vanilla-extract CSS modules export a mix of class strings and recipe
// callables. We don't care about styling here; just provide both shapes so
// the component renders.
vi.mock('./ApplicationReview.css', () => {
  const EXPORTS = [
    'addEventForm',
    'addEventTitle',
    'button',
    'buttonGroup',
    'card',
    'cardTitle',
    'closeButton',
    'completeVisitForm',
    'completeVisitTitle',
    'content',
    'emptyTimeline',
    'emptyVisits',
    'errorContainer',
    'errorMessage',
    'errorText',
    'field',
    'fieldLabel',
    'fieldValue',
    'fieldValueFullWidth',
    'fieldVertical',
    'formActions',
    'formField',
    'formGroup',
    'formInput',
    'formLabel',
    'formRow',
    'formSelect',
    'formTextarea',
    'grid',
    'header',
    'headerContent',
    'headerLeft',
    'headerRight',
    'headerSubtitle',
    'headerTitle',
    'label',
    'loadingContainer',
    'loadingText',
    'modal',
    'notesInput',
    'overlay',
    'referenceActions',
    'referenceCard',
    'referenceContact',
    'referenceForm',
    'referenceHeader',
    'referenceInfo',
    'referenceName',
    'referenceNotes',
    'referenceRelation',
    'referenceStatus',
    'rescheduleForm',
    'rescheduleTitle',
    'scheduleVisitForm',
    'scheduleVisitTitle',
    'section',
    'sectionHeader',
    'sectionTitle',
    'select',
    'spinner',
    'stageBadge',
    'statusBadge',
    'statusSelect',
    'statusUpdateContainer',
    'tab',
    'tabContainer',
    'tabList',
    'tabPanel',
    'textArea',
    'timelineContainer',
    'timelineContent',
    'timelineData',
    'timelineDescription',
    'timelineHeader',
    'timelineIcon',
    'timelineItem',
    'timelineTimestamp',
    'timelineTitle',
    'timelineUser',
    'visitActions',
    'visitCard',
    'visitCompletedInfo',
    'visitDate',
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
  for (const name of EXPORTS) {
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

// useStaff hits an auth-protected API; stub it.
vi.mock('../../hooks/useStaff', () => ({
  useStaff: () => ({ staff: [], loading: false, error: null }),
}));

vi.mock('./StageTransitionModal', () => ({
  default: () => null,
}));

// Real-enough useConfirm + ConfirmDialog so we can observe the dialog being
// invoked. The global lib.components mock in setup-tests.ts does not export
// these.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  type ConfirmOptions = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
  };
  type Resolver = (v: boolean) => void;
  const useConfirm = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
    const [resolver, setResolver] = useState<{ resolve: Resolver } | null>(null);

    const confirm = (o: ConfirmOptions) => {
      setOpts(o);
      setIsOpen(true);
      return new Promise<boolean>(resolve => {
        setResolver({ resolve });
      });
    };
    const onClose = () => {
      setIsOpen(false);
      resolver?.resolve(false);
      setResolver(null);
    };
    const onConfirm = () => {
      setIsOpen(false);
      resolver?.resolve(true);
      setResolver(null);
    };
    return {
      confirm,
      confirmProps: { isOpen, onClose, onConfirm, ...opts },
    };
  };

  const ConfirmDialog = (props: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    'data-testid'?: string;
  }) => {
    if (!props.isOpen) {
      return null;
    }
    return (
      <div role="dialog" data-testid={props['data-testid']}>
        <h2>{props.title}</h2>
        <p>{props.message}</p>
        <button onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
        <button onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
      </div>
    );
  };

  // ADS-586: `toast` is consumed by ApplicationReview for error feedback.
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  });

  return { useConfirm, ConfirmDialog, toast };
});

import ApplicationReview from './ApplicationReview';

type RenderProps = {
  onStatusUpdate?: ReturnType<typeof vi.fn>;
};

const renderReview = (props: RenderProps = {}) => {
  const onStatusUpdate = props.onStatusUpdate ?? vi.fn().mockResolvedValue(undefined);
  const baseApplication = {
    id: 'app-1',
    status: 'submitted',
    petName: 'Buddy',
    applicantName: 'John Doe',
    submittedDaysAgo: 2,
    stage: 'PENDING' as const,
  };
  render(
    <MemoryRouter>
      <ApplicationReview
        application={baseApplication}
        references={[]}
        homeVisits={[]}
        timeline={[]}
        loading={false}
        error={null}
        onClose={vi.fn()}
        onStatusUpdate={onStatusUpdate}
        onStageTransition={vi.fn().mockResolvedValue(undefined)}
        onReferenceUpdate={vi.fn()}
        onScheduleVisit={vi.fn()}
        onUpdateVisit={vi.fn()}
        onAddTimelineEvent={vi.fn()}
      />
    </MemoryRouter>
  );
  return { onStatusUpdate };
};

const openStatusPanelAndSelect = (status: string) => {
  fireEvent.click(screen.getByRole('button', { name: /update status/i }));
  const select = screen.getByLabelText(/new status/i) as HTMLSelectElement;
  fireEvent.change(select, { target: { value: status } });
};

const clickUpdate = () => {
  const updateButtons = screen.getAllByRole('button', { name: /update status/i });
  // The submit button is the second one (the first opens the panel).
  fireEvent.click(updateButtons[updateButtons.length - 1]);
};

describe('ApplicationReview - ADS-579 rejection confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a confirmation dialog before rejecting and proceeds only on confirm', async () => {
    const { onStatusUpdate } = renderReview();

    openStatusPanelAndSelect('rejected');
    clickUpdate();

    // Confirmation dialog is visible and describes the destructive action.
    const dialog = await screen.findByTestId('reject-confirm-dialog');
    expect(dialog).toHaveTextContent(/reject this application/i);
    expect(dialog).toHaveTextContent(/notified by email/i);

    // Backend not yet called.
    expect(onStatusUpdate).not.toHaveBeenCalled();

    // Confirm.
    fireEvent.click(screen.getByRole('button', { name: /reject application/i }));

    await waitFor(() => {
      expect(onStatusUpdate).toHaveBeenCalledWith('rejected', '');
    });
  });

  it('cancelling the rejection confirmation does NOT update status', async () => {
    const { onStatusUpdate } = renderReview();

    openStatusPanelAndSelect('rejected');
    clickUpdate();

    const dialog = await screen.findByTestId('reject-confirm-dialog');
    const cancelInDialog = Array.from(dialog.querySelectorAll('button')).find(
      b => b.textContent === 'Cancel'
    );
    expect(cancelInDialog).toBeDefined();
    fireEvent.click(cancelInDialog!);

    // Wait a microtask to give any erroneous follow-up call a chance to land.
    await new Promise(r => setTimeout(r, 0));
    expect(onStatusUpdate).not.toHaveBeenCalled();
  });

  it('approving an application bypasses the confirmation dialog', async () => {
    const { onStatusUpdate } = renderReview();

    openStatusPanelAndSelect('approved');
    clickUpdate();

    await waitFor(() => {
      expect(onStatusUpdate).toHaveBeenCalledWith('approved', '');
    });
    // No confirm dialog opened.
    expect(screen.queryByTestId('reject-confirm-dialog')).not.toBeInTheDocument();
  });
});

// ADS-644: cross-links from an application back to the pet card and the
// pet's current active foster placement.
import { fosterService as fosterServiceForLinks } from '../../services/fosterService';

describe('ApplicationReview cross-links (ADS-644)', () => {
  const mockedFoster = fosterServiceForLinks as unknown as {
    list: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockedFoster.list.mockReset();
    mockedFoster.list.mockResolvedValue([]);
  });

  const renderWithPet = (petId: string | undefined) => {
    const baseApplication = {
      id: 'app-1',
      status: 'submitted',
      petName: 'Buddy',
      petId,
      applicantName: 'John Doe',
      submittedDaysAgo: 2,
      stage: 'PENDING' as const,
    };
    render(
      <MemoryRouter>
        <ApplicationReview
          application={baseApplication}
          references={[]}
          homeVisits={[]}
          timeline={[]}
          loading={false}
          error={null}
          onClose={vi.fn()}
          onStatusUpdate={vi.fn().mockResolvedValue(undefined)}
          onStageTransition={vi.fn().mockResolvedValue(undefined)}
          onReferenceUpdate={vi.fn()}
          onScheduleVisit={vi.fn()}
          onUpdateVisit={vi.fn()}
          onAddTimelineEvent={vi.fn()}
        />
      </MemoryRouter>
    );
  };

  it('shows a link to the pet card when the application has a petId', async () => {
    renderWithPet('pet-1');
    const link = await screen.findByRole('link', { name: 'View pet card' });
    expect(link).toHaveAttribute('href', '/pets?petId=pet-1');
  });

  it('does not show pet links when the application has no petId', async () => {
    renderWithPet(undefined);
    expect(screen.queryByRole('link', { name: /view pet/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /foster placement/i })).toBeNull();
  });

  it('adds a foster placement link only when the pet has an active placement', async () => {
    mockedFoster.list.mockResolvedValueOnce([
      {
        placementId: 'pl-1',
        petId: 'pet-1',
        fosterUserId: 'staff-1',
        rescueId: 'rescue-1',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active',
        notes: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    renderWithPet('pet-1');
    const link = await screen.findByRole('link', { name: 'View foster placement' });
    expect(link).toHaveAttribute('href', '/foster?petId=pet-1');
  });

  it('omits the foster placement link when the pet has no active placement', async () => {
    mockedFoster.list.mockResolvedValueOnce([
      {
        placementId: 'pl-1',
        petId: 'other-pet',
        fosterUserId: 'staff-1',
        rescueId: 'rescue-1',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active',
        notes: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);
    renderWithPet('pet-1');
    // Wait for the placement lookup to settle, then assert the link is absent.
    await screen.findByRole('link', { name: 'View pet card' });
    await waitFor(() => {
      expect(mockedFoster.list).toHaveBeenCalled();
    });
    expect(screen.queryByRole('link', { name: 'View foster placement' })).toBeNull();
  });
});

/**
 * UX P0/P1 #7: the modal backdrop used to claim role="button" with
 * aria-label="Close modal" purely to satisfy lint. That announced an extra
 * button to screen readers — the real close button inside the modal is the
 * accessible affordance. The backdrop should be `role="presentation"`.
 */
describe('ApplicationReview backdrop accessibility (UX P0/P1 #7)', () => {
  it('renders the modal backdrop without role="button"', () => {
    renderReview();

    // No button on the page should be labelled "Close modal" — the only
    // close affordance is the explicit Close button inside the modal.
    expect(screen.queryByRole('button', { name: /close modal/i })).toBeNull();
  });
});
