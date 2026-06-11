/**
 * UX P2 I: the modal backdrop used to claim role="button" with a tabIndex
 * and an aria-label purely so the click-to-dismiss handler satisfied lint.
 * That announced a phantom button to screen readers — the real close
 * affordance is the explicit ✕ button inside the modal. The backdrop
 * should be role="presentation".
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import { LoginPromptModal } from './LoginPromptModal';

describe('LoginPromptModal backdrop accessibility (UX P2 I)', () => {
  it('renders the modal backdrop without role="button"', () => {
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={vi.fn()} />);

    // No backdrop "Close modal" button should be announced.
    expect(screen.queryByRole('button', { name: /close modal/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /close notifications/i })).toBeNull();
  });

  it('keeps the explicit close affordance inside the modal', () => {
    const onClose = vi.fn();
    renderWithProviders(<LoginPromptModal isOpen={true} onClose={onClose} />);

    // The "Continue browsing" skip button is still a real affordance.
    expect(screen.getByRole('button', { name: /continue browsing/i })).toBeInTheDocument();
  });
});
