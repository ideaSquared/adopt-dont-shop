import { useState, useEffect, useRef } from 'react';
import { type PetSearchFilters } from '@/services';
import { isKnownSortBy, isKnownSortOrder } from '../pages/searchOptions';

const DEFAULT_SORT_BY = 'createdAt';
const DEFAULT_SORT_ORDER = 'desc';

type UseSearchFiltersReturn = {
  filters: PetSearchFilters;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleFilterChange: (field: keyof PetSearchFilters, value: string) => void;
  handleSortChange: (value: string) => void;
  handlePageChange: (page: number) => void;
  clearFilters: () => void;
};

export const useSearchFilters = (
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void
): UseSearchFiltersReturn => {
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
    sortBy: isKnownSortBy(initialSortByParam) ? (initialSortByParam as string) : DEFAULT_SORT_BY,
    sortOrder: isKnownSortOrder(initialSortOrderParam) ? initialSortOrderParam : DEFAULT_SORT_ORDER,
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // react-router hands out a new setSearchParams on every location change. Keep
  // it out of the effect's dependencies: the page can stay mounted while the
  // next route loads, and a re-run then writes these params onto the old URL.
  const setSearchParamsRef = useRef(setSearchParams);
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams;
    searchParamsRef.current = searchParams;
  });

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
    // The default sort is implied, so leave it out of the URL.
    const isDefaultSort =
      filters.sortBy === DEFAULT_SORT_BY && filters.sortOrder === DEFAULT_SORT_ORDER;
    if (filters.sortBy && !isDefaultSort) {
      params.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder && !isDefaultSort) {
      params.set('sortOrder', filters.sortOrder);
    }

    // Write only when the URL would change. A write on mount can land after the
    // visitor has already clicked away (the page commits during the next
    // navigation) and would drag them back to /search.
    if (params.toString() === searchParamsRef.current.toString()) {
      return;
    }

    // Replace, don't push: filter state is not a navigation, so it must not
    // add a history entry (on mount or on every filter change).
    setSearchParamsRef.current(params, { replace: true });
  }, [filters, searchQuery]);

  const handleFilterChange = (field: keyof PetSearchFilters, value: string) => {
    const coerced = field === 'maxDistance' ? (value ? parseInt(value, 10) : undefined) : value;
    setFilters(prev => ({ ...prev, [field]: coerced, page: 1 }));
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' });
    setSearchQuery('');
  };

  return {
    filters,
    searchQuery,
    setSearchQuery,
    handleFilterChange,
    handleSortChange,
    handlePageChange,
    clearFilters,
  };
};
