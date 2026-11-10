import { useQuery } from '@tanstack/react-query';
import { petService, type PetSearchFilters } from '@/services';
import type { useAnalytics } from '@/contexts/AnalyticsContext';
import type { useStatsig } from '@/hooks/useStatsig';

type LogEvent = ReturnType<typeof useStatsig>['logEvent'];
type TrackEvent = ReturnType<typeof useAnalytics>['trackEvent'];

type UseSearchPetsInput = {
  filters: PetSearchFilters;
  searchQuery: string;
  coordinates: Pick<PetSearchFilters, 'latitude' | 'longitude'> | null;
  logEvent: LogEvent;
  trackEvent: TrackEvent;
};

const hasAnyFilter = (filters: PetSearchFilters): boolean =>
  Object.values(filters).some(v => v && v !== '' && v !== 1);

/**
 * Pet search results for the current filters. Every execution (a filter change
 * or an explicit refetch from the Search button) reports its analytics events;
 * a change of filters starts a new query, so stale responses never overwrite
 * newer ones.
 */
export const useSearchPets = ({
  filters,
  searchQuery,
  coordinates,
  logEvent,
  trackEvent,
}: UseSearchPetsInput) => {
  const trimmedQuery = searchQuery.trim();
  const searchFilters: PetSearchFilters = {
    ...filters,
    ...(trimmedQuery && { search: trimmedQuery }),
    ...coordinates,
  };

  return useQuery({
    queryKey: ['pets', 'search', searchFilters],
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const queryLabel = searchQuery || 'none';
      const hasFilters = hasAnyFilter(filters);

      trackEvent({
        category: 'search',
        action: 'pet_search_executed',
        label: searchQuery ? 'query_search' : 'filter_search',
        sessionId: 'search-session',
        timestamp: new Date(),
        properties: {
          search_query: queryLabel,
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
          has_filters: hasFilters,
        },
      });

      logEvent('pet_search_executed', 1, {
        search_query: queryLabel,
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

      try {
        const response = await petService.searchPets(searchFilters);
        const results = response.data || [];

        trackEvent({
          category: 'search',
          action: 'pet_search_results',
          label: 'search_completed',
          value: results.length,
          sessionId: 'search-session',
          timestamp: new Date(),
          properties: {
            total_results: response.pagination?.total || 0,
            results_on_page: results.length,
            has_filters: hasFilters,
            search_query: queryLabel,
          },
        });

        logEvent('pet_search_results', results.length, {
          total_results: response.pagination?.total?.toString() || '0',
          results_on_page: results.length.toString(),
          has_filters: hasFilters ? 'true' : 'false',
          search_query: queryLabel,
        });

        return { pets: results, pagination: response.pagination || null };
      } catch (err) {
        console.error('Search error details:', err);
        logEvent('pet_search_error', 1, {
          error_message: err instanceof Error ? err.message : 'Unknown error',
          search_query: queryLabel,
          filters_applied: JSON.stringify(filters),
        });
        throw err;
      }
    },
  });
};
