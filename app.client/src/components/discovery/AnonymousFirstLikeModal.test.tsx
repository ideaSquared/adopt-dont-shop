import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { AnonymousFirstLikeModal } from './AnonymousFirstLikeModal';

describe('AnonymousFirstLikeModal (ADS-626)', () => {
  it('renders the pet name + image and a sign-up CTA pointing at /register?petId=...', () => {
    renderWithProviders(
      <AnonymousFirstLikeModal
        petId='pet-buddy'
        petName='Buddy'
        petImage='https://cdn/buddy.jpg'
        onDismiss={vi.fn()}
        onCtaClick={vi.fn()}
      />
    );
    expect(screen.getByText(/You and Buddy could be a match/)).toBeInTheDocument();
    expect(screen.getByAltText('Buddy')).toHaveAttribute('src', 'https://cdn/buddy.jpg');
    expect(screen.getByRole('link', { name: 'Sign up to apply' })).toHaveAttribute(
      'href',
      '/register?petId=pet-buddy'
    );
  });

  it('invokes onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    renderWithProviders(
      <AnonymousFirstLikeModal
        petId='pet-1'
        petName='Buddy'
        onDismiss={onDismiss}
        onCtaClick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('invokes onCtaClick when the CTA link is clicked', () => {
    const onCtaClick = vi.fn();
    renderWithProviders(
      <AnonymousFirstLikeModal
        petId='pet-1'
        petName='Buddy'
        onDismiss={vi.fn()}
        onCtaClick={onCtaClick}
      />
    );
    fireEvent.click(screen.getByRole('link', { name: 'Sign up to apply' }));
    expect(onCtaClick).toHaveBeenCalled();
  });

  it('omits the image when no petImage prop is provided', () => {
    renderWithProviders(
      <AnonymousFirstLikeModal
        petId='pet-1'
        petName='Buddy'
        onDismiss={vi.fn()}
        onCtaClick={vi.fn()}
      />
    );
    expect(screen.queryByAltText('Buddy')).toBeNull();
  });

  it('encodes the petId for URL safety', () => {
    renderWithProviders(
      <AnonymousFirstLikeModal
        petId='abc 1/2'
        petName='Test'
        onDismiss={vi.fn()}
        onCtaClick={vi.fn()}
      />
    );
    expect(screen.getByRole('link', { name: 'Sign up to apply' })).toHaveAttribute(
      'href',
      '/register?petId=abc%201%2F2'
    );
  });
});
