/**
 * Behaviour test for the rescue application list hook.
 *
 * ADS-1326: the hook used to also subscribe to `useRealtimeAnalytics`
 * (`application_created` / `application_updated`) as a live-update fast
 * path (ADS C4-6), but the gateway never emits those events — no WS
 * namespace for them exists — so the subscription was permanently inert.
 * It's removed; a manual `refetch()` (already exposed) is the only way to
 * force a refresh now, same as it always effectively was in production.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The module-level singleton in useApplications.ts is constructed at import
// time, so the mock class must not reference any test-scope variable in a
// class-field initializer (those run at construction and would hit the TDZ).
// Using a prototype method defers the reference until the method is called.
vi.mock('../services/applicationService', () => {
  const mockFn = vi.fn();
  return {
    RescueApplicationService: class {
      // Expose the underlying vi.fn so tests can reach it via the class.
      static _getApplicationsMock = mockFn;
      getApplications = mockFn;
    },
  };
});

import { useApplications } from './useApplications';
import { RescueApplicationService } from '../services/applicationService';

// Reach the shared vi.fn through the static property set in the mock factory.
const getApplicationsMock = (
  RescueApplicationService as unknown as { _getApplicationsMock: ReturnType<typeof vi.fn> }
)._getApplicationsMock;

describe('useApplications', () => {
  beforeEach(() => {
    getApplicationsMock.mockReset();
    getApplicationsMock.mockResolvedValue({ applications: [], total: 0, totalPages: 0 });
  });

  it('fetches applications on mount', async () => {
    renderHook(() => useApplications());

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches when the filter changes and resets to page 1', async () => {
    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.changePage(2);
    });
    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(2);
    });

    act(() => {
      result.current.updateFilter({ status: ['submitted'] });
    });

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(3);
    });
    expect(result.current.pagination.page).toBe(1);
  });

  it('exposes a manual refetch that re-runs the last query', async () => {
    const { result } = renderHook(() => useApplications());

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(getApplicationsMock).toHaveBeenCalledTimes(2);
  });
});
