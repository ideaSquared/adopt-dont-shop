/**
 * UX P0/P1 #7: the backdrop on this modal used to claim role="button" +
 * aria-label="Close modal". That announced an extra "Close modal" button
 * to screen readers when the only real close affordance is the inline
 * Cancel button. Backdrop must be presentational.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('./StageTransitionModal.css', () => {
  const STRING_EXPORTS = [
    'overlay',
    'modal',
    'header',
    'title',
    'subtitle',
    'stageDisplay',
    'stageBox',
    'arrow',
    'formField',
    'label',
    'textArea',
    'actionList',
    'actionLabel',
    'actionDescription',
    'buttonGroup',
    'noActionsMessage',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of STRING_EXPORTS) {
    out[name] = name;
  }
  // Recipe-style exports are callables that return a class name.
  for (const name of ['actionOption', 'button'] as const) {
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

vi.mock('@adopt-dont-shop/lib.components', async () => ({
  Input: (
    await vi.importActual<typeof import('@adopt-dont-shop/lib.components')>(
      '@adopt-dont-shop/lib.components'
    )
  ).Input,
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

import StageTransitionModal from './StageTransitionModal';

describe('StageTransitionModal backdrop accessibility', () => {
  it('does not expose a "Close modal" button role on the backdrop', () => {
    render(
      <StageTransitionModal
        currentStage="PENDING"
        onClose={vi.fn()}
        onTransition={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.queryByRole('button', { name: /close modal/i })).toBeNull();
  });
});

/**
 * Schedule Home Visit, Complete Visit and Make Final Decision each need a
 * value the bulk-update route requires (scheduledAt / outcome / the
 * approve-or-reject decision). The modal used to send only the action and
 * notes, so all three always failed with "... requires ...".
 */
describe('StageTransitionModal actions that need a value', () => {
  const renderModal = (currentStage: 'REVIEWING' | 'VISITING' | 'DECIDING') => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    render(
      <StageTransitionModal
        currentStage={currentStage}
        onClose={vi.fn()}
        onTransition={onTransition}
      />
    );
    return onTransition;
  };
  const confirm = () => screen.getByRole('button', { name: 'Confirm Transition' });
  const chooseAction = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

  it('asks for the decision before a final decision can be confirmed', () => {
    renderModal('DECIDING');
    chooseAction(/make final decision/i);

    expect(confirm()).toBeDisabled();
  });

  it('sends an approval decision', () => {
    const onTransition = renderModal('DECIDING');
    chooseAction(/make final decision/i);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(confirm());

    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MAKE_DECISION', data: { status: 'approved' } }),
      undefined
    );
  });

  it('sends a rejection decision with the notes as the reason', () => {
    const onTransition = renderModal('REVIEWING');
    chooseAction(/make final decision/i);
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Not a fit' } });
    fireEvent.click(confirm());

    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MAKE_DECISION', data: { status: 'rejected' } }),
      'Not a fit'
    );
  });

  it('asks when the home visit is and sends it as an ISO timestamp', () => {
    const onTransition = renderModal('REVIEWING');
    chooseAction(/schedule home visit/i);
    expect(confirm()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/visit date and time/i), {
      target: { value: '2026-11-02T14:30' },
    });
    fireEvent.click(confirm());

    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SCHEDULE_VISIT',
        data: { scheduledAt: new Date('2026-11-02T14:30').toISOString() },
      }),
      undefined
    );
  });

  it('asks how the home visit went before completing it', () => {
    const onTransition = renderModal('VISITING');
    chooseAction(/complete visit/i);
    expect(confirm()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Passed' }));
    fireEvent.click(confirm());

    expect(onTransition).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COMPLETE_VISIT', data: { outcome: 'passed' } }),
      undefined
    );
  });
});
