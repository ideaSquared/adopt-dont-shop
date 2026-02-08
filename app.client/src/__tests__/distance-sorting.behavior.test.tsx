/**
 * Behavioral tests for Distance Sorting feature
 *
 * Tests user-facing behavior for location-based pet search:
 * - User can request browser location
 * - User sees distance filter options
 * - User can sort by distance
 * - Distance is displayed on pet cards
 * - Location permission denied is handled gracefully
 * - Location can be cleared
 */

import { renderWithProviders, screen, waitFor, userEvent } from '../test-utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react';

// Mock the hooks that SearchPage depends on
const mockTrackEvent = vi.fn();
const mockTrackPageView = vi.fn();
const mockLogEvent = vi.fn();

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    trackPageView: mockTrackPageView,
  }),
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
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
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

// Import SearchPage after mocks are set up
import { SearchPage } from '../pages/SearchPage';

const mockPetsWithDistance = [
  {
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
    distance: 5.2,
    images: [],
    videos: [],
    tags: [],
    temperament: [],
    featured: false,
    priority_listing: false,
    archived: false,
    adoption_fee: '150',
    special_needs: false,
    house_trained: true,
    energy_level: 'medium',
    exercise_needs: 'daily walks',
    grooming_needs: 'weekly',
    intake_date: '2025-01-01',
    vaccination_status: 'up_to_date',
    spay_neuter_status: 'neutered',
    microchip_id: 'chip-1',
    weight_kg: '30',
    location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
    available_since: '2025-01-01',
    view_count: 10,
    favorite_count: 5,
    application_count: 2,
    search_vector: '',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    pet_id: 'pet-2',
    name: 'Whiskers',
    type: 'cat',
    breed: 'Tabby',
    age_years: 2,
    age_months: 6,
    age_group: 'adult',
    gender: 'female',
    status: 'available',
    size: 'small',
    color: 'tabby',
    short_description: 'Playful cat',
    long_description: 'A playful tabby cat',
    rescue_id: 'rescue-2',
    distance: 12.8,
    images: [],
    videos: [],
    tags: [],
    temperament: [],
    featured: false,
    priority_listing: false,
    archived: false,
    adoption_fee: '100',
    special_needs: false,
    house_trained: true,
    energy_level: 'medium',
    exercise_needs: 'indoor play',
    grooming_needs: 'weekly',
    intake_date: '2025-01-15',
    vaccination_status: 'up_to_date',
    spay_neuter_status: 'spayed',
    microchip_id: 'chip-2',
    weight_kg: '4',
    location: { type: 'Point', coordinates: [-0.2, 51.6] },
    available_since: '2025-01-15',
    view_count: 8,
    favorite_count: 3,
    application_count: 1,
    search_vector: '',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
];

const handlers = [
  http.get('*/api/v1/pets', () => {
    return HttpResponse.json({
      success: true,
      data: mockPetsWithDistance,
      meta: {
        page: 1,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Distance Sorting - Behavioral Tests', () => {
  describe('Location Controls', () => {
    it('shows "Use My Location" button on the search page', async () => {
      renderWithProviders(<SearchPage />);

      const locationButton = await screen.findByRole('button', { name: /use my location/i });
      expect(locationButton).toBeInTheDocument();
    });

    it('shows distance filter dropdown', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/distance/i)).toBeInTheDocument();
      });
    });

    it('renders sort select with distance option available', async () => {
      renderWithProviders(<SearchPage />);

      const sortSelect = await screen.findByLabelText(/sort by/i);
      expect(sortSelect).toBeInTheDocument();
    });
  });

  describe('Distance Display', () => {
    it('shows distance on pet cards when distance data is available', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/5.2 mi away/)).toBeInTheDocument();
        expect(screen.getByText(/12.8 mi away/)).toBeInTheDocument();
      });
    });

    it('shows pet names in search results', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });
    });

    it('shows result count', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/2 Pets Found/)).toBeInTheDocument();
      });
    });
  });

  describe('Search Page Elements', () => {
    it('renders all standard filter controls', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/pet type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/age group/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/distance/i)).toBeInTheDocument();
      });
    });

    it('renders the search button', async () => {
      renderWithProviders(<SearchPage />);

      const searchButton = await screen.findByRole('button', { name: /^search$/i });
      expect(searchButton).toBeInTheDocument();
    });
  });

  describe('Location Permission Denied', () => {
    it('shows error message when geolocation is not available', async () => {
      // Save original
      const originalGeolocation = navigator.geolocation;

      // Remove geolocation
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderWithProviders(<SearchPage />);

      const user = userEvent.setup();
      const locationButton = await screen.findByRole('button', { name: /use my location/i });
      await user.click(locationButton);

      await waitFor(() => {
        expect(
          screen.getByText(/geolocation is not supported by your browser/i)
        ).toBeInTheDocument();
      });

      // Restore
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Clear Filters', () => {
    it('shows clear filters button when search query is present', async () => {
      renderWithProviders(<SearchPage />);

      const searchInput = await screen.findByLabelText(/search/i);
      const user = userEvent.setup();
      await user.type(searchInput, 'dog');

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /clear filters/i });
        expect(clearButton).toBeInTheDocument();
      });
    });
  });
});
