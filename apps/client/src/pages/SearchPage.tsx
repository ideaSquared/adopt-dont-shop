import { PetCard } from '@/components/PetCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useNearbySearch } from '@/hooks/useNearbySearch';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import {
  Button,
  Container,
  EmptyState,
  ErrorState,
  PageHeader,
  QueryBoundary,
  SelectInput,
} from '@adopt-dont-shop/lib.components';
import { PetCardSkeletonGrid } from '@/components/skeletons';
import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import * as styles from './SearchPage.css';
import { useSearchPets } from './useSearchPets';
import { SORT_OPTIONS } from './searchOptions';
import { SearchFilters } from './SearchFilters';
import { DiscoverySearchToggle } from '@/components/discovery/DiscoverySearchToggle';

export const SearchPage: React.FC = () => {
  'use memo';
  const [searchParams, setSearchParams] = useSearchParams();
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

  const searchQuery = useSearchPets({
    filters: filterState.filters,
    searchQuery: filterState.searchQuery,
    coordinates: nearby.hasLocation
      ? { latitude: nearby.latitude, longitude: nearby.longitude }
      : null,
    logEvent,
    trackEvent,
  });
  const pets = searchQuery.data?.pets ?? [];
  const pagination = searchQuery.data?.pagination ?? null;
  const isLoading = searchQuery.isFetching;
  const error = searchQuery.isError
    ? 'Something went wrong loading results. Please check your connection and try again.'
    : null;
  const loadPets = () => {
    void searchQuery.refetch();
  };

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
      <PageHeader
        title='Find Your Next Pet'
        description="Browse adoptable pets from verified rescues. Use the filters below to find exactly what you're looking for. Prefer to browse one at a time? Switch to Discover."
        actions={<DiscoverySearchToggle active='search' />}
      />

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

        <QueryBoundary
          isLoading={isLoading}
          isError={!!error}
          error={error}
          isEmpty={!pets || pets.length === 0}
          onRetry={loadPets}
          loadingFallback={
            <div className={styles.petGrid}>
              <PetCardSkeletonGrid count={8} />
            </div>
          }
          errorFallback={
            <ErrorState
              title='Unable to load results'
              message={error ?? undefined}
              onRetry={loadPets}
            />
          }
          emptyFallback={
            <EmptyState
              variant='search'
              title='No pets match your filters'
              description='Try broadening your search by removing some filters or using different keywords.'
              actions={
                hasActiveFilters ? [{ label: 'Clear All Filters', onClick: handleClearAll }] : []
              }
            />
          }
        >
          {!nearby.hasLocation && (
            <p className={styles.locationHint}>
              Enable your location above to see how far away each pet is.
            </p>
          )}
          <div className={styles.petGrid}>
            {pets && pets.map(pet => <PetCard key={pet.pet_id} pet={pet} />)}
          </div>
        </QueryBoundary>

        {pagination && pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <div className='page-info'>
              Showing page {pagination.page} of {pagination.totalPages} &mdash; {pagination.total}{' '}
              pets
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
