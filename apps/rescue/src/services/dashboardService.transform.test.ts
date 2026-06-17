/**
 * Behaviour tests for the dashboard service's data transformation. The backend
 * returns sparse, evolving metrics; the service must derive an adoption rate,
 * fall back to sensible defaults / estimates, and normalise activity and
 * notification rows for the dashboard widgets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
}));

const notificationsServiceMock = vi.hoisted(() => ({
  markAsRead: vi.fn<(ids: string[]) => Promise<void>>(),
  getUserNotifications: vi.fn(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
  notificationsService: notificationsServiceMock,
}));

import { DashboardService } from './dashboardService';

describe('DashboardService transforms', () => {
  const service = new DashboardService();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRescueDashboardData', () => {
    it('derives the adoption rate and maps backend metrics', async () => {
      apiServiceMock.get.mockResolvedValue({
        success: true,
        message: '',
        data: {
          totalAnimals: 10,
          adoptedPets: 5,
          availableForAdoption: 4,
          pendingApplications: 3,
          recentAdoptions: 6,
          totalApplications: 12,
        },
      });

      const result = await service.getRescueDashboardData();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/dashboard/rescue');
      expect(result.totalPets).toBe(10);
      expect(result.adoptionRate).toBe(50);
      expect(result.pendingApplications).toBe(3);
      expect(result.totalApplications).toBe(12);
      expect(result.successfulAdoptions).toBe(6);
    });

    it('falls back to estimates and defaults when metrics are missing', async () => {
      apiServiceMock.get.mockResolvedValue({
        success: true,
        message: '',
        data: { recentAdoptions: 10, totalAnimals: 100 },
      });

      const result = await service.getRescueDashboardData();

      expect(result.adoptionRate).toBe(0);
      expect(result.averageRating).toBe(4.8);
      expect(result.monthlyAdoptions).toHaveLength(6);
      expect(result.monthlyAdoptions[5]).toEqual({ month: 'Jun', adoptions: 10 });
      expect(result.petTypeDistribution).toEqual([
        { name: 'Dogs', value: 70 },
        { name: 'Cats', value: 25 },
        { name: 'Other', value: 5 },
      ]);
    });

    it('prefers backend-supplied distributions when present', async () => {
      const custom = [{ name: 'Available', value: 9, color: '#000' }];
      apiServiceMock.get.mockResolvedValue({
        success: true,
        message: '',
        data: { totalAnimals: 10, petStatusDistribution: custom },
      });

      const result = await service.getRescueDashboardData();

      expect(result.petStatusDistribution).toBe(custom);
    });

    it('rethrows when the dashboard request fails', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('server down'));

      await expect(service.getRescueDashboardData()).rejects.toThrow('server down');
    });
  });

  describe('getRecentActivities', () => {
    it('normalises activity rows into display items', async () => {
      apiServiceMock.get.mockResolvedValue({
        success: true,
        message: '',
        data: {
          recentActivity: [
            {
              id: 'a1',
              timestamp: '2024-01-01T00:00:00Z',
              type: 'adoption',
              description: 'Buddy was adopted',
              metadata: { petId: 'p1', applicationId: 'app1' },
            },
          ],
        },
      });

      const [activity] = await service.getRecentActivities();

      expect(activity.id).toBe('a1');
      expect(activity.message).toBe('Buddy was adopted');
      expect(activity.timestamp).toBeInstanceOf(Date);
      expect(activity.petId).toBe('p1');
      expect(activity.applicationId).toBe('app1');
    });

    it('returns an empty list when there is no recent activity', async () => {
      apiServiceMock.get.mockResolvedValue({ success: true, message: '', data: {} });

      await expect(service.getRecentActivities()).resolves.toEqual([]);
    });

    it('returns an empty list on error rather than throwing', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));

      await expect(service.getRecentActivities()).resolves.toEqual([]);
    });
  });

  describe('getDashboardNotifications', () => {
    it('normalises notification rows and read status', async () => {
      notificationsServiceMock.getUserNotifications.mockResolvedValue({
        data: [
          {
            id: 'n1',
            title: 'New application',
            body: 'A new applicant',
            createdAt: '2024-01-01T00:00:00Z',
            category: 'application',
            status: 'read',
            actionUrl: '/apps/1',
          },
        ],
      });

      const [notification] = await service.getDashboardNotifications('u1');

      expect(notification.title).toBe('New application');
      expect(notification.message).toBe('A new applicant');
      expect(notification.read).toBe(true);
      expect(notification.type).toBe('application');
      expect(notification.actionUrl).toBe('/apps/1');
    });

    it('returns an empty array when notifications fail to load', async () => {
      notificationsServiceMock.getUserNotifications.mockRejectedValue(new Error('x'));

      await expect(service.getDashboardNotifications('u1')).resolves.toEqual([]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('marks a single notification as read', async () => {
      notificationsServiceMock.markAsRead.mockResolvedValue(undefined);

      await service.markNotificationAsRead('n1');

      expect(notificationsServiceMock.markAsRead).toHaveBeenCalledWith(['n1']);
    });

    it('rethrows when marking as read fails', async () => {
      notificationsServiceMock.markAsRead.mockRejectedValue(new Error('x'));

      await expect(service.markNotificationAsRead('n1')).rejects.toThrow('x');
    });
  });
});
