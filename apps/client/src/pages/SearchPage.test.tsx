/**
 * C6: SearchPage load states.
 *
 * The bespoke "Unable to load results" / "No pets match your filters" markup is
 * replaced by the shared QueryBoundary + ErrorState / EmptyState. These tests
 * drive the page's internal fetch (petService.searchPets) to exercise the error
 * and empty branches and assert the shared states render (and the error one is
 * retryable).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';

const searchPetsMock = vi.fn();
// Stable references — the page memoises its loader on these, so returning fresh
// closures each render would refire the fetch effect in a loop.
const logEventMock = vi.fn();
const analyticsMock = { trackPageView: vi.fn(), trackEvent: vi.fn() };

const filterStateMock = {
  filters: { sortBy: 'created_at', sortOrder: 'desc' } as Record<string, unknown>,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  handleFilterChange: vi.fn(),
  handleSortChange: vi.fn(),
  handlePageChange: vi.fn(),
  clearFilters: vi.fn(),
};

const nearbyMock = {
  hasLocation: false,
  latitude: null as number | null,
  longitude: null as number | null,
  clearLocation: vi.fn(),
};

vi.mock('@/services', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/services');
  return {
    ...actual,
    petService: {
      searchPets: (...args: unknown[]) => searchPetsMock(...args),
    },
  };
});

vi.mock('@/hooks/useSearchFilters', () => ({
  useSearchFilters: () => filterStateMock,
}));

vi.mock('@/hooks/useNearbySearch', () => ({
  useNearbySearch: () => nearbyMock,
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: logEventMock }),
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalytics: () => analyticsMock,
}));

vi.mock('@adopt-dont-shop/lib.feature-flags', () => ({
  useFeatureGate: () => ({ value: false }),
}));

vi.mock('@/components/PetCard', () => ({
  PetCard: ({ pet }: { pet: { name: string } }) => <div>{pet.name}</div>,
}));

vi.mock('./SearchFilters', () => ({
  SearchFilters: () => <div data-testid='search-filters' />,
}));

vi.mock('@/components/discovery/DiscoverySearchToggle', () => ({
  DiscoverySearchToggle: () => <div data-testid='discovery-toggle' />,
}));

import { SearchPage } from './SearchPage';

describe('SearchPage load states (C6)', () => {
  beforeEach(() => {
    searchPetsMock.mockReset();
    searchPetsMock.mockResolvedValue({ data: [], pagination: null });
    filterStateMock.filters = { sortBy: 'created_at', sortOrder: 'desc' };
    filterStateMock.searchQuery = '';
    nearbyMock.hasLocation = false;
  });

  it('renders a retryable error state when the search request fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    searchPetsMock.mockRejectedValueOnce(new Error('boom'));

    render(<SearchPage />);

    expect(await screen.findByText(/unable to load results/i)).toBeInTheDocument();

    searchPetsMock.mockResolvedValueOnce({
      data: [{ pet_id: 'p1', name: 'Rex' }],
      pagination: null,
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Rex')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('renders the shared empty state when no pets match', async () => {
    searchPetsMock.mockResolvedValueOnce({ data: [], pagination: null });

    render(<SearchPage />);

    expect(await screen.findByText(/no pets match your filters/i)).toBeInTheDocument();
  });
});
