import { PetCard } from '@/components/PetCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useNearbySearch } from '@/hooks/useNearbySearch';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import { petService, PaginatedResponse, Pet } from '@/services';
import { Button, Container, SelectInput, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as styles from './SearchPage.css';
import { SORT_OPTIONS } from './searchOptions';
import { SearchFilters } from './SearchFilters';

export const SearchPage: React.FC = () => {
  'use memo';
  const [searchParams, setSearchParams] = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<Pet>['pagination'] | null>(null);
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const { value: advancedFiltersEnabled } = useFeatureGate('advanced_search_filters');
  const nearby = useNearbySearch();
  const filterState = useSearchFilters(searchParams, setSearchParams);

  const initialSearchQueryRef = useRef(filterState.searchQuery);
  const initialFiltersRef = useRef(filterState.filters);

  useEffect(() => {
    const initialQuery = initialSearchQueryRef.current;
    const initialFilters = initialFiltersRef.current;

    trackEvent({
      category: 'feature_flags',
      action: 'search_filters_variant_shown',
      label: advancedFiltersEnabled ? 'advanced_filters' : 'basic_filters',
      sessionId: 'search-session',
      timestamp: new Date(),
      properties: { variant: advancedFiltersEnabled ? 'advanced_filters' : 'basic_filters' },
    });

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

    logEvent('search_page_viewed', 1, {
      has_initial_query: (!!initialQuery).toString(),
      initial_type_filter: initialFilters.type || 'none',
      page_number: (initialFilters.page || 1).toString(),
    });
  }, [trackPageView, trackEvent, logEvent, advancedFiltersEnabled]);

  const loadPets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { filters, searchQuery } = filterState;
      const searchFilters = { ...filters };

      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }

      if (nearby.hasLocation) {
        searchFilters.latitude = nearby.latitude;
        searchFilters.longitude = nearby.longitude;
      }

      trackEvent({
        category: 'search',
        action: 'pet_search_executed',
        label: filterState.searchQuery ? 'query_search' : 'filter_search',
        sessionId: 'search-session',
        timestamp: new Date(),
        properties: {
          search_query: filterState.searchQuery || 'none',
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

      logEvent('pet_search_executed', 1, {
        search_query: filterState.searchQuery || 'none',
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
          search_query: filterState.searchQuery || 'none',
        },
      });

      logEvent('pet_search_results', (response.data || []).length, {
        total_results: response.pagination?.total?.toString() || '0',
        results_on_page: (response.data || []).length.toString(),
        has_filters: Object.values(filters).some(v => v && v !== '' && v !== 1) ? 'true' : 'false',
        search_query: filterState.searchQuery || 'none',
      });
    } catch (err) {
      console.error('Search error details:', err);
      setError('Failed to load pets. Please try again.');
      setPets([]);
      setPagination(null);

      logEvent('pet_search_error', 1, {
        error_message: err instanceof Error ? err.message : 'Unknown error',
        search_query: filterState.searchQuery || 'none',
        filters_applied: JSON.stringify(filterState.filters),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filterState.filters,
    filterState.searchQuery,
    nearby.hasLocation,
    nearby.latitude,
    nearby.longitude,
    logEvent,
    trackEvent,
  ]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const handleClearAll = () => {
    filterState.clearFilters();
    nearby.clearLocation();
  };

  const hasActiveFilters = Boolean(
    filterState.filters.search ||
    filterState.filters.type ||
    filterState.filters.breed ||
    filterState.filters.size ||
    filterState.filters.gender ||
    filterState.filters.ageGroup ||
    filterState.filters.status ||
    filterState.filters.location ||
    filterState.filters.maxDistance ||
    nearby.hasLocation ||
    filterState.searchQuery
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

      <SearchFilters
        filters={filterState.filters}
        searchQuery={filterState.searchQuery}
        onSearchQueryChange={filterState.setSearchQuery}
        onFilterChange={filterState.handleFilterChange}
        geolocation={nearby}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAll}
        onSearch={loadPets}
      />

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
              value={`${filterState.filters.sortBy}:${filterState.filters.sortOrder}`}
              onChange={(value: string | string[]) => filterState.handleSortChange(value as string)}
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
            {hasActiveFilters && <Button onClick={handleClearAll}>Clear All Filters</Button>}
          </div>
        ) : (
          <>
            {!nearby.hasLocation && (
              <p className={styles.locationHint}>
                Enable your location above to see how far away each pet is.
              </p>
            )}
            <div className={styles.petGrid}>
              {pets && pets.map(pet => <PetCard key={pet.pet_id} pet={pet} />)}
            </div>
          </>
        )}

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
                onClick={() => filterState.handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>

              <Button
                variant='outline'
                size='sm'
                disabled={!pagination.hasNext}
                onClick={() => filterState.handlePageChange(pagination.page + 1)}
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
