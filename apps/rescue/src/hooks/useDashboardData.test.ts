import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState = vi.hoisted(() => ({
  current: { user: { userId: 'u1' } as { userId?: string } | null },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => authState.current,
}));

const dashboardServiceMock = vi.hoisted(() => ({
  getRescueDashboardData: vi.fn(),
  getRecentActivities: vi.fn(),
  getDashboardNotifications: vi.fn(),
}));

vi.mock('../services', () => ({
  dashboardService: dashboardServiceMock,
}));

import { useDashboardData } from './useDashboardData';

/**
 * Behaviour tests for the dashboard data hook. It loads the rescue summary,
 * recent activity and notifications in parallel, passes the authenticated
 * userId through (never localStorage), and surfaces failures as an error.
 */
describe('useDashboardData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authState.current = { user: { userId: 'u1' } };
    dashboardServiceMock.getRescueDashboardData.mockResolvedValue({ totalPets: 3 });
    dashboardServiceMock.getRecentActivities.mockResolvedValue([{ id: 'a1' }]);
    dashboardServiceMock.getDashboardNotifications.mockResolvedValue([{ id: 'n1' }]);
  });

  it('loads dashboard data, activities and notifications in parallel', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dashboardData).toEqual({ totalPets: 3 });
    expect(result.current.recentActivities).toEqual([{ id: 'a1' }]);
    expect(result.current.notifications).toEqual([{ id: 'n1' }]);
    expect(result.current.error).toBeNull();
  });

  it('passes the authenticated userId to the notifications fetch', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(dashboardServiceMock.getDashboardNotifications).toHaveBeenCalledWith('u1');
  });

  it('passes an empty string when no user is signed in', async () => {
    authState.current = { user: null };

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(dashboardServiceMock.getDashboardNotifications).toHaveBeenCalledWith('');
  });

  it('surfaces the error message when a fetch fails', async () => {
    dashboardServiceMock.getRescueDashboardData.mockRejectedValue(new Error('server down'));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.error).toBe('server down'));
  });

  it('refetches on demand', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    dashboardServiceMock.getRescueDashboardData.mockResolvedValue({ totalPets: 9 });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.dashboardData).toEqual({ totalPets: 9 });
  });
});
