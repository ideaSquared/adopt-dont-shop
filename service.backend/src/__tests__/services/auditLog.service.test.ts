import { AuditLog } from '../../models/AuditLog';
import { AuditLogService } from '../../services/auditLog.service';

// Mock the models and dependencies
jest.mock('../../models/AuditLog');
jest.mock('../../utils/logger');

const MockedAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    const mockAuditData = {
      userId: 'user-1',
      action: 'CREATE_PET',
      entity: 'Pet',
      entityId: 'pet-1',
      details: { petName: 'Buddy', rescueId: 'rescue-1' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create audit log successfully', async () => {
      const mockLog = {
        id: 'log-1',
        ...mockAuditData,
        timestamp: new Date(),
      };

      MockedAuditLog.create = jest.fn().mockResolvedValue(mockLog as any);

      const result = await AuditLogService.log(mockAuditData);

      expect(MockedAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockAuditData.userId,
          action: mockAuditData.action,
          entity: mockAuditData.entity,
          entityId: mockAuditData.entityId,
          details: mockAuditData.details,
          ipAddress: mockAuditData.ipAddress,
          userAgent: mockAuditData.userAgent,
          timestamp: expect.any(Date),
        })
      );
      expect(result).toEqual(mockLog);
    });

    it('should handle audit log creation without optional fields', async () => {
      const minimalData = {
        userId: 'user-1',
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: 'user-1',
      };

      const mockLog = {
        id: 'log-2',
        ...minimalData,
        details: {},
        ipAddress: undefined,
        userAgent: undefined,
        timestamp: new Date(),
      };

      MockedAuditLog.create = jest.fn().mockResolvedValue(mockLog as any);

      const result = await AuditLogService.log(minimalData);

      expect(MockedAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: minimalData.userId,
          action: minimalData.action,
          entity: minimalData.entity,
          entityId: minimalData.entityId,
          details: {},
          timestamp: expect.any(Date),
        })
      );
      expect(result).toEqual(mockLog);
    });

    it('should handle error when audit log creation fails', async () => {
      MockedAuditLog.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(AuditLogService.log(mockAuditData)).rejects.toThrow('Database error');
    });
  });

  describe('getLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'CREATE', entity: 'User' },
        { id: 'log-2', action: 'UPDATE', entity: 'Pet' },
      ];

      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue({
        rows: mockLogs,
        count: 2,
      });

      const whereConditions = { entity: 'User' };
      const options = { limit: 10, offset: 0 };

      const result = await AuditLogService.getLogs(whereConditions, options);

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: whereConditions,
        include: expect.any(Array),
        ...options,
      });
      expect(result.rows).toEqual(mockLogs);
      expect(result.count).toBe(2);
    });
  });

  describe('getLogsByUser', () => {
    it('should get logs for a specific user', async () => {
      const userId = 'user-123';
      const mockLogs = [{ id: 'log-1', userId, action: 'LOGIN' }];

      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue({
        rows: mockLogs,
        count: 1,
      });

      const result = await AuditLogService.getLogsByUser(userId);

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Array),
        limit: 50,
        offset: 0,
        order: [['timestamp', 'DESC']],
      });
      expect(result.rows).toEqual(mockLogs);
    });
  });
});
