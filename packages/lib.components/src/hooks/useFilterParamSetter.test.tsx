import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router';
import { describe, it, expect } from 'vitest';
import { useFilterParamSetter, type FilterParamSetterOptions } from './useFilterParamSetter';

const renderFilters = (initialUrl: string, options?: FilterParamSetterOptions) =>
  renderHook(
    () => {
      const [searchParams, setSearchParams] = useSearchParams();
      return { searchParams, setFilter: useFilterParamSetter(setSearchParams, options) };
    },
    {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
      ),
    }
  );

describe('useFilterParamSetter', () => {
  it('sets a filter in the query string and keeps the others', () => {
    const { result } = renderFilters('/?status=open');

    act(() => result.current.setFilter('severity', 'high'));

    expect(result.current.searchParams.get('severity')).toBe('high');
    expect(result.current.searchParams.get('status')).toBe('open');
  });

  it.each(['all', ''])('removes the filter when the value is %j', value => {
    const { result } = renderFilters('/?status=open');

    act(() => result.current.setFilter('status', value));

    expect(result.current.searchParams.has('status')).toBe(false);
  });

  it('keeps the page param by default', () => {
    const { result } = renderFilters('/?page=3');

    act(() => result.current.setFilter('status', 'open'));

    expect(result.current.searchParams.get('page')).toBe('3');
  });

  it('returns to the first page when resetPage is set', () => {
    const { result } = renderFilters('/?page=3&status=open', { resetPage: true });

    act(() => result.current.setFilter('status', 'closed'));

    expect(result.current.searchParams.has('page')).toBe(false);
    expect(result.current.searchParams.get('status')).toBe('closed');
  });
});
