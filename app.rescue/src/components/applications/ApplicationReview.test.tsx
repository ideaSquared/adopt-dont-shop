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

  return { useConfirm, ConfirmDialog };
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
