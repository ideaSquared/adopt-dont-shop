/**
 * Behavioural tests for SwipeCard match-tier display.
 *
 * The backend returns `compatibilityScore` as 0..100. These tests ensure the
 * UI translates that into engagement-driving tier labels (dating-app pattern)
 * rather than raw percentages — and that it never displays nonsensical values
 * like "7000% match" caused by an erroneous *100 multiplier.
 */

import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/test-utils';
import type { DiscoveryPet } from '@/services';
import { SwipeCard } from './SwipeCard';

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: vi.fn(),
    checkGate: () => false,
    client: null,
    getExperiment: () => null,
    getDynamicConfig: () => null,
  }),
}));

const basePet: DiscoveryPet = {
  petId: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  breed: 'Labrador',
  ageYears: 3,
  gender: 'male',
  size: 'medium',
};

const renderCard = (overrides: Partial<DiscoveryPet> = {}) =>
  renderWithProviders(
    <SwipeCard pet={{ ...basePet, ...overrides }} onSwipe={vi.fn()} isTop zIndex={1} />
  );

describe('SwipeCard match tier display', () => {
  it('does not display nonsensical percentages like 7000% (regression)', () => {
    renderCard({ compatibilityScore: 70 });
    // The score is 0..100 from the backend. We must never render values
    // produced by multiplying it by 100 again.
    expect(screen.queryByText(/7000/)).toBeNull();
    expect(screen.queryByText(/\d{4,}%/)).toBeNull();
  });

  it('hides the match badge when score is below the threshold', () => {
    renderCard({ compatibilityScore: 65 });
    expect(screen.queryByText(/match/i)).toBeNull();
  });

  it('hides the match badge when no score is provided', () => {
    renderCard({ compatibilityScore: undefined });
    expect(screen.queryByText(/match/i)).toBeNull();
  });

  it('shows "Great Match" for scores in the 70–89 range', () => {
    renderCard({ compatibilityScore: 75 });
    expect(screen.getByText('Great Match')).toBeInTheDocument();
    expect(screen.queryByText('Pawfect Match')).toBeNull();
  });

  it('shows "Great Match" at the lower 70 boundary', () => {
    renderCard({ compatibilityScore: 70 });
    expect(screen.getByText('Great Match')).toBeInTheDocument();
  });

  it('shows "Pawfect Match" for scores 90 and above', () => {
    renderCard({ compatibilityScore: 92 });
    expect(screen.getByText('Pawfect Match')).toBeInTheDocument();
    expect(screen.queryByText('Great Match')).toBeNull();
  });

  it('upgrades to "Pawfect Match" exactly at the 90 boundary', () => {
    renderCard({ compatibilityScore: 90 });
    expect(screen.getByText('Pawfect Match')).toBeInTheDocument();
  });

  it('does not surface raw percentages on the card', () => {
    renderCard({ compatibilityScore: 87 });
    // We display labels, not numbers — dating-app pattern.
    expect(screen.queryByText(/%/)).toBeNull();
  });
});
