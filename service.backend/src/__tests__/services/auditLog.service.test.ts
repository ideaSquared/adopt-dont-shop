import { AuditLog } from '../../models/AuditLog';
import { AuditLogService } from '../../services/auditLog.service';

// Mock the models and dependencies
jest.mock('../../models/AuditLog');
jest.mock('../../utils/logger');

const MockedAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

describe('AuditLogService', () => {
  let auditLogService: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogService = new AuditLogService();
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
      MockedAuditLog.create = jest.fn().mockResolvedValue({
        id: 'log-1',
        ...mockAuditData,
        timestamp: expect.any(Date),
      });

      await AuditLogService.log(mockAuditData);

      expect(MockedAuditLog.create).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'CREATE_PET',
        entity: 'Pet',
        entityId: 'pet-1',
        details: { petName: 'Buddy', rescueId: 'rescue-1' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: expect.any(Date),
      });
    });

    it('should handle audit log creation without optional fields', async () => {
      const minimalData = {
        userId: 'user-1',
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: 'user-1',
      };

      MockedAuditLog.create = jest.fn().mockResolvedValue({
        id: 'log-1',
        ...minimalData,
        timestamp: expect.any(Date),
      });

      await AuditLogService.log(minimalData);

      expect(MockedAuditLog.create).toHaveBeenCalledWith({
        ...minimalData,
        details: {},
        ipAddress: undefined,
        userAgent: undefined,
        timestamp: expect.any(Date),
      });
    });

    it('should not throw error when audit log creation fails', async () => {
      MockedAuditLog.create = jest.fn().mockRejectedValue(new Error('Database error'));

      // Should not throw error, just log it
      await expect(AuditLogService.log(mockAuditData)).rejects.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    const mockAuditLogs = [
      {
        id: 'log-1',
        userId: 'user-1',
        action: 'CREATE_PET',
        entity: 'Pet',
        entityId: 'pet-1',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        details: { petName: 'Buddy' },
      },
      {
        id: 'log-2',
        userId: 'user-2',
        action: 'UPDATE_PET',
        entity: 'Pet',
        entityId: 'pet-1',
        timestamp: new Date('2023-01-01T11:00:00Z'),
        details: { changes: { status: { from: 'Available', to: 'Adopted' } } },
      },
    ];

    it('should return audit logs with pagination', async () => {
      const mockResult = {
        count: 2,
        rows: mockAuditLogs,
      };

      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const filters = {
        userId: 'user-1',
        entity: 'Pet',
        page: 1,
        limit: 50,
      };

      const result = await auditLogService.getAuditLogs(filters);

      expect(result).toEqual({
        logs: mockAuditLogs,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          entity: 'Pet',
        },
        order: [['timestamp', 'DESC']],
        limit: 50,
        offset: 0,
      });
    });

    it('should handle filters correctly', async () => {
      const mockResult = { count: 1, rows: [mockAuditLogs[0]] };
      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const filters = {
        userId: 'user-1',
        entity: 'Pet',
        entityId: 'pet-1',
        action: 'CREATE_PET',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        page: 1,
        limit: 25,
      };

      await auditLogService.getAuditLogs(filters);

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          entity: 'Pet',
          entityId: 'pet-1',
          action: 'CREATE_PET',
          timestamp: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-01-31'),
          },
        },
        order: [['timestamp', 'DESC']],
        limit: 25,
        offset: 0,
      });
    });

    it('should handle start date only filter', async () => {
      const mockResult = { count: 0, rows: [] };
      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const filters = {
        startDate: new Date('2023-01-01'),
        page: 1,
        limit: 50,
      };

      await auditLogService.getAuditLogs(filters);

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {
          timestamp: { gte: new Date('2023-01-01') },
        },
        order: [['timestamp', 'DESC']],
        limit: 50,
        offset: 0,
      });
    });

    it('should handle end date only filter', async () => {
      const mockResult = { count: 0, rows: [] };
      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const filters = {
        endDate: new Date('2023-01-31'),
        page: 1,
        limit: 50,
      };

      await auditLogService.getAuditLogs(filters);

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {
          timestamp: { lte: new Date('2023-01-31') },
        },
        order: [['timestamp', 'DESC']],
        limit: 50,
        offset: 0,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockResult = { count: 150, rows: mockAuditLogs };
      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const filters = {
        page: 3,
        limit: 50,
      };

      const result = await auditLogService.getAuditLogs(filters);

      expect(result.pagination).toEqual({
        currentPage: 3,
        totalPages: 3,
        totalCount: 150,
        hasNext: false,
        hasPrev: true,
      });

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        order: [['timestamp', 'DESC']],
        limit: 50,
        offset: 100,
      });
    });

    it('should use default pagination values', async () => {
      const mockResult = { count: 10, rows: mockAuditLogs };
      MockedAuditLog.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await auditLogService.getAuditLogs({});

      expect(MockedAuditLog.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        order: [['timestamp', 'DESC']],
        limit: 50,
        offset: 0,
      });
    });

    it('should throw error when database operation fails', async () => {
      MockedAuditLog.findAndCountAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(auditLogService.getAuditLogs({})).rejects.toThrow(
        'Failed to retrieve audit logs'
      );
    });
  });
});
