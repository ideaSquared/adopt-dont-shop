/**
 * HomePage shows the featured pets, a retryable error when they cannot be
 * loaded, and reports the load to analytics.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test-utils/render';

const getFeaturedPetsMock = vi.fn();
const trackEventMock = vi.fn();

vi.mock('@/services', () => ({
  petService: { getFeaturedPets: (...args: unknown[]) => getFeaturedPetsMock(...args) },
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return { ...actual, useAuth: () => ({ isAuthenticated: false, user: null, isLoading: false }) };
});

vi.mock('@adopt-dont-shop/lib.feature-flags', () => ({
  useFeatureGate: () => ({ value: true }),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: trackEventMock }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: vi.fn() }),
}));

vi.mock('@/components/PetCard', () => ({
  PetCard: ({ pet }: { pet: { name: string } }) => <div>{pet.name}</div>,
}));
vi.mock('@/components/hero/SwipeHero', () => ({ SwipeHero: () => null }));
vi.mock('@/components/home/TopPicksHomeModule', () => ({ TopPicksHomeModule: () => null }));
vi.mock('@/components/skeletons', () => ({
  PetCardSkeletonGrid: () => <div data-testid='pet-skeletons' />,
}));

import { HomePage } from './HomePage';

describe('HomePage featured pets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeletons while loading, then the featured pets', async () => {
    getFeaturedPetsMock.mockResolvedValue([
      { pet_id: 'p-1', name: 'Buddy' },
      { pet_id: 'p-2', name: 'Luna' },
    ]);

    render(<HomePage />);

    expect(screen.getByTestId('pet-skeletons')).toBeInTheDocument();
    expect(await screen.findByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(getFeaturedPetsMock).toHaveBeenCalledWith(8);
    expect(trackEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'featured_pets_loaded', value: 2 })
    );
  });

  it('shows a retryable error when the featured pets cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    getFeaturedPetsMock.mockRejectedValueOnce(new Error('boom'));
    getFeaturedPetsMock.mockResolvedValueOnce([{ pet_id: 'p-1', name: 'Buddy' }]);

    render(<HomePage />);

    expect(await screen.findByText(/failed to load featured pets/i)).toBeInTheDocument();
    expect(trackEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'featured_pets_load_error' })
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Buddy')).toBeInTheDocument();
  });
});
