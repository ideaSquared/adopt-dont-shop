/**
 * UX P0/P1 #5: when the pet-search API fails, SearchPage must render a
 * recoverable error state with a "Retry" button rather than dropping
 * the user into an empty-state look-alike.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../test-utils';

// Stable function references shared across renders. The real useAnalytics /
// useStatsig hooks memoise their returned callbacks, so the mocks must do the
// same — otherwise SearchPage's loadPets useCallback (which depends on
// trackEvent/logEvent) is recreated every render, re-firing its useEffect and
// triggering an infinite update loop.
const { mockTrackEvent, mockTrackPageView, mockLogEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockTrackPageView: vi.fn(),
  mockLogEvent: vi.fn(),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent, trackPageView: mockTrackPageView }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: mockLogEvent,
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
  it('renders a Retry button when the initial pet search fails', async () => {
    renderWithProviders(<SearchPage />);

    const retry = await screen.findByRole('button', { name: /retry/i }, { timeout: 10_000 });
    expect(retry).toBeInTheDocument();
    expect(screen.getByText(/unable to load results/i)).toBeInTheDocument();
    // Empty-state copy must not be shown on a load failure.
    expect(screen.queryByText(/no pets match/i)).not.toBeInTheDocument();
  });

  it('refetches when the user clicks Retry', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    const retry = await screen.findByRole('button', { name: /retry/i }, { timeout: 10_000 });
    await user.click(retry);

    // Second call returns 200 with an empty data array — empty state appears.
    await waitFor(() => {
      expect(screen.getByText(/no pets match/i)).toBeInTheDocument();
    });
  });
});
