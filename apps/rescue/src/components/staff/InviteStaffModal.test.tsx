/**
 * UX P2 I: the modal backdrop used to claim role="button" with tabIndex={-1}
 * and aria-label="Close modal" purely so the click-to-dismiss div didn't
 * trip lint. That announced a phantom button to screen readers. The real
 * close affordance is the ✕ button inside the modal header.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InviteStaffModal from './InviteStaffModal';

// vanilla-extract CSS modules can't be evaluated in JSDOM; replace with
// simple class-string exports so the component renders.
vi.mock('./InviteStaffModal.css', () => {
  const EXPORTS = [
    'actionButton',
    'closeButton',
    'form',
    'formActions',
    'formError',
    'formGroup',
    'formHelp',
    'formInfo',
    'formInput',
    'formLabel',
    'formModal',
    'formOverlay',
    'infoSection',
    'loadingSpinner',
    'modalHeader',
    'modalTitle',
    'requiredIndicator',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of EXPORTS) {
    // Provide both call signature (for vanilla-extract recipes) and string
    // value (for plain class names). Object.assign keeps the function but
    // overrides toString to return the recipe name.
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

describe('InviteStaffModal backdrop accessibility (UX P2 I)', () => {
  it('renders the modal backdrop without role="button"', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    // No backdrop "Close modal" button should be announced.
    expect(screen.queryByRole('button', { name: /close modal/i })).toBeNull();
  });

  it('keeps the explicit ✕ close affordance inside the modal header', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    // The header carries an unlabelled ✕ button — find it by its text content.
    const closeButton = screen.getByText('✕').closest('button');
    expect(closeButton).not.toBeNull();
  });
});

describe('InviteStaffModal aria-required (a11y sweep — extends PR #673/#674 C1-2)', () => {
  it('marks the required email input with aria-required="true"', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  it('does not set aria-required on the optional title input', () => {
    render(<InviteStaffModal onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const titleInput = screen.getByLabelText(/title\/role/i);
    expect(titleInput).not.toHaveAttribute('aria-required');
  });
});
