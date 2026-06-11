import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import React from 'react';

const getFavoritesMock = vi.fn();
const removeFromFavoritesMock = vi.fn();

const favoritesState = {
  favoritePetIds: new Set<string>(),
  isLoading: false,
  error: null as string | null,
  isFavorite: (_id: string) => true,
  addToFavorites: vi.fn(),
  removeFromFavorites: (...args: unknown[]) => removeFromFavoritesMock(...args),
  refreshFavorites: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { userId: 'u-1', email: 'a@b.c' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    petService: {
      getFavorites: (...args: unknown[]) => getFavoritesMock(...args),
      isFavorite: (..._args: unknown[]) => Promise.resolve(true),
      addToFavorites: vi.fn(),
      removeFromFavorites: (...args: unknown[]) => removeFromFavoritesMock(...args),
    },
  };
});

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => favoritesState,
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: vi.fn() }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: vi.fn() }),
}));

import { FavoritesPage } from './FavoritesPage';

const pet = {
  pet_id: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  breed: 'Labrador',
  age_years: 3,
  age_months: 0,
  age_group: 'adult',
  gender: 'male',
  status: 'available',
  size: 'large',
  color: 'golden',
  short_description: 'Friendly lab',
  long_description: 'A very friendly lab',
  rescue_id: 'rescue-1',
  images: [],
  videos: [],
  tags: [],
  temperament: [],
  featured: false,
  priority_listing: false,
  archived: false,
};

describe('FavoritesPage error handling on un-favorite', () => {
  beforeEach(() => {
    getFavoritesMock.mockReset();
    removeFromFavoritesMock.mockReset();
    favoritesState.error = null;
    favoritesState.favoritePetIds = new Set(['pet-1']);
  });

  it('keeps the pet rendered and surfaces an error when the un-favorite call fails', async () => {
    getFavoritesMock.mockResolvedValueOnce([pet]);

    const { rerender } = render(<FavoritesPage />);

    expect(await screen.findByText('Buddy')).toBeInTheDocument();

    // Simulate FavoritesContext surfacing the un-favorite failure (PetCard's
    // internal try/catch catches the API error and sets context.error;
    // because the post-success onFavoriteToggle never fires, the pet stays
    // in the list — FavoritesPage just needs to tell the user.)
    favoritesState.error = 'Failed to remove from favorites';
    rerender(<FavoritesPage />);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some(a => /failed to remove from favorites/i.test(a.textContent ?? ''))).toBe(
        true
      );
    });

    // The pet is still rendered — local list state did not drift.
    expect(screen.getByText('Buddy')).toBeInTheDocument();
  });
});
