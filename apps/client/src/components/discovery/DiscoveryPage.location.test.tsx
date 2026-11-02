/**
 * Behavioural tests for the opt-in "Use my location" control on /discover.
 *
 * Covers: no automatic permission prompt, granted (deck reloads with the
 * adopter's coordinates), loading, denied, and clearing the location. The
 * browser permission prompt itself can't be exercised in jsdom, so
 * navigator.geolocation is stubbed to answer as the browser would.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

import { DiscoveryPage } from './DiscoveryPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const logEventMock = vi.fn();
vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({
    logEvent: logEventMock,
    checkGate: () => false,
    client: null,
    getExperiment: () => null,
    getDynamicConfig: () => null,
  }),
}));

vi.mock('@adopt-dont-shop/lib.feature-flags', () => ({
  useFeatureGate: () => ({ value: false }),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn(), trackPageView: vi.fn() }),
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

vi.mock('../swipe/SwipeStack', () => ({
  SwipeStack: ({ pets }: { pets: { name: string; petId: string }[] }) => (
    <div data-testid='swipe-stack'>
      {pets.map(p => (
        <div key={p.petId}>{p.name}</div>
      ))}
    </div>
  ),
}));
vi.mock('../swipe/SwipeControls', () => ({ SwipeControls: () => null }));
vi.mock('../profile/ProfileCompletionMeter', () => ({ ProfileCompletionMeter: () => null }));
vi.mock('./EndOfQueueEmptyState', () => ({ EndOfQueueEmptyState: () => <div>No more pets</div> }));
vi.mock('./AnonymousFirstLikeModal', () => ({
  AnonymousFirstLikeModal: () => null,
  ANON_FIRST_LIKE_FIRED_KEY: 'anon_first_like_fired',
}));
vi.mock('./AnonymousSwipePaywallModal', () => ({ AnonymousSwipePaywallModal: () => null }));
vi.mock('@/utils/anonSwipeBudget', () => ({
  hasReachedAnonSwipeLimit: () => false,
  incrementAnonSwipeCount: () => 1,
  resetAnonSwipeBudget: vi.fn(),
}));
vi.mock('@/utils/discoverySession', () => ({
  loadDiscoveryState: () => ({
    sessionId: 'session-test',
    viewedPetIds: [] as string[],
    updatedAt: new Date().toISOString(),
  }),
  recordViewedPet: (petId: string) => ({ viewedPetIds: [petId] }),
}));

const getDiscoveryQueueMock = vi.fn();
vi.mock('@/services', () => ({
  discoveryService: {
    getDiscoveryQueue: (...args: unknown[]) => getDiscoveryQueueMock(...args),
    recordSwipeAction: vi.fn().mockResolvedValue(undefined),
    loadMorePets: vi.fn().mockResolvedValue([]),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOCATION_CACHE_KEY = 'user_geolocation';
const HOME = { latitude: 53.58, longitude: -2.43 };

const pet = {
  petId: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  breed: 'Labrador',
  ageGroup: 'adult',
  size: 'medium',
  gender: 'male',
  images: [] as string[],
  rescueName: 'Bright Futures',
};

const queue = { pets: [pet], currentIndex: 0, hasMore: true, nextBatchSize: 20 };

type PositionCallback = (position: { coords: typeof HOME }) => void;
type ErrorCallback = (error: { code: number; PERMISSION_DENIED: number }) => void;

const stubGeolocation = () => {
  const getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
  return {
    getCurrentPosition,
    grant: () =>
      getCurrentPosition.mockImplementation((ok: PositionCallback) => ok({ coords: HOME })),
    deny: () =>
      getCurrentPosition.mockImplementation((_ok: PositionCallback, fail: ErrorCallback) =>
        fail({ code: 1, PERMISSION_DENIED: 1 })
      ),
  };
};

const renderPage = () =>
  render(
    <BrowserRouter>
      <ThemeProvider>
        <DiscoveryPage />
      </ThemeProvider>
    </BrowserRouter>
  );

const lastQueueFilters = () => getDiscoveryQueueMock.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  getDiscoveryQueueMock.mockResolvedValue(queue);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('/discover "Use my location"', () => {
  it('does not ask the browser for the location on page load', async () => {
    const geo = stubGeolocation();

    renderPage();

    expect(await screen.findByText('Buddy')).toBeInTheDocument();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(lastQueueFilters()).not.toHaveProperty('latitude');
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();
  });

  it('reloads the deck with the adopter coordinates once they share their location', async () => {
    const geo = stubGeolocation();
    geo.grant();
    renderPage();
    await screen.findByText('Buddy');

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));

    await waitFor(() => expect(lastQueueFilters()).toMatchObject(HOME));
    expect(screen.getByRole('status')).toHaveTextContent('Showing distance from your location');
    expect(screen.getByRole('button', { name: /stop sharing location/i })).toBeInTheDocument();
  });

  it('shows progress while the browser is locating and stops further requests', async () => {
    const geo = stubGeolocation();
    renderPage();
    await screen.findByText('Buddy');

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));

    const busy = await screen.findByRole('button', { name: /finding your location/i });
    expect(busy).toBeDisabled();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('explains a denied permission, keeps the deck, and does not retry by itself', async () => {
    const geo = stubGeolocation();
    geo.deny();
    renderPage();
    await screen.findByText('Buddy');
    const loadsBefore = getDiscoveryQueueMock.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/access was blocked/i);
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(getDiscoveryQueueMock).toHaveBeenCalledTimes(loadsBefore);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('stops sharing: forgets the location and reloads the deck without coordinates', async () => {
    const geo = stubGeolocation();
    geo.grant();
    renderPage();
    await screen.findByText('Buddy');
    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => expect(lastQueueFilters()).toMatchObject(HOME));

    await userEvent.click(screen.getByRole('button', { name: /stop sharing location/i }));

    await waitFor(() => expect(lastQueueFilters()).not.toHaveProperty('latitude'));
    expect(window.localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();
  });

  it('never sends the coordinates to analytics', async () => {
    const geo = stubGeolocation();
    geo.grant();
    renderPage();
    await screen.findByText('Buddy');

    await userEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => expect(lastQueueFilters()).toMatchObject(HOME));

    expect(JSON.stringify(logEventMock.mock.calls)).not.toMatch(/53\.58|-2\.43/);
  });
});
