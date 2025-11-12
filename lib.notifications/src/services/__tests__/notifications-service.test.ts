import { NotificationsService } from '../notifications-service';
import { apiService } from '@adopt-dont-shop/lib-api';
import {
  NotificationRequest,
  BulkNotificationRequest,
  NotificationFilters,
  NotificationPreferences,
} from '../../types';

// Mock lib.api
jest.mock('@adopt-dont-shop/lib-api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    fetchWithAuth: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    isAuthenticated: jest.fn(),
    updateConfig: jest.fn(),
  },
  ApiService: jest.fn().mockImplementation(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    fetchWithAuth: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    isAuthenticated: jest.fn(),
    updateConfig: jest.fn(),
  })),
}));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockApiService: any;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    service = new NotificationsService({
      debug: false,
    });

    mockApiService = service['apiService'];
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('notification delivery', () => {
    describe('sendNotification', () => {
      it('should send a single notification', async () => {
        const notificationRequest: NotificationRequest = {
          userId: 'user123',
          title: 'Test Notification',
          message: 'This is a test',
          category: 'adoption_update',
          priority: 'normal',
          channels: ['in-app', 'email'],
        };

        const mockResponse = {
          data: { id: 'notif123', ...notificationRequest, status: 'sent' },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.sendNotification(notificationRequest);

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/api/v1/notifications',
          notificationRequest
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle notification send errors', async () => {
        const notificationRequest: NotificationRequest = {
          userId: 'user123',
          title: 'Test Notification',
          message: 'This is a test',
          category: 'adoption_update',
        };

        const error = new Error('Send failed');
        mockApiService.post = jest.fn().mockRejectedValue(error);

        await expect(service.sendNotification(notificationRequest)).rejects.toThrow('Send failed');
      });
    });

    describe('sendBulkNotifications', () => {
      it('should send bulk notifications', async () => {
        const bulkRequest: BulkNotificationRequest = {
          userIds: ['user1', 'user2', 'user3'],
          title: 'Bulk Notification',
          message: 'This is a bulk test',
          category: 'system_alert',
          priority: 'high',
        };

        const mockResponse = {
          data: {
            totalRequested: 3,
            successful: 3,
            failed: 0,
            notifications: [
              { id: 'notif1', userId: 'user1', status: 'created' },
              { id: 'notif2', userId: 'user2', status: 'created' },
              { id: 'notif3', userId: 'user3', status: 'created' },
            ],
          },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.sendBulkNotifications(bulkRequest);

        expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/notifications/bulk', bulkRequest);
        expect(result.data.totalRequested).toBe(3);
        expect(result.data.successful).toBe(3);
      });
    });

    describe('scheduleNotification', () => {
      it('should schedule a notification for future delivery', async () => {
        const notificationRequest: NotificationRequest = {
          userId: 'user123',
          title: 'Scheduled Notification',
          message: 'This is scheduled',
          category: 'reminder',
        };

        const scheduledFor = new Date(Date.now() + 60000); // 1 minute from now
        const mockResponse = {
          data: { id: 'notif123', ...notificationRequest, scheduledFor, status: 'pending' },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.scheduleNotification(notificationRequest, scheduledFor);

        expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/notifications/schedule', {
          ...notificationRequest,
          scheduledFor,
        });
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('notification management', () => {
    describe('getUserNotifications', () => {
      it('should get user notifications with filters', async () => {
        const userId = 'user123';
        const filters: NotificationFilters = {
          page: 1,
          limit: 10,
          category: 'adoption_update',
          unreadOnly: true,
        };

        const mockResponse = {
          data: [
            { id: 'notif1', userId, title: 'Test 1', status: 'delivered' },
            { id: 'notif2', userId, title: 'Test 2', status: 'read' },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getUserNotifications(userId, filters);

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/notifications/user/user123?page=1&limit=10&category=adoption_update&unreadOnly=true'
        );
        expect(result.data).toHaveLength(2);
      });

      it('should get user notifications without filters', async () => {
        const userId = 'user123';
        const mockResponse = {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getUserNotifications(userId);

        expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/notifications/user/user123');
        expect(result.data).toHaveLength(0);
      });
    });

    describe('markAsRead', () => {
      it('should mark notifications as read', async () => {
        const notificationIds = ['notif1', 'notif2', 'notif3'];
        const mockResponse = {
          data: { updated: 3 },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.patch = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.markAsRead(notificationIds);

        expect(mockApiService.patch).toHaveBeenCalledWith('/api/v1/notifications/mark-read', {
          notificationIds,
        });
        expect(result.data.updated).toBe(3);
      });
    });

    describe('markAllAsRead', () => {
      it('should mark all notifications as read for a user', async () => {
        const userId = 'user123';
        const mockResponse = {
          data: { updated: 5 },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.patch = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.markAllAsRead(userId);

        expect(mockApiService.patch).toHaveBeenCalledWith(
          '/api/v1/notifications/user/user123/mark-all-read'
        );
        expect(result.data.updated).toBe(5);
      });
    });

    describe('deleteNotification', () => {
      it('should delete a notification', async () => {
        const notificationId = 'notif123';
        const mockResponse = {
          data: { deleted: true },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.delete = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.deleteNotification(notificationId);

        expect(mockApiService.delete).toHaveBeenCalledWith('/api/v1/notifications/notif123');
        expect(result.data.deleted).toBe(true);
      });
    });
  });

  describe('preference management', () => {
    describe('getUserPreferences', () => {
      it('should get user notification preferences', async () => {
        const userId = 'user123';
        const mockPreferences: NotificationPreferences = {
          userId,
          channels: {
            'in-app': { enabled: true, categories: ['adoption_update', 'message_received'] },
            email: { enabled: true, categories: ['adoption_update'] },
            push: { enabled: false, categories: [] },
            sms: { enabled: false, categories: [] },
          },
          updatedAt: new Date().toISOString(),
        };

        const mockResponse = {
          data: mockPreferences,
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getUserPreferences(userId);

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/notifications/preferences/user123'
        );
        expect(result.data.userId).toBe(userId);
      });
    });

    describe('setDoNotDisturb', () => {
      it('should set do not disturb period', async () => {
        const userId = 'user123';
        const startTime = '22:00';
        const endTime = '08:00';

        const mockResponse = {
          data: {
            userId,
            doNotDisturb: { enabled: true, startTime, endTime },
            channels: {},
            updatedAt: new Date().toISOString(),
          },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.patch = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.setDoNotDisturb(userId, startTime, endTime);

        expect(mockApiService.patch).toHaveBeenCalledWith(
          '/api/v1/notifications/preferences/user123/dnd',
          {
            doNotDisturb: { enabled: true, startTime, endTime },
          }
        );
        expect(result.data.doNotDisturb?.enabled).toBe(true);
      });
    });
  });

  describe('analytics', () => {
    describe('getUnreadCount', () => {
      it('should get unread notification count', async () => {
        const userId = 'user123';
        const mockResponse = {
          data: { count: 5 },
          success: true,
          timestamp: new Date().toISOString(),
        };

        mockApiService.get = jest.fn().mockResolvedValue(mockResponse);

        const result = await service.getUnreadCount(userId);

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/notifications/user/user123/unread-count'
        );
        expect(result.data.count).toBe(5);
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({});

      const result = await service.healthCheck();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/health');
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockApiService.get = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});
