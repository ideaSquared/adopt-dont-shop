/**
 * DashboardService.getDashboardNotifications — userId parameter
 *
 * The method must accept userId as a parameter and pass it to the underlying
 * notifications service. It must NOT fall back to localStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUserNotificationsMock = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({ success: true, data: {}, message: '' }),
  },
  notificationsService: {
    getUserNotifications: (...args: unknown[]) => getUserNotificationsMock(...args),
    markAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

import { DashboardService } from './dashboardService';

describe('DashboardService.getDashboardNotifications', () => {
  const service = new DashboardService();

  beforeEach(() => {
    getUserNotificationsMock.mockReset();
    getUserNotificationsMock.mockResolvedValue({ data: [] });
  });

  it('passes the provided userId to notificationsService', async () => {
    await service.getDashboardNotifications('user-abc');

    expect(getUserNotificationsMock).toHaveBeenCalledWith(
      'user-abc',
      expect.objectContaining({ unreadOnly: true })
    );
  });

  it('returns an empty array when userId is an empty string', async () => {
    const result = await service.getDashboardNotifications('');
    expect(result).toEqual([]);
    expect(getUserNotificationsMock).not.toHaveBeenCalled();
  });

  it('never reads from localStorage', async () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem');
    await service.getDashboardNotifications('user-xyz');
    expect(getSpy).not.toHaveBeenCalled();
    getSpy.mockRestore();
  });
});
