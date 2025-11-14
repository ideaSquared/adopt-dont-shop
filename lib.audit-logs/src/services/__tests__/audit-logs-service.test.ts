import { AuditLogsService } from '../audit-logs-service';
import { api } from '@adopt-dont-shop/lib.api';
import { AuditLogLevel, AuditLogStatus } from '../../types';

jest.mock('@adopt-dont-shop/lib.api');

describe('AuditLogsService', () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    const mockResponse = {
      success: true,
      data: [
        {
          id: 1,
          service: 'adopt-dont-shop-backend',
          user: 'user-123',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          userType: 'admin',
          action: 'LOGIN',
          level: 'INFO' as const,
          status: 'success' as const,
          timestamp: new Date('2025-01-05T10:00:00Z'),
          metadata: {
            entity: 'user',
            entityId: 'user-123',
            ipAddress: '192.168.1.1',
          },
          category: 'AUTH',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        pages: 1,
      },
    };

    it('should fetch audit logs with default 7-day date range', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await AuditLogsService.getAuditLogs();

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      const callArgs = mockApi.get.mock.calls[0][0];
      expect(callArgs).toContain('/api/v1/admin/audit-logs');
      expect(callArgs).toContain('startDate=');
      expect(callArgs).toContain('endDate=');

      expect(result).toEqual(mockResponse);
    });

    it('should apply custom filters', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await AuditLogsService.getAuditLogs({
        action: 'LOGIN',
        userId: 'user-123',
        entity: 'user',
        level: AuditLogLevel.INFO,
        status: AuditLogStatus.SUCCESS,
        page: 2,
        limit: 25,
      });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('action=LOGIN'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('userId=user-123'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('entity=user'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('level=INFO'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('status=success'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=25'));
    });

    it('should use custom date range when provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await AuditLogsService.getAuditLogs({
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T23:59:59Z',
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2025-01-01T00:00:00Z')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2025-01-07T23:59:59Z')
      );
    });

    it('should handle pagination correctly', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await AuditLogsService.getAuditLogs({
        page: 3,
        limit: 100,
      });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=3'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=100'));
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('should handle API errors', async () => {
      const error = new Error('API request failed');
      mockApi.get.mockRejectedValue(error);

      await expect(AuditLogsService.getAuditLogs()).rejects.toThrow('API request failed');
    });

    it('should format dates correctly in query parameters', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-07T23:59:59Z');

      await AuditLogsService.getAuditLogs({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const callArgs = mockApi.get.mock.calls[0][0];
      expect(callArgs).toContain('startDate=2025-01-01T00:00:00.000Z');
      expect(callArgs).toContain('endDate=2025-01-07T23:59:59.000Z');
    });

    it('should only include provided filters in query string', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await AuditLogsService.getAuditLogs({
        action: 'LOGIN',
      });

      const callArgs = mockApi.get.mock.calls[0][0];
      expect(callArgs).toContain('action=LOGIN');
      expect(callArgs).not.toContain('userId=');
      expect(callArgs).not.toContain('entity=');
      expect(callArgs).not.toContain('level=');
      expect(callArgs).not.toContain('status=');
    });

    it('should calculate 7-day default date range correctly', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const beforeCall = new Date();
      await AuditLogsService.getAuditLogs();
      const afterCall = new Date();

      const callArgs = mockApi.get.mock.calls[0][0];

      const startDateMatch = callArgs.match(/startDate=([^&]+)/);
      const endDateMatch = callArgs.match(/endDate=([^&]+)/);

      expect(startDateMatch).not.toBeNull();
      expect(endDateMatch).not.toBeNull();

      const startDate = new Date(decodeURIComponent(startDateMatch![1]));
      const endDate = new Date(decodeURIComponent(endDateMatch![1]));

      const sevenDaysAgo = new Date(beforeCall);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      expect(startDate.getTime()).toBeLessThanOrEqual(sevenDaysAgo.getTime());
      expect(startDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime() - 1000);

      expect(endDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000);
      expect(endDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
    });
  });
});
