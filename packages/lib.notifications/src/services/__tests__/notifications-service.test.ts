import { NotificationsService } from '../notifications-service';
import { apiService } from '@adopt-dont-shop/lib.api';
import {
  NotificationRequest,
  BulkNotificationRequest,
  NotificationFilters,
  NotificationPreferences,
} from '../../types';

// Mock lib.api
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    fetchWithAuth: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isAuthenticated: vi.fn(),
    updateConfig: vi.fn(),
  },
  ApiService: vi.fn().mockImplementation(function () {
    return {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      fetchWithAuth: vi.fn(),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isAuthenticated: vi.fn(),
      updateConfig: vi.fn(),
    };
  }),
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
    vi.clearAllMocks();
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

        mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

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
        mockApiService.post = vi.fn().mockRejectedValue(error);

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

        mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.patch = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.patch = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.delete = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.patch = vi.fn().mockResolvedValue(mockResponse);

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

        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

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
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.healthCheck();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/health');
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('notification management (additional)', () => {
    describe('getUserNotifications query-param building', () => {
      it('should omit undefined filter values from the query string', async () => {
        const filters: NotificationFilters = {
          page: 2,
          limit: undefined,
          status: 'read',
          priority: undefined,
        };

        mockApiService.get = vi.fn().mockResolvedValue({
          data: [],
          pagination: { page: 2, limit: 20, total: 0, totalPages: 0 },
          success: true,
          timestamp: new Date().toISOString(),
        });

        await service.getUserNotifications('user123', filters);

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/notifications/user/user123?page=2&status=read'
        );
      });

      it('should not append a query string when filters are empty', async () => {
        mockApiService.get = vi.fn().mockResolvedValue({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          success: true,
          timestamp: new Date().toISOString(),
        });

        await service.getUserNotifications('user123', {});

        expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/notifications/user/user123');
      });

      it('should propagate API errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('list failed'));

        await expect(service.getUserNotifications('user123')).rejects.toThrow('list failed');
      });
    });

    describe('getNotification', () => {
      it('should fetch a single notification by id', async () => {
        const mockResponse = {
          data: { id: 'notif123', title: 'A notification' },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.getNotification('notif123');

        expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/notifications/notif123');
        expect(result).toEqual(mockResponse);
      });

      it('should propagate fetch errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('not found'));

        await expect(service.getNotification('missing')).rejects.toThrow('not found');
      });
    });

    describe('markAsRead errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.patch = vi.fn().mockRejectedValue(new Error('patch failed'));

        await expect(service.markAsRead(['notif1'])).rejects.toThrow('patch failed');
      });
    });

    describe('markAllAsRead errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.patch = vi.fn().mockRejectedValue(new Error('mark-all failed'));

        await expect(service.markAllAsRead('user123')).rejects.toThrow('mark-all failed');
      });
    });

    describe('deleteNotification errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.delete = vi.fn().mockRejectedValue(new Error('delete failed'));

        await expect(service.deleteNotification('notif123')).rejects.toThrow('delete failed');
      });
    });
  });

  describe('preference management (additional)', () => {
    describe('getUserPreferences errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('prefs failed'));

        await expect(service.getUserPreferences('user123')).rejects.toThrow('prefs failed');
      });
    });

    describe('updatePreferences', () => {
      it('should update user notification preferences', async () => {
        const updates: Partial<NotificationPreferences> = {
          doNotDisturb: { enabled: false },
        };
        const mockResponse = {
          data: {
            userId: 'user123',
            channels: {},
            doNotDisturb: { enabled: false },
            updatedAt: new Date().toISOString(),
          },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.patch = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.updatePreferences('user123', updates);

        expect(mockApiService.patch).toHaveBeenCalledWith(
          '/api/v1/notifications/preferences/user123',
          updates
        );
        expect(result.data.doNotDisturb?.enabled).toBe(false);
      });

      it('should propagate API errors', async () => {
        mockApiService.patch = vi.fn().mockRejectedValue(new Error('update failed'));

        await expect(service.updatePreferences('user123', {})).rejects.toThrow('update failed');
      });
    });

    describe('setDoNotDisturb errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.patch = vi.fn().mockRejectedValue(new Error('dnd failed'));

        await expect(service.setDoNotDisturb('user123', '22:00', '08:00')).rejects.toThrow(
          'dnd failed'
        );
      });
    });
  });

  describe('template operations', () => {
    describe('getTemplates', () => {
      it('should fetch all templates', async () => {
        const mockResponse = {
          data: [
            { id: 'tpl1', name: 'Welcome' },
            { id: 'tpl2', name: 'Reminder' },
          ],
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.getTemplates();

        expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/notifications/templates');
        expect(result.data).toHaveLength(2);
      });

      it('should propagate API errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('templates failed'));

        await expect(service.getTemplates()).rejects.toThrow('templates failed');
      });
    });

    describe('processTemplate', () => {
      it('should process a template with variables', async () => {
        const variables = { name: 'Rex', shelter: 'Happy Tails' };
        const mockResponse = {
          data: { title: 'Hi Rex', message: 'Welcome to Happy Tails' },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.processTemplate('tpl1', variables);

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/api/v1/notifications/templates/tpl1/process',
          { variables }
        );
        expect(result.data.title).toBe('Hi Rex');
      });

      it('should propagate API errors', async () => {
        mockApiService.post = vi.fn().mockRejectedValue(new Error('process failed'));

        await expect(service.processTemplate('tpl1', {})).rejects.toThrow('process failed');
      });
    });

    describe('previewTemplate', () => {
      it('should preview a template with sample data', async () => {
        const sampleData = { name: 'Rex' };
        const mockResponse = {
          data: { title: 'Hi Rex', message: 'Sample', html: '<p>Hi Rex</p>' },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.previewTemplate('tpl1', sampleData);

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/api/v1/notifications/templates/tpl1/preview',
          { sampleData }
        );
        expect(result.data.html).toBe('<p>Hi Rex</p>');
      });

      it('should propagate API errors', async () => {
        mockApiService.post = vi.fn().mockRejectedValue(new Error('preview failed'));

        await expect(service.previewTemplate('tpl1', {})).rejects.toThrow('preview failed');
      });
    });
  });

  describe('analytics (additional)', () => {
    describe('getStats', () => {
      it('should fetch global stats when no userId is given', async () => {
        const mockResponse = {
          data: { totalSent: 100, totalDelivered: 90, totalRead: 50 },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

        const result = await service.getStats();

        expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/notifications/stats');
        expect(result.data.totalSent).toBe(100);
      });

      it('should scope stats to a user when userId is given', async () => {
        const mockResponse = {
          data: { totalSent: 5, totalDelivered: 5, totalRead: 2 },
          success: true,
          timestamp: new Date().toISOString(),
        };
        mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

        await service.getStats('user123');

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/notifications/stats?userId=user123'
        );
      });

      it('should propagate API errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('stats failed'));

        await expect(service.getStats()).rejects.toThrow('stats failed');
      });
    });

    describe('getUnreadCount errors', () => {
      it('should propagate API errors', async () => {
        mockApiService.get = vi.fn().mockRejectedValue(new Error('count failed'));

        await expect(service.getUnreadCount('user123')).rejects.toThrow('count failed');
      });
    });
  });

  describe('debug logging', () => {
    it('should log failures to console.error when debug is enabled', async () => {
      const debugService = new NotificationsService({ debug: true });
      const debugApi: any = debugService['apiService'];
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      debugApi.post = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(
        debugService.sendNotification({
          userId: 'user123',
          title: 'T',
          message: 'M',
          category: 'system_alert',
        })
      ).rejects.toThrow('boom');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('sendNotification failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not log to console.error when debug is disabled', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApiService.post = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(
        service.sendNotification({
          userId: 'user123',
          title: 'T',
          message: 'M',
          category: 'system_alert',
        })
      ).rejects.toThrow('boom');

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log to console.error on failed health check when debug is enabled', async () => {
      const debugService = new NotificationsService({ debug: true });
      const debugApi: any = debugService['apiService'];
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      debugApi.get = vi.fn().mockRejectedValue(new Error('down'));

      const result = await debugService.healthCheck();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('health check failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
