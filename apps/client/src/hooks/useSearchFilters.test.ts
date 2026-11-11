import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from 'react-router';
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

describe('useSearchFilters inside a router', () => {
  it('does not write its filters into the URL again when the location changes', () => {
    // The search page stays mounted while the next lazy route loads, so the
    // hook is still alive when the location changes.
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(MemoryRouter, { initialEntries: ['/search'] }, children);

    const { result } = renderHook(
      () => {
        const [searchParams, setSearchParams] = useSearchParams();
        useSearchFilters(searchParams, setSearchParams);
        return { location: useLocation(), navigate: useNavigate() };
      },
      { wrapper }
    );
    expect(result.current.location.pathname).toBe('/search');
    expect(result.current.location.search).toBe('?sortBy=createdAt&sortOrder=desc');

    act(() => {
      result.current.navigate('/favorites');
    });

    // Its filter params must not be written onto the page that was navigated to.
    expect(result.current.location.pathname).toBe('/favorites');
    expect(result.current.location.search).toBe('');
  });
});
