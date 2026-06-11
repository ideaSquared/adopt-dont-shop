/**
 * UX P0/P1 #7: the backdrop on this modal used to claim role="button" +
 * aria-label="Close modal". That announced an extra "Close modal" button
 * to screen readers when the only real close affordance is the inline
 * Cancel button. Backdrop must be presentational.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

vi.mock('@adopt-dont-shop/lib.components', () => ({
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
