import { useState, useEffect } from 'react';
import { type PetSearchFilters } from '@/services';
import { isKnownSortBy, isKnownSortOrder } from '../pages/searchOptions';

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
  setSearchParams: (params: URLSearchParams) => void
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
    sortBy: isKnownSortBy(initialSortByParam) ? (initialSortByParam as string) : 'createdAt',
    sortOrder: isKnownSortOrder(initialSortOrderParam) ? initialSortOrderParam : 'desc',
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('q', searchQuery);
    if (filters.type) params.set('type', filters.type);
    if (filters.breed) params.set('breed', filters.breed);
    if (filters.size) params.set('size', filters.size);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.ageGroup) params.set('ageGroup', filters.ageGroup);
    if (filters.status) params.set('status', filters.status);
    if (filters.location) params.set('location', filters.location);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

    setSearchParams(params);
  }, [filters, searchQuery, setSearchParams]);

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
