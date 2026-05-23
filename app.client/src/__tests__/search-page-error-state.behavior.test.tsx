/**
 * UX P0/P1 #5: when the pet-search API fails, SearchPage must render a
 * recoverable error state with a "Try Again" button rather than dropping
 * the user into an empty-state look-alike.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../test-utils';

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn(), trackPageView: vi.fn() }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: vi.fn(),
    checkGate: () => false,
    client: null,
    getExperiment: () => null,
    getDynamicConfig: () => null,
  }),
}));

vi.mock('@adopt-dont-shop/lib.feature-flags', () => ({
  useFeatureGate: () => ({ value: false }),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthService: class MockAuthService {
    getToken() {
      return null;
    }
    isAuthenticated() {
      return false;
    }
  },
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    favoritePetIds: new Set<string>(),
    isLoading: false,
    error: null,
    isFavorite: () => false,
    addToFavorites: vi.fn(),
    removeFromFavorites: vi.fn(),
    refreshFavorites: vi.fn(),
    clearError: vi.fn(),
  }),
}));

import { SearchPage } from '../pages/SearchPage';

let petCallCount = 0;
const server = setupServer(
  http.get('*/api/v1/pets', () => {
    petCallCount += 1;
    if (petCallCount === 1) {
      return new HttpResponse('boom', { status: 500 });
    }
    return HttpResponse.json({
      success: true,
      data: [],
      meta: { page: 1, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  petCallCount = 0;
  server.resetHandlers(
    http.get('*/api/v1/pets', () => {
      petCallCount += 1;
      if (petCallCount === 1) {
        return new HttpResponse('boom', { status: 500 });
      }
      return HttpResponse.json({
        success: true,
        data: [],
        meta: { page: 1, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
    })
  );
});
afterAll(() => server.close());

describe('SearchPage error state', () => {
  it('renders a Try Again button when the initial pet search fails', async () => {
    renderWithProviders(<SearchPage />);

    const retry = await screen.findByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    // Empty-state copy must not be shown on a load failure.
    expect(screen.queryByText(/no pets found/i)).not.toBeInTheDocument();
  });

  it('refetches when the user clicks Try Again', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    // Second call returns 200 with an empty data array — empty state appears.
    await waitFor(() => {
      expect(screen.getByText(/no pets found/i)).toBeInTheDocument();
    });
  });
});
