/**
 * UX P2 I: the onboarding overlay used to claim role="button" purely so the
 * click-to-dismiss div didn't trip lint. Screen readers announced a phantom
 * button for the backdrop. Replaced with role="presentation"; the explicit
 * ✕ button inside (aria-label="Close") is the accessible close affordance.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import { SwipeOnboarding } from './SwipeOnboarding';

describe('SwipeOnboarding backdrop accessibility (UX P2 I)', () => {
  beforeEach(() => {
    window.localStorage.removeItem('hasSeenSwipeOnboarding');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advancePastShowTimer = () => {
    act(() => {
      vi.advanceTimersByTime(1100);
    });
  };

  it('renders the backdrop without role="button" once shown', () => {
    renderWithProviders(<SwipeOnboarding onClose={vi.fn()} />);
    advancePastShowTimer();

    // The only button labelled "Close" should be the explicit one inside the modal.
    const closeButtons = screen.queryAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBe(1);
  });

  it('keeps the explicit ✕ close affordance inside the modal', () => {
    renderWithProviders(<SwipeOnboarding onClose={vi.fn()} />);
    advancePastShowTimer();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});
