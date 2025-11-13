import { PetCard } from '@/components/PetCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import { petService, PaginatedResponse, Pet, PetSearchFilters } from '@/services';
import {
  Button,
  Card,
  Container,
  SelectInput,
  Spinner,
  TextInput,
} from '@adopt-dont-shop/lib.components';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

const SearchContainer = styled(Container)`
  padding: 2rem 0;
  min-height: calc(100vh - 200px);
`;

const SearchHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2.5rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.2rem;
    color: ${props => props.theme.text.secondary};
    max-width: 600px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    p {
      font-size: 1rem;
    }
  }
`;

const FiltersCard = styled(Card)`
  margin-bottom: 2rem;
  padding: 1.5rem;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SearchResults = styled.div`
  margin-bottom: 2rem;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;

  h2 {
    color: ${props => props.theme.text.primary};
    margin: 0;
  }

  .sort-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
`;

const PetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.text.secondary};

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;

  .page-info {
    color: ${props => props.theme.text.secondary};
    font-size: 0.9rem;
  }

  .page-controls {
    display: flex;
    gap: 0.5rem;
  }
`;

const PET_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'bird', label: 'Birds' },
  { value: 'other', label: 'Other' },
];

const PET_SIZES = [
  { value: '', label: 'All Sizes' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
];

const PET_GENDERS = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const AGE_GROUPS = [
  { value: '', label: 'All Ages' },
  { value: 'young', label: 'Young' },
  { value: 'adult', label: 'Adult' },
  { value: 'senior', label: 'Senior' },
];

const PET_STATUS = [
  { value: '', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'adopted', label: 'Adopted' },
];

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
  { value: 'age_years:asc', label: 'Youngest First' },
  { value: 'age_years:desc', label: 'Oldest First' },
  { value: 'adoption_fee:asc', label: 'Price Low to High' },
  { value: 'adoption_fee:desc', label: 'Price High to Low' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<Pet>['pagination'] | null>(null);
  // const [useAdvancedFilters, setUseAdvancedFilters] = useState(false); // Future feature
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const { value: advancedFiltersEnabled } = useFeatureGate('advanced_search_filters');

  // Search filters state
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
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Log page view
  useEffect(() => {
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
        has_initial_query: !!searchQuery,
        initial_type_filter: filters.type || 'none',
        page_number: filters.page || 1,
      },
    });

    // Existing Statsig tracking
    logEvent('search_page_viewed', 1, {
      has_initial_query: (!!searchQuery).toString(),
      initial_type_filter: filters.type || 'none',
      page_number: (filters.page || 1).toString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackPageView, trackEvent, advancedFiltersEnabled]);

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
  }, [filters, searchQuery, logEvent]);
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
  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    setSearchQuery('');
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
      searchQuery
  );

  return (
    <SearchContainer>
      <SearchHeader>
        <h1>Find Your Perfect Pet</h1>
        <p>
          Search through thousands of loving pets waiting for their forever homes. Use the filters
          below to find exactly what you&apos;re looking for.
        </p>
      </SearchHeader>

      {/* Search Filters */}
      <FiltersCard>
        <FiltersGrid>
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

          <TextInput
            label='Location'
            value={filters.location || ''}
            onChange={e => handleFilterChange('location', e.target.value)}
            placeholder='City, State, or ZIP code'
          />
        </FiltersGrid>

        <FilterActions>
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          <Button onClick={loadPets}>Search</Button>
        </FilterActions>
      </FiltersCard>

      {/* Search Results */}
      <SearchResults>
        <ResultsHeader>
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
        </ResultsHeader>

        {isLoading ? (
          <LoadingContainer>
            <Spinner size='lg' />
          </LoadingContainer>
        ) : error ? (
          <EmptyState>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <Button onClick={loadPets}>Try Again</Button>
          </EmptyState>
        ) : !pets || pets.length === 0 ? (
          <EmptyState>
            <h3>No pets found</h3>
            <p>Try adjusting your search criteria or clearing some filters to see more results.</p>
            {hasActiveFilters && <Button onClick={clearFilters}>Clear All Filters</Button>}
          </EmptyState>
        ) : (
          <PetGrid>{pets && pets.map(pet => <PetCard key={pet.pet_id} pet={pet} />)}</PetGrid>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination>
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
          </Pagination>
        )}
      </SearchResults>
    </SearchContainer>
  );
};
