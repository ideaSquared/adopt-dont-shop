import { PetCard } from '@/components/PetCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import { petService, PaginatedResponse, Pet, PetSearchFilters } from '@/services';
import { geocodeLocation } from '@/utils/geocoding';
import {
  Button,
  Card,
  Container,
  SelectInput,
  Spinner,
  TextInput,
} from '@adopt-dont-shop/lib.components';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as styles from './SearchPage.css';
import {
  AGE_GROUPS,
  DISTANCE_OPTIONS,
  isKnownSortBy,
  isKnownSortOrder,
  PET_GENDERS,
  PET_SIZES,
  PET_STATUS,
  PET_TYPES,
  SORT_OPTIONS,
} from './searchOptions';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<Pet>['pagination'] | null>(null);
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const { value: advancedFiltersEnabled } = useFeatureGate('advanced_search_filters');
  const geolocation = useGeolocation();

  // Search filters state
  const initialSortByParam = searchParams.get('sortBy');
  const initialSortOrderParam = searchParams.get('sortOrder');
  const [filters, setFilters] = useState<PetSearchFilters>({
    type: searchParams.get('type') || '',
    breed: searchParams.get('breed') || '',
    size: searchParams.get('size') || '',
    gender: searchParams.get('gender') || '',
    location: searchParams.get('location') || '',
    ageGroup: searchParams.get('ageGroup') || '',
    status: searchParams.get('status') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
    sortBy: isKnownSortBy(initialSortByParam) ? (initialSortByParam as string) : 'createdAt',
    sortOrder: isKnownSortOrder(initialSortOrderParam) ? initialSortOrderParam : 'desc',
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Capture initial filter/query state at mount for the page-view analytics event below.
  // These refs are intentionally not deps — we want a single fire on mount (and when the
  // feature flag flips), not on every user keystroke.
  const initialSearchQueryRef = useRef(searchQuery);
  const initialFiltersRef = useRef(filters);

  // Log page view once on mount (and when the feature flag variant changes)
  useEffect(() => {
    const initialQuery = initialSearchQueryRef.current;
    const initialFilters = initialFiltersRef.current;

    // Track feature flag usage
    trackEvent({
      category: 'feature_flags',
      action: 'search_filters_variant_shown',
      label: advancedFiltersEnabled ? 'advanced_filters' : 'basic_filters',
      sessionId: 'search-session',
      timestamp: new Date(),
      properties: {
        variant: advancedFiltersEnabled ? 'advanced_filters' : 'basic_filters',
      },
    });

    // Track with new analytics service
    trackPageView('/search');
    trackEvent({
      category: 'search',
      action: 'page_viewed',
      label: 'search_page_load',
      sessionId: 'search-session',
      timestamp: new Date(),
      properties: {
        has_initial_query: !!initialQuery,
        initial_type_filter: initialFilters.type || 'none',
        page_number: initialFilters.page || 1,
      },
    });

    // Existing Statsig tracking
    logEvent('search_page_viewed', 1, {
      has_initial_query: (!!initialQuery).toString(),
      initial_type_filter: initialFilters.type || 'none',
      page_number: (initialFilters.page || 1).toString(),
    });
  }, [trackPageView, trackEvent, logEvent, advancedFiltersEnabled]);

  // Load pets based on current filters
  const loadPets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const searchFilters = { ...filters };

      // Add search query as general search parameter
      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }

      // Add user location coordinates for distance-based search
      if (geolocation.hasLocation) {
        searchFilters.latitude = geolocation.latitude;
        searchFilters.longitude = geolocation.longitude;
      }

      // Track search execution with new analytics service
      trackEvent({
        category: 'search',
        action: 'pet_search_executed',
        label: searchQuery ? 'query_search' : 'filter_search',
        sessionId: 'search-session',
        timestamp: new Date(),
        properties: {
          search_query: searchQuery || 'none',
          type_filter: filters.type || 'none',
          breed_filter: filters.breed || 'none',
          size_filter: filters.size || 'none',
          gender_filter: filters.gender || 'none',
          location_filter: filters.location || 'none',
          age_group_filter: filters.ageGroup || 'none',
          status_filter: filters.status || 'none',
          sort_by: filters.sortBy || 'created_at',
          sort_order: filters.sortOrder || 'desc',
          page: filters.page || 1,
          has_filters: Object.values(filters).some(v => v && v !== '' && v !== 1),
        },
      });

      // Log search execution (existing Statsig tracking)
      logEvent('pet_search_executed', 1, {
        search_query: searchQuery || 'none',
        type_filter: filters.type || 'none',
        breed_filter: filters.breed || 'none',
        size_filter: filters.size || 'none',
        gender_filter: filters.gender || 'none',
        location_filter: filters.location || 'none',
        age_group_filter: filters.ageGroup || 'none',
        status_filter: filters.status || 'none',
        sort_by: filters.sortBy || 'created_at',
        sort_order: filters.sortOrder || 'desc',
        page: (filters.page || 1).toString(),
      });

      const response = await petService.searchPets(searchFilters);

      setPets(response.data || []);
      setPagination(response.pagination || null);

      // Track search results with new analytics service
      trackEvent({
        category: 'search',
        action: 'pet_search_results',
        label: 'search_completed',
        value: (response.data || []).length,
        sessionId: 'search-session',
        timestamp: new Date(),
        properties: {
          total_results: response.pagination?.total || 0,
          results_on_page: (response.data || []).length,
          has_filters: Object.values(filters).some(v => v && v !== '' && v !== 1),
          search_query: searchQuery || 'none',
        },
      });

      // Log search results (existing Statsig tracking)
      logEvent('pet_search_results', (response.data || []).length, {
        total_results: response.pagination?.total?.toString() || '0',
        results_on_page: (response.data || []).length.toString(),
        has_filters: Object.values(filters).some(v => v && v !== '' && v !== 1) ? 'true' : 'false',
        search_query: searchQuery || 'none',
      });
    } catch (err) {
      console.error('Search error details:', err);
      setError('Failed to load pets. Please try again.');
      setPets([]);
      setPagination(null);

      // Log search error
      logEvent('pet_search_error', 1, {
        error_message: err instanceof Error ? err.message : 'Unknown error',
        search_query: searchQuery || 'none',
        filters_applied: JSON.stringify(filters),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filters,
    searchQuery,
    logEvent,
    geolocation.hasLocation,
    geolocation.latitude,
    geolocation.longitude,
  ]);
  // Update URL search params when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.set('q', searchQuery);
    }
    if (filters.type) {
      params.set('type', filters.type);
    }
    if (filters.breed) {
      params.set('breed', filters.breed);
    }
    if (filters.size) {
      params.set('size', filters.size);
    }
    if (filters.gender) {
      params.set('gender', filters.gender);
    }
    if (filters.ageGroup) {
      params.set('ageGroup', filters.ageGroup);
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.location) {
      params.set('location', filters.location);
    }
    if (filters.page && filters.page > 1) {
      params.set('page', filters.page.toString());
    }
    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.set('sortOrder', filters.sortOrder);
    }

    setSearchParams(params);
  }, [filters, searchQuery, setSearchParams]);

  // Load pets when filters change
  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const handleFilterChange = (field: keyof PetSearchFilters, value: string) => {
    if (field === 'location') {
      setGeocodeError(null);
    }
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleUseLocationText = async () => {
    if (!filters.location?.trim()) {
      return;
    }

    setIsGeocodingLocation(true);
    setGeocodeError(null);

    try {
      const result = await geocodeLocation(filters.location);
      if (result) {
        geolocation.setManualLocation(result.latitude, result.longitude);
      } else {
        setGeocodeError('Location not found. Please try a more specific location.');
      }
    } catch {
      setGeocodeError('Failed to look up location. Please try again.');
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setSearchQuery('');
    setGeocodeError(null);
    geolocation.clearLocation();
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.type ||
    filters.breed ||
    filters.size ||
    filters.gender ||
    filters.ageGroup ||
    filters.status ||
    filters.location ||
    filters.maxDistance ||
    geolocation.hasLocation ||
    searchQuery
  );

  return (
    <Container className={styles.searchContainer}>
      <div className={styles.searchHeader}>
        <h1>Find Your Perfect Pet</h1>
        <p>
          Search through thousands of loving pets waiting for their forever homes. Use the filters
          below to find exactly what you&apos;re looking for.
        </p>
      </div>

      {/* Search Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <TextInput
            label='Search'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search by name, breed, or description...'
          />

          <SelectInput
            label='Pet Type'
            value={filters.type || ''}
            onChange={(value: string | string[]) => handleFilterChange('type', value as string)}
            options={PET_TYPES}
          />

          <SelectInput
            label='Size'
            value={filters.size || ''}
            onChange={(value: string | string[]) => handleFilterChange('size', value as string)}
            options={PET_SIZES}
          />

          <SelectInput
            label='Gender'
            value={filters.gender || ''}
            onChange={(value: string | string[]) => handleFilterChange('gender', value as string)}
            options={PET_GENDERS}
          />

          <SelectInput
            label='Age Group'
            value={filters.ageGroup || ''}
            onChange={(value: string | string[]) => handleFilterChange('ageGroup', value as string)}
            options={AGE_GROUPS}
          />

          <SelectInput
            label='Status'
            value={filters.status || ''}
            onChange={(value: string | string[]) => handleFilterChange('status', value as string)}
            options={PET_STATUS}
          />

          <SelectInput
            label='Distance'
            value={filters.maxDistance?.toString() || ''}
            onChange={(value: string | string[]) => {
              const dist = value as string;
              setFilters(prev => ({
                ...prev,
                maxDistance: dist ? parseInt(dist, 10) : undefined,
                page: 1,
              }));
            }}
            options={DISTANCE_OPTIONS}
          />
        </div>

        <div className={styles.locationFilterRow}>
          <Button
            className={styles.locationButton}
            variant='outline'
            size='sm'
            onClick={geolocation.requestLocation}
            disabled={geolocation.status === 'loading'}
          >
            {geolocation.status === 'loading'
              ? 'Detecting...'
              : geolocation.hasLocation
                ? 'Update My Location'
                : 'Use My Location'}
          </Button>
          <span className={styles.orLabel}>or</span>
          <div className={styles.locationInputGroup}>
            <TextInput
              label='Location'
              value={filters.location || ''}
              onChange={e => handleFilterChange('location', e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && filters.location?.trim()) {
                  e.preventDefault();
                  handleUseLocationText();
                }
              }}
              placeholder='City or postcode...'
            />
            {filters.location?.trim() && (
              <Button
                className={styles.locationButton}
                variant='outline'
                size='sm'
                onClick={handleUseLocationText}
                disabled={isGeocodingLocation}
              >
                {isGeocodingLocation ? 'Finding...' : 'Search nearby'}
              </Button>
            )}
          </div>
          {geolocation.hasLocation && (
            <Button
              className={styles.locationButton}
              variant='outline'
              size='sm'
              onClick={geolocation.clearLocation}
            >
              Clear Location
            </Button>
          )}
          {geolocation.hasLocation && (
            <div className={styles.locationStatus({ variant: 'success' })}>
              Location detected - distance search enabled
            </div>
          )}
          {(geolocation.status === 'denied' ||
            geolocation.status === 'error' ||
            geolocation.status === 'unavailable') && (
            <div className={styles.locationStatus({ variant: 'error' })}>{geolocation.error}</div>
          )}
          {geocodeError && (
            <div className={styles.locationStatus({ variant: 'error' })}>{geocodeError}</div>
          )}
        </div>

        <div className={styles.filterActions}>
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          <Button onClick={loadPets}>Search</Button>
        </div>
      </Card>

      {/* Search Results */}
      <div className={styles.searchResults}>
        <div className={styles.resultsHeader}>
          <h2>
            {pagination
              ? `${pagination.total} ${pagination.total === 1 ? 'Pet' : 'Pets'} Found`
              : 'Search Results'}
          </h2>

          <div className='sort-controls'>
            <SelectInput
              label='Sort by'
              value={`${filters.sortBy}:${filters.sortOrder}`}
              onChange={(value: string | string[]) => handleSortChange(value as string)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size='lg' />
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <Button onClick={loadPets}>Try Again</Button>
          </div>
        ) : !pets || pets.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No pets found</h3>
            <p>Try adjusting your search criteria or clearing some filters to see more results.</p>
            {hasActiveFilters && <Button onClick={clearFilters}>Clear All Filters</Button>}
          </div>
        ) : (
          <>
            {!geolocation.hasLocation && (
              <p className={styles.locationHint}>
                Enable your location above to see how far away each pet is.
              </p>
            )}
            <div className={styles.petGrid}>
              {pets && pets.map(pet => <PetCard key={pet.pet_id} pet={pet} />)}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <div className='page-info'>
              Page {pagination.page} of {pagination.totalPages}({pagination.total} total pets)
            </div>

            <div className='page-controls'>
              <Button
                variant='outline'
                size='sm'
                disabled={!pagination.hasPrev}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>

              <Button
                variant='outline'
                size='sm'
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};
