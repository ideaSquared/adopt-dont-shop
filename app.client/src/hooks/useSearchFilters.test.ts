import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchFilters } from './useSearchFilters';

const mockSetSearchParams = vi.fn();

const buildSearchParams = (params: Record<string, string> = {}) => new URLSearchParams(params);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('useSearchFilters', () => {
  it('initialises filters from searchParams', () => {
    const searchParams = buildSearchParams({
      type: 'dog',
      size: 'large',
      sortBy: 'name',
      sortOrder: 'asc',
      page: '3',
      q: 'buddy',
    });

    const { result } = renderHook(() => useSearchFilters(searchParams, mockSetSearchParams));

    expect(result.current.filters.type).toBe('dog');
    expect(result.current.filters.size).toBe('large');
    expect(result.current.filters.sortBy).toBe('name');
    expect(result.current.filters.sortOrder).toBe('asc');
    expect(result.current.filters.page).toBe(3);
    expect(result.current.searchQuery).toBe('buddy');
  });

  it('defaults to createdAt/desc sort when params are invalid', () => {
    const searchParams = buildSearchParams({ sortBy: 'invalid', sortOrder: 'bad' });

    const { result } = renderHook(() => useSearchFilters(searchParams, mockSetSearchParams));

    expect(result.current.filters.sortBy).toBe('createdAt');
    expect(result.current.filters.sortOrder).toBe('desc');
  });

  it('handleFilterChange resets page to 1', () => {
    const searchParams = buildSearchParams({ page: '5' });
    const { result } = renderHook(() => useSearchFilters(searchParams, mockSetSearchParams));

    act(() => {
      result.current.handleFilterChange('type', 'cat');
    });

    expect(result.current.filters.type).toBe('cat');
    expect(result.current.filters.page).toBe(1);
  });

  it('handleFilterChange parses maxDistance as a number', () => {
    const { result } = renderHook(() => useSearchFilters(buildSearchParams(), mockSetSearchParams));

    act(() => {
      result.current.handleFilterChange('maxDistance', '10');
    });

    expect(result.current.filters.maxDistance).toBe(10);
  });

  it('handleFilterChange sets maxDistance to undefined when value is empty', () => {
    const { result } = renderHook(() => useSearchFilters(buildSearchParams(), mockSetSearchParams));

    act(() => {
      result.current.handleFilterChange('maxDistance', '');
    });

    expect(result.current.filters.maxDistance).toBeUndefined();
  });

  it('handleSortChange parses "sortBy:sortOrder" format', () => {
    const { result } = renderHook(() => useSearchFilters(buildSearchParams(), mockSetSearchParams));

    act(() => {
      result.current.handleSortChange('name:asc');
    });

    expect(result.current.filters.sortBy).toBe('name');
    expect(result.current.filters.sortOrder).toBe('asc');
    expect(result.current.filters.page).toBe(1);
  });

  it('handlePageChange updates page and scrolls to top', () => {
    const { result } = renderHook(() => useSearchFilters(buildSearchParams(), mockSetSearchParams));

    act(() => {
      result.current.handlePageChange(4);
    });

    expect(result.current.filters.page).toBe(4);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('clearFilters resets filters and searchQuery', () => {
    const searchParams = buildSearchParams({ type: 'dog', q: 'rex', page: '3' });
    const { result } = renderHook(() => useSearchFilters(searchParams, mockSetSearchParams));

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.type).toBeFalsy();
    expect(result.current.filters.page).toBe(1);
    expect(result.current.searchQuery).toBe('');
  });
});
