import { describe, it, expect, beforeEach } from 'vitest';
import {
  ANON_SWIPE_LIMIT,
  getAnonSwipeCount,
  hasReachedAnonSwipeLimit,
  incrementAnonSwipeCount,
  resetAnonSwipeBudget,
} from './anonSwipeBudget';

describe('anonSwipeBudget (ADS-625)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns 0 for the initial count', () => {
    expect(getAnonSwipeCount()).toBe(0);
  });

  it('increments the count and persists it to localStorage', () => {
    incrementAnonSwipeCount();
    incrementAnonSwipeCount();
    incrementAnonSwipeCount();
    expect(getAnonSwipeCount()).toBe(3);
  });

  it('treats garbage values in localStorage as 0', () => {
    window.localStorage.setItem('anon_swipe_budget.count', 'not a number');
    expect(getAnonSwipeCount()).toBe(0);
  });

  it('reports the limit reached only once the count meets the threshold', () => {
    expect(hasReachedAnonSwipeLimit(ANON_SWIPE_LIMIT - 1)).toBe(false);
    expect(hasReachedAnonSwipeLimit(ANON_SWIPE_LIMIT)).toBe(true);
    expect(hasReachedAnonSwipeLimit(ANON_SWIPE_LIMIT + 5)).toBe(true);
  });

  it('clears the count on resetAnonSwipeBudget', () => {
    for (let i = 0; i < 5; i += 1) {
      incrementAnonSwipeCount();
    }
    expect(getAnonSwipeCount()).toBe(5);
    resetAnonSwipeBudget();
    expect(getAnonSwipeCount()).toBe(0);
  });

  it('defaults the limit to 7 when no VITE_ANON_SWIPE_LIMIT override is supplied', () => {
    // The test runner's import.meta.env mock leaves VITE_ANON_SWIPE_LIMIT
    // undefined, so the resolved limit is the documented default.
    expect(ANON_SWIPE_LIMIT).toBe(7);
  });
});
