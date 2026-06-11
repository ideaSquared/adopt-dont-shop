import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import { SearchFilters } from './SearchFilters';
import type { PetSearchFilters } from '@/services';
import type { useNearbySearch } from '@/hooks/useNearbySearch';

const buildFilters = (overrides: Partial<PetSearchFilters> = {}): PetSearchFilters => ({
  type: '',
  breed: '',
  size: '',
  gender: '',
  location: '',
  ageGroup: '',
  status: '',
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  ...overrides,
});

const buildGeo = (overrides = {}): ReturnType<typeof useNearbySearch> => ({
  latitude: undefined,
  longitude: undefined,
  status: 'idle',
  error: undefined,
  hasLocation: false,
  isGeocodingLocation: false,
  geocodeError: null,
  requestLocation: vi.fn(),
  setManualLocation: vi.fn(),
  clearLocation: vi.fn(),
  handleUseLocationText: vi.fn(),
  ...overrides,
});

const defaultProps = {
  filters: buildFilters(),
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  onFilterChange: vi.fn(),
  geolocation: buildGeo(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
  onSearch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SearchFilters', () => {
  it('renders all filter inputs', () => {
    renderWithProviders(<SearchFilters {...defaultProps} />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Pet Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Gender')).toBeInTheDocument();
    expect(screen.getByLabelText('Age Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Distance')).toBeInTheDocument();
  });

  it('does not show Clear Filters when hasActiveFilters is false', () => {
    renderWithProviders(<SearchFilters {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('shows Clear Filters button when hasActiveFilters is true', () => {
    renderWithProviders(<SearchFilters {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('calls onClearFilters when Clear Filters is clicked', () => {
    const onClearFilters = vi.fn();
    renderWithProviders(
      <SearchFilters {...defaultProps} hasActiveFilters={true} onClearFilters={onClearFilters} />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when Search button is clicked', () => {
    const onSearch = vi.fn();
    renderWithProviders(<SearchFilters {...defaultProps} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('calls onSearchQueryChange when search input changes', () => {
    const onSearchQueryChange = vi.fn();
    renderWithProviders(
      <SearchFilters {...defaultProps} onSearchQueryChange={onSearchQueryChange} />
    );
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'buddy' } });
    expect(onSearchQueryChange).toHaveBeenCalledWith('buddy');
  });

  it('shows Use My Location button when no location is set', () => {
    renderWithProviders(<SearchFilters {...defaultProps} />);
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();
  });

  it('shows Update My Location button when location is already set', () => {
    renderWithProviders(
      <SearchFilters
        {...defaultProps}
        geolocation={buildGeo({ hasLocation: true, status: 'granted' })}
      />
    );
    expect(screen.getByRole('button', { name: /update my location/i })).toBeInTheDocument();
  });

  it('shows Search nearby button when location text is entered', () => {
    renderWithProviders(
      <SearchFilters {...defaultProps} filters={buildFilters({ location: 'London' })} />
    );
    expect(screen.getByRole('button', { name: /search nearby/i })).toBeInTheDocument();
  });

  it('calls handleUseLocationText when Search nearby is clicked', () => {
    const handleUseLocationText = vi.fn();
    renderWithProviders(
      <SearchFilters
        {...defaultProps}
        filters={buildFilters({ location: 'London' })}
        geolocation={buildGeo({ handleUseLocationText })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /search nearby/i }));
    expect(handleUseLocationText).toHaveBeenCalledWith('London');
  });

  it('shows geocode error when present', () => {
    renderWithProviders(
      <SearchFilters
        {...defaultProps}
        geolocation={buildGeo({ geocodeError: 'Location not found.' })}
      />
    );
    expect(screen.getByText('Location not found.')).toBeInTheDocument();
  });

  it('shows geolocation error when status is denied', () => {
    renderWithProviders(
      <SearchFilters
        {...defaultProps}
        geolocation={buildGeo({ status: 'denied', error: 'Permission denied' })}
      />
    );
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
  });
});
