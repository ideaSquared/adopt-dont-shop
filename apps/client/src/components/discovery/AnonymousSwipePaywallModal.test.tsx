import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { AnonymousSwipePaywallModal } from './AnonymousSwipePaywallModal';

describe('AnonymousSwipePaywallModal (ADS-625)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, subtitle, and the three actions', () => {
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('Keep swiping')).toBeInTheDocument();
    expect(screen.getByText(/Sign up free in 10 seconds/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
  });

  it('announces itself as a dialog named after its title', () => {
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Keep swiping' })).toBeInTheDocument();
  });

  it('fires onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn();
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={vi.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-focuses the Sign up button so keyboard users land on it', async () => {
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign up' })).toHaveFocus();
    });
  });

  it('fires onSignUp when Sign up is clicked', () => {
    const onSignUp = vi.fn();
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={onSignUp}
        onLogIn={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(onSignUp).toHaveBeenCalled();
  });

  it('fires onLogIn when Log in is clicked', () => {
    const onLogIn = vi.fn();
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={onLogIn}
        onDismiss={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(onLogIn).toHaveBeenCalled();
  });

  it('fires onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    renderWithProviders(
      <AnonymousSwipePaywallModal
        petId='pet-1'
        onSignUp={vi.fn()}
        onLogIn={vi.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
