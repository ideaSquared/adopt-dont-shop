/**
 * ADS-1343: the anonymous first-like celebration modal renders a stored pet
 * image URL directly into `<img src>`. It must go through the same
 * `resolveFileUrl` guard as every other pet-image render path (PetCard,
 * PetDetailsPage, SwipeStack, PetHeroCard) instead of trusting the URL
 * straight from the API response.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthService: class {
    getToken() {
      return null;
    }
  },
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
  SwipeStack: ({ onSwipe }: { onSwipe: (action: Record<string, unknown>) => void }) => (
    <button
      type='button'
      onClick={() => onSwipe({ petId: 'pet-1', action: 'like', timestamp: Date.now() })}
    >
      Like
    </button>
  ),
}));

vi.mock('../swipe/SwipeControls', () => ({
  SwipeControls: () => <div data-testid='swipe-controls' />,
}));

vi.mock('../profile/ProfileCompletionMeter', () => ({
  ProfileCompletionMeter: () => null,
}));

vi.mock('./EndOfQueueEmptyState', () => ({
  EndOfQueueEmptyState: () => <div>No more pets</div>,
}));

vi.mock('./AnonymousSwipePaywallModal', () => ({
  AnonymousSwipePaywallModal: () => null,
}));

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
const recordSwipeActionMock = vi.fn().mockResolvedValue(undefined);
const loadMorePetsMock = vi.fn().mockResolvedValue([]);

vi.mock('@/services', () => ({
  discoveryService: {
    getDiscoveryQueue: (...args: unknown[]) => getDiscoveryQueueMock(...args),
    recordSwipeAction: (...args: unknown[]) => recordSwipeActionMock(...args),
    loadMorePets: (...args: unknown[]) => loadMorePetsMock(...args),
  },
}));

const makePet = (images: string[]) => ({
  petId: 'pet-1',
  name: 'Biscuit',
  type: 'dog',
  breed: 'Labrador',
  ageGroup: 'adult',
  size: 'medium',
  gender: 'male',
  images,
  rescueName: 'Test Rescue',
  description: 'A good dog',
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>{children}</ThemeProvider>
  </BrowserRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('DiscoveryPage – anonymous first-like modal image', () => {
  it('does not render an unsafe stored image URL into the celebration modal', async () => {
    getDiscoveryQueueMock.mockResolvedValueOnce({
      pets: [makePet(['javascript:alert(1)'])],
    });

    const { DiscoveryPage } = await import('./DiscoveryPage');
    render(<DiscoveryPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Loading pets...')).not.toBeInTheDocument();
    });

    act(() => {
      screen.getByRole('button', { name: 'Like' }).click();
    });

    await waitFor(() => {
      expect(screen.getByText("It's a Match!")).toBeInTheDocument();
    });
    expect(screen.queryByAltText('Biscuit')).toBeNull();
  });

  it('renders a safe https stored image URL into the celebration modal', async () => {
    getDiscoveryQueueMock.mockResolvedValueOnce({
      pets: [makePet(['https://cdn.example.com/biscuit.jpg'])],
    });

    const { DiscoveryPage } = await import('./DiscoveryPage');
    render(<DiscoveryPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Loading pets...')).not.toBeInTheDocument();
    });

    act(() => {
      screen.getByRole('button', { name: 'Like' }).click();
    });

    await waitFor(() => {
      expect(screen.getByText("It's a Match!")).toBeInTheDocument();
    });
    expect(screen.getByAltText('Biscuit')).toHaveAttribute(
      'src',
      'https://cdn.example.com/biscuit.jpg'
    );
  });
});
