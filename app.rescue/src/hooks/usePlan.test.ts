import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLAN_LIMITS, type RescuePlan } from '@adopt-dont-shop/lib.types';

const authState = vi.hoisted(() => ({
  current: { user: { rescueId: 'rescue-1' } as { rescueId?: string } | null },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => authState.current,
}));

const queryState = vi.hoisted(() => ({
  data: undefined as RescuePlan | undefined,
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: queryState.data,
    isLoading: queryState.isLoading,
    error: queryState.error,
  }),
}));

vi.mock('../services/libraryServices', () => ({
  apiService: { get: vi.fn() },
}));

import { usePlan } from './usePlan';

describe('usePlan', () => {
  beforeEach(() => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.error = null;
    authState.current = { user: { rescueId: 'rescue-1' } };
  });

  describe('when plan data is loaded', () => {
    it('returns free plan defaults when no data', () => {
      const { result } = renderHook(() => usePlan());
      expect(result.current.plan).toBe('free');
      expect(result.current.planLimits).toEqual(PLAN_LIMITS.free);
    });

    it('returns growth plan with correct limits', () => {
      queryState.data = 'growth';
      const { result } = renderHook(() => usePlan());
      expect(result.current.plan).toBe('growth');
      expect(result.current.planLimits).toEqual(PLAN_LIMITS.growth);
    });

    it('returns professional plan with correct limits', () => {
      queryState.data = 'professional';
      const { result } = renderHook(() => usePlan());
      expect(result.current.plan).toBe('professional');
      expect(result.current.planLimits).toEqual(PLAN_LIMITS.professional);
    });
  });

  describe('hasFeature', () => {
    it('returns false for analytics on free plan', () => {
      queryState.data = 'free';
      const { result } = renderHook(() => usePlan());
      expect(result.current.hasFeature('analytics')).toBe(false);
    });

    it('returns true for analytics on growth plan', () => {
      queryState.data = 'growth';
      const { result } = renderHook(() => usePlan());
      expect(result.current.hasFeature('analytics')).toBe(true);
    });

    it('returns false for custom_questions on growth plan', () => {
      queryState.data = 'growth';
      const { result } = renderHook(() => usePlan());
      expect(result.current.hasFeature('custom_questions')).toBe(false);
    });

    it('returns true for all features on professional plan', () => {
      queryState.data = 'professional';
      const { result } = renderHook(() => usePlan());
      expect(result.current.hasFeature('analytics')).toBe(true);
      expect(result.current.hasFeature('analytics_export')).toBe(true);
      expect(result.current.hasFeature('custom_questions')).toBe(true);
      expect(result.current.hasFeature('bulk_operations')).toBe(true);
      expect(result.current.hasFeature('scheduled_reports')).toBe(true);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true while fetching', () => {
      queryState.isLoading = true;
      const { result } = renderHook(() => usePlan());
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error message when query fails', () => {
      queryState.error = new Error('Network error');
      const { result } = renderHook(() => usePlan());
      expect(result.current.error).toBe('Network error');
    });

    it('returns null error when query succeeds', () => {
      queryState.data = 'growth';
      const { result } = renderHook(() => usePlan());
      expect(result.current.error).toBeNull();
    });
  });

  describe('when user has no rescue', () => {
    it('defaults to free plan', () => {
      authState.current = { user: null };
      const { result } = renderHook(() => usePlan());
      expect(result.current.plan).toBe('free');
    });
  });
});
