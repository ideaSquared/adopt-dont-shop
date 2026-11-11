import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppliedSearchQuery } from './useAppliedSearchQuery';

describe('useAppliedSearchQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until typing pauses before applying the search', () => {
    const { result, rerender } = renderHook(({ query }) => useAppliedSearchQuery(query), {
      initialProps: { query: '' },
    });

    rerender({ query: 'b' });
    rerender({ query: 'bu' });
    rerender({ query: 'bud' });
    expect(result.current.appliedQuery).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.appliedQuery).toBe('bud');
  });

  it('applies the typed search immediately when submitted', () => {
    const { result, rerender } = renderHook(({ query }) => useAppliedSearchQuery(query), {
      initialProps: { query: '' },
    });

    rerender({ query: 'buddy' });
    act(() => {
      result.current.submit();
    });

    expect(result.current.appliedQuery).toBe('buddy');
  });

  it('goes back to waiting for a pause once the search is edited again', () => {
    const { result, rerender } = renderHook(({ query }) => useAppliedSearchQuery(query), {
      initialProps: { query: 'buddy' },
    });
    act(() => {
      result.current.submit();
    });

    rerender({ query: 'buddy lab' });
    expect(result.current.appliedQuery).toBe('buddy');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.appliedQuery).toBe('buddy lab');
  });
});
