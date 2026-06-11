import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils';
import { SwipeCard } from './SwipeCard';
import type { DiscoveryPet } from '@/services';

const mockLogEvent = vi.fn();

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: mockLogEvent }),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const makePet = (overrides: Partial<DiscoveryPet> = {}): DiscoveryPet => ({
  petId: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  ageGroup: 'adult',
  size: 'medium',
  gender: 'male',
  images: [],
  rescueName: 'Test Rescue',
  ...overrides,
});

describe('SwipeCard — activity label (ADS-632)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the activity label when the pet has none', () => {
    renderWithProviders(<SwipeCard pet={makePet()} onSwipe={vi.fn()} isTop zIndex={1} />);
    expect(screen.queryByTestId('activity-label')).toBeNull();
  });

  it('renders the activity label text + icon when the backend provides one', () => {
    renderWithProviders(
      <SwipeCard
        pet={makePet({
          activityLabel: { kind: 'views_today', text: '47 views today', icon: '👀' },
        })}
        onSwipe={vi.fn()}
        isTop
        zIndex={1}
      />
    );
    const label = screen.getByTestId('activity-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('47 views today');
    expect(label).toHaveAttribute('data-label-kind', 'views_today');
  });

  it('logs card_activity_label_shown when the card is on top', () => {
    renderWithProviders(
      <SwipeCard
        pet={makePet({
          petId: 'pet-buddy',
          activityLabel: { kind: 'days_waiting', text: 'Waiting 89 days', icon: '🕒' },
        })}
        onSwipe={vi.fn()}
        isTop
        zIndex={1}
      />
    );
    expect(mockLogEvent).toHaveBeenCalledWith('card_activity_label_shown', 1, {
      pet_id: 'pet-buddy',
      label_kind: 'days_waiting',
    });
  });

  it('does not log the impression for cards below the top of the stack', () => {
    renderWithProviders(
      <SwipeCard
        pet={makePet({
          activityLabel: {
            kind: 'similar_adopted_fast',
            text: 'Pets like Buddy adopted in <30 days',
          },
        })}
        onSwipe={vi.fn()}
        isTop={false}
        zIndex={0}
      />
    );
    expect(mockLogEvent).not.toHaveBeenCalledWith(
      'card_activity_label_shown',
      expect.anything(),
      expect.anything()
    );
  });
});
