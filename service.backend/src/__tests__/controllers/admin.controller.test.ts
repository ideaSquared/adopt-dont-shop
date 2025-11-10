// Mock dependencies before imports
jest.mock('../../services/admin.service');
jest.mock('../../services/auditLog.service');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  loggerHelpers: {
    logRequest: jest.fn(),
    logPerformance: jest.fn(),
  },
}));

// Mock User model
jest.mock('../../models/User', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
  UserStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    SUSPENDED: 'SUSPENDED',
    DELETED: 'DELETED',
  },
  UserType: {
    ADOPTER: 'ADOPTER',
    RESCUE: 'RESCUE',
    ADMIN: 'ADMIN',
  },
}));

import { Request, Response } from 'express';
import { AdminController } from '../../controllers/admin.controller';
import AdminService from '../../services/admin.service';
import { AuditLogService } from '../../services/auditLog.service';
import User, { UserStatus, UserType } from '../../models/User';
import { logger, loggerHelpers } from '../../utils/logger';

const MockedAdminService = AdminService as jest.Mocked<typeof AdminService>;
const MockedAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;
const MockedUser = User as jest.Mocked<typeof User>;

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    rescueId?: string;
  };
}

describe('AdminController', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        userId: 'admin-123',
        role: 'ADMIN',
      },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
  });

  describe('getPlatformMetrics', () => {
    it('should return platform metrics successfully', async () => {
      const mockMetrics = {
        users: {
          total: 100,
          active: 80,
          newThisMonth: 10,
          byRole: { ADOPTER: 70, RESCUE: 25, ADMIN: 5 },
        },
        rescues: {
          total: 25,
          verified: 20,
          pending: 5,
          newThisMonth: 3,
        },
        pets: {
          total: 150,
          available: 100,
          adopted: 50,
          newThisMonth: 15,
        },
        applications: {
          total: 200,
          pending: 50,
          approved: 100,
          newThisMonth: 20,
        },
      };

      MockedAdminService.getPlatformMetrics = jest.fn().mockResolvedValue(mockMetrics);

      await AdminController.getPlatformMetrics(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getPlatformMetrics).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });

    it('should handle date range parameters', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockMetrics = {
        users: { total: 50, active: 40, newThisMonth: 5, byRole: {} },
        rescues: { total: 10, verified: 8, pending: 2, newThisMonth: 1 },
        pets: { total: 75, available: 50, adopted: 25, newThisMonth: 8 },
        applications: { total: 100, pending: 25, approved: 50, newThisMonth: 10 },
      };

      MockedAdminService.getPlatformMetrics = jest.fn().mockResolvedValue(mockMetrics);

      await AdminController.getPlatformMetrics(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getPlatformMetrics).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });

    it('should handle errors when fetching metrics', async () => {
      const error = new Error('Database connection failed');
      MockedAdminService.getPlatformMetrics = jest.fn().mockRejectedValue(error);

      await AdminController.getPlatformMetrics(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith('Error getting platform metrics:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get platform metrics',
        message: 'Database connection failed',
      });
    });

    it('should handle unknown errors', async () => {
      MockedAdminService.getPlatformMetrics = jest.fn().mockRejectedValue('Unknown error');

      await AdminController.getPlatformMetrics(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get platform metrics',
        message: 'Unknown error',
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users with default pagination', async () => {
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com', firstName: 'John', lastName: 'Doe' },
          { id: 'user-2', email: 'user2@example.com', firstName: 'Jane', lastName: 'Smith' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.searchUsers(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        userType: undefined,
        page: 1,
        limit: 20,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.users,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should search users with filters and pagination', async () => {
      req.query = {
        search: 'john',
        role: 'ADOPTER',
        status: 'ACTIVE',
        page: '2',
        limit: '10',
        sortBy: 'email',
        sortOrder: 'ASC',
      };

      const mockResult = {
        users: [{ id: 'user-1', email: 'john@example.com' }],
        total: 15,
        page: 2,
        totalPages: 2,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.searchUsers(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        search: 'john',
        status: 'ACTIVE',
        userType: 'ADOPTER',
        page: 2,
        limit: 10,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.users,
        pagination: {
          page: 2,
          limit: 20,
          total: 15,
          pages: 2,
        },
      });
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      MockedAdminService.getUsers = jest.fn().mockRejectedValue(error);

      await AdminController.searchUsers(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error searching users:',
        expect.objectContaining({
          error: 'Search failed',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to search users',
        message: 'Search failed',
      });
    });
  });

  describe('performUserAction', () => {
    beforeEach(() => {
      req.params = { userId: 'user-123' };
    });

    it('should suspend a user successfully', async () => {
      req.body = {
        action: 'suspend',
        reason: 'Violation of terms',
      };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.SUSPENDED,
        save: jest.fn(),
      };

      MockedAdminService.suspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.suspendUser).toHaveBeenCalledWith('user-123', 'admin-123', 'Violation of terms');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User suspend successful',
      });
    });

    it('should unsuspend a user successfully', async () => {
      req.body = {
        action: 'unsuspend',
      };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.ACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.unsuspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.unsuspendUser).toHaveBeenCalledWith('user-123', 'admin-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User unsuspend successful',
      });
    });

    it('should verify a user successfully', async () => {
      req.body = {
        action: 'verify',
      };

      const mockUser = {
        id: 'user-123',
        verificationStatus: 'VERIFIED',
        save: jest.fn(),
      };

      MockedAdminService.verifyUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.verifyUser).toHaveBeenCalledWith('user-123', 'admin-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User verify successful',
      });
    });

    it('should update user status successfully', async () => {
      req.body = {
        action: 'update_status',
        status: 'INACTIVE',
      };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.INACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.updateUserStatus = jest.fn().mockResolvedValue(mockUser);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.updateUserStatus).toHaveBeenCalledWith('user-123', 'INACTIVE', 'admin-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User update_status successful',
      });
    });

    it('should return error when status is missing for update_status action', async () => {
      req.body = {
        action: 'update_status',
      };

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Status is required for update_status action',
      });
    });

    it('should delete a user successfully', async () => {
      req.body = {
        action: 'delete',
        reason: 'User requested deletion',
      };

      MockedAdminService.deleteUser = jest.fn().mockResolvedValue(undefined);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.deleteUser).toHaveBeenCalledWith('user-123', 'admin-123', 'User requested deletion');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { success: true },
        message: 'User delete successful',
      });
    });

    it('should return error when action is missing', async () => {
      req.body = {};

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Action is required',
      });
    });

    it('should return error for invalid action', async () => {
      req.body = {
        action: 'invalid_action',
      };

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid action specified',
      });
    });

    it('should handle user not found error', async () => {
      req.body = {
        action: 'suspend',
        reason: 'Test',
      };

      const error = new Error('User not found');
      MockedAdminService.suspendUser = jest.fn().mockRejectedValue(error);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });

    it('should handle general errors', async () => {
      req.body = {
        action: 'suspend',
        reason: 'Test',
      };

      const error = new Error('Database error');
      MockedAdminService.suspendUser = jest.fn().mockRejectedValue(error);

      await AdminController.performUserAction(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error performing user action:',
        expect.objectContaining({
          error: 'Database error',
          action: 'suspend',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to perform user action',
        message: 'Database error',
      });
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health successfully', async () => {
      const mockHealth = {
        status: 'healthy',
        database: { connected: true, responseTime: 10 },
        memory: { used: 512, total: 2048 },
        uptime: 86400,
      };

      MockedAdminService.getSystemHealth = jest.fn().mockResolvedValue(mockHealth);

      await AdminController.getSystemHealth(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getSystemHealth).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHealth,
      });
    });

    it('should handle errors when fetching system health', async () => {
      const error = new Error('Health check failed');
      MockedAdminService.getSystemHealth = jest.fn().mockRejectedValue(error);

      await AdminController.getSystemHealth(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith('Error getting system health:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get system health',
        message: 'Health check failed',
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with default pagination', async () => {
      const mockResult = {
        logs: [
          { id: 'log-1', action: 'CREATE', entity: 'User', userId: 'user-1' },
          { id: 'log-2', action: 'UPDATE', entity: 'Pet', userId: 'user-2' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getAuditLogs = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getAuditLogs(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getAuditLogs).toHaveBeenCalledWith({
        action: undefined,
        userId: undefined,
        entity: undefined,
        level: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 50,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.logs,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should return audit logs with filters', async () => {
      req.query = {
        action: 'CREATE',
        userId: 'user-123',
        entity: 'User',
        level: 'INFO',
        status: 'success',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: '2',
        limit: '25',
      };

      const mockResult = {
        logs: [{ id: 'log-1', action: 'CREATE', entity: 'User' }],
        total: 50,
        page: 2,
        totalPages: 2,
      };

      MockedAdminService.getAuditLogs = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getAuditLogs(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getAuditLogs).toHaveBeenCalledWith({
        action: 'CREATE',
        userId: 'user-123',
        entity: 'User',
        level: 'INFO',
        status: 'success',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        page: 2,
        limit: 25,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.logs,
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          pages: 2,
        },
      });
    });

    it('should handle errors when fetching audit logs', async () => {
      const error = new Error('Database error');
      MockedAdminService.getAuditLogs = jest.fn().mockRejectedValue(error);

      await AdminController.getAuditLogs(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting audit logs:',
        expect.objectContaining({
          error: 'Database error',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get audit logs',
        message: 'Database error',
      });
    });
  });

  describe('getRescueManagement', () => {
    it('should return rescue management data with default pagination', async () => {
      const mockResult = {
        rescues: [
          { id: 'rescue-1', name: 'Happy Tails Rescue', verified: true },
          { id: 'rescue-2', name: 'Paws & Claws', verified: false },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getRescues = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getRescueManagement(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getRescues).toHaveBeenCalledWith({
        status: undefined,
        page: 1,
        limit: 20,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.rescues,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should return rescue management data with filters', async () => {
      req.query = {
        status: 'VERIFIED',
        page: '3',
        limit: '15',
      };

      const mockResult = {
        rescues: [{ id: 'rescue-1', name: 'Happy Tails Rescue' }],
        total: 45,
        page: 3,
        totalPages: 3,
      };

      MockedAdminService.getRescues = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getRescueManagement(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getRescues).toHaveBeenCalledWith({
        status: 'VERIFIED',
        page: 3,
        limit: 15,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.rescues,
        pagination: {
          page: 3,
          limit: 20,
          total: 45,
          pages: 3,
        },
      });
    });

    it('should handle errors when fetching rescue management', async () => {
      const error = new Error('Query failed');
      MockedAdminService.getRescues = jest.fn().mockRejectedValue(error);

      await AdminController.getRescueManagement(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting rescue management:',
        expect.objectContaining({
          error: 'Query failed',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get rescue management',
        message: 'Query failed',
      });
    });
  });

  describe('moderateRescue', () => {
    beforeEach(() => {
      req.params = { rescueId: 'rescue-123' };
    });

    it('should verify a rescue successfully', async () => {
      req.body = {
        action: 'verify',
      };

      const mockRescue = {
        id: 'rescue-123',
        name: 'Happy Tails Rescue',
        verified: true,
      };

      MockedAdminService.verifyRescue = jest.fn().mockResolvedValue(mockRescue);

      await AdminController.moderateRescue(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.verifyRescue).toHaveBeenCalledWith('rescue-123', 'admin-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRescue,
        message: 'Rescue verify successful',
      });
    });

    it('should reject a rescue successfully', async () => {
      req.body = {
        action: 'reject',
        reason: 'Incomplete documentation',
      };

      const mockRescue = {
        id: 'rescue-123',
        name: 'Happy Tails Rescue',
        verified: false,
        rejectionReason: 'Incomplete documentation',
      };

      MockedAdminService.rejectRescueVerification = jest.fn().mockResolvedValue(mockRescue);

      await AdminController.moderateRescue(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.rejectRescueVerification).toHaveBeenCalledWith(
        'rescue-123',
        'admin-123',
        'Incomplete documentation'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRescue,
        message: 'Rescue reject successful',
      });
    });

    it('should return error for invalid action', async () => {
      req.body = {
        action: 'invalid_action',
      };

      await AdminController.moderateRescue(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid action specified',
      });
    });

    it('should handle errors when moderating rescue', async () => {
      req.body = {
        action: 'verify',
      };

      const error = new Error('Rescue not found');
      MockedAdminService.verifyRescue = jest.fn().mockRejectedValue(error);

      await AdminController.moderateRescue(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error moderating rescue:',
        expect.objectContaining({
          error: 'Rescue not found',
          action: 'verify',
          rescueId: 'rescue-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to moderate rescue',
        message: 'Rescue not found',
      });
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics successfully', async () => {
      const mockAnalytics = {
        totalUsers: 100,
        totalRescues: 25,
        totalPets: 150,
        totalApplications: 200,
      };

      MockedAdminService.getSystemStatistics = jest.fn().mockResolvedValue(mockAnalytics);

      await AdminController.getUsageAnalytics(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getSystemStatistics).toHaveBeenCalled();
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('should handle date range parameters', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockAnalytics = {
        totalUsers: 50,
        totalRescues: 10,
        totalPets: 75,
        totalApplications: 100,
      };

      MockedAdminService.getSystemStatistics = jest.fn().mockResolvedValue(mockAnalytics);

      await AdminController.getUsageAnalytics(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getSystemStatistics).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('should handle errors when fetching usage analytics', async () => {
      const error = new Error('Analytics computation failed');
      MockedAdminService.getSystemStatistics = jest.fn().mockRejectedValue(error);

      await AdminController.getUsageAnalytics(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting usage analytics:',
        expect.objectContaining({
          error: 'Analytics computation failed',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get usage analytics',
        message: 'Analytics computation failed',
      });
    });
  });

  describe('exportData', () => {
    it('should export users data as JSON successfully', async () => {
      req.query = {
        type: 'users',
        format: 'json',
      };

      const mockData = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      MockedAdminService.exportData = jest.fn().mockResolvedValue(mockData);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.exportData).toHaveBeenCalledWith('users', 'json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="users_export_.*\.json"/)
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('should export rescues data as CSV successfully', async () => {
      req.query = {
        type: 'rescues',
        format: 'csv',
      };

      const mockData = 'id,name,verified\nrescue-1,Happy Tails,true';

      MockedAdminService.exportData = jest.fn().mockResolvedValue(mockData);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.exportData).toHaveBeenCalledWith('rescues', 'csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="rescues_export_.*\.csv"/)
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('should export pets data successfully', async () => {
      req.query = {
        type: 'pets',
        format: 'json',
      };

      const mockData = [{ id: 'pet-1', name: 'Max' }];

      MockedAdminService.exportData = jest.fn().mockResolvedValue(mockData);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.exportData).toHaveBeenCalledWith('pets', 'json');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('should export applications data successfully', async () => {
      req.query = {
        type: 'applications',
        format: 'json',
      };

      const mockData = [{ id: 'app-1', status: 'PENDING' }];

      MockedAdminService.exportData = jest.fn().mockResolvedValue(mockData);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.exportData).toHaveBeenCalledWith('applications', 'json');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('should return error when type is missing', async () => {
      req.query = {
        format: 'json',
      };

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Export type is required',
      });
    });

    it('should return error for invalid export type', async () => {
      req.query = {
        type: 'invalid_type',
        format: 'json',
      };

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid export type',
      });
    });

    it('should return error for invalid export format', async () => {
      req.query = {
        type: 'users',
        format: 'xml',
      };

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid export format',
      });
    });

    it('should use default format when not specified', async () => {
      req.query = {
        type: 'users',
      };

      const mockData = [{ id: 'user-1' }];

      MockedAdminService.exportData = jest.fn().mockResolvedValue(mockData);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.exportData).toHaveBeenCalledWith('users', 'json');
    });

    it('should handle errors when exporting data', async () => {
      req.query = {
        type: 'users',
        format: 'json',
      };

      const error = new Error('Export failed');
      MockedAdminService.exportData = jest.fn().mockRejectedValue(error);

      await AdminController.exportData(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith('Error exporting data:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to export data',
        message: 'Export failed',
      });
    });
  });

  describe('getUserDetails', () => {
    it('should return user details successfully', async () => {
      req.params = { userId: 'user-123' };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'ADOPTER',
      };

      MockedAdminService.getUserById = jest.fn().mockResolvedValue(mockUser);

      await AdminController.getUserDetails(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUserById).toHaveBeenCalledWith('user-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should handle errors when fetching user details', async () => {
      req.params = { userId: 'user-123' };

      const error = new Error('User not found');
      MockedAdminService.getUserById = jest.fn().mockRejectedValue(error);

      await AdminController.getUserDetails(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting user details:',
        expect.objectContaining({
          error: 'User not found',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get user details',
        message: 'User not found',
      });
    });
  });

  describe('getConfiguration', () => {
    it('should return platform configuration successfully', async () => {
      await AdminController.getConfiguration(req as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          platform: expect.objectContaining({
            name: "Adopt Don't Shop",
            version: '1.0.0',
            environment: expect.any(String),
          }),
          features: expect.any(Object),
          limits: expect.any(Object),
        }),
      });
    });

    it('should handle errors when fetching configuration', async () => {
      // Mock process.env to throw an error
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        get: () => {
          throw new Error('Environment error');
        },
        configurable: true,
      });

      await AdminController.getConfiguration(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith('Error getting configuration:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get configuration',
        message: 'Environment error',
      });

      // Restore original environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    });
  });

  describe('updateConfiguration', () => {
    it('should handle configuration update request', async () => {
      req.body = {
        key: 'maxFileSize',
        value: '20MB',
      };

      await AdminController.updateConfiguration(req as AuthenticatedRequest, res as Response);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Admin admin-123 attempted to update config: maxFileSize = 20MB')
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Configuration update not implemented yet',
        data: { key: 'maxFileSize', value: '20MB' },
      });
    });

    it('should return error when key is missing', async () => {
      req.body = {
        value: '20MB',
      };

      await AdminController.updateConfiguration(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Configuration key and value are required',
      });
    });

    it('should return error when value is missing', async () => {
      req.body = {
        key: 'maxFileSize',
      };

      await AdminController.updateConfiguration(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Configuration key and value are required',
      });
    });

    it('should handle errors when updating configuration', async () => {
      req.body = {
        key: 'maxFileSize',
        value: '20MB',
      };

      // Mock logger.info to throw an error
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logging error');
      });

      await AdminController.updateConfiguration(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith('Error updating configuration:', expect.any(Error));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update configuration',
        message: 'Logging error',
      });
    });
  });

  describe('getUsers', () => {
    it('should return users with default pagination', async () => {
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getUsers(req as Request, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        status: undefined,
        userType: undefined,
        search: undefined,
        page: 1,
        limit: 20,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return users with filters', async () => {
      req.query = {
        status: 'ACTIVE',
        userType: 'ADOPTER',
        search: 'john',
        page: '2',
        limit: '10',
      };

      const mockResult = {
        users: [{ id: 'user-1', email: 'john@example.com' }],
        total: 15,
        page: 2,
        totalPages: 2,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getUsers(req as Request, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        status: 'ACTIVE',
        userType: 'ADOPTER',
        search: 'john',
        page: 2,
        limit: 10,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should handle errors when fetching users', async () => {
      const error = new Error('Database error');
      MockedAdminService.getUsers = jest.fn().mockRejectedValue(error);

      await AdminController.getUsers(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin getUsers failed:',
        expect.objectContaining({
          error: 'Database error',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve users',
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      req.params = { userId: 'user-123' };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      MockedAdminService.getUserById = jest.fn().mockResolvedValue(mockUser);

      await AdminController.getUserById(req as Request, res as Response);

      expect(MockedAdminService.getUserById).toHaveBeenCalledWith('user-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should handle errors when fetching user by ID', async () => {
      req.params = { userId: 'user-123' };

      const error = new Error('User not found');
      MockedAdminService.getUserById = jest.fn().mockRejectedValue(error);

      await AdminController.getUserById(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin getUserById failed:',
        expect.objectContaining({
          error: 'User not found',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve user',
      });
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      req.params = { userId: 'user-123' };
      req.body = { status: 'INACTIVE' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.INACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.updateUserStatus = jest.fn().mockResolvedValue(mockUser);

      await AdminController.updateUserStatus(req as Request, res as Response);

      expect(MockedAdminService.updateUserStatus).toHaveBeenCalledWith('user-123', 'INACTIVE', 'admin-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should use system as adminId when user is not present', async () => {
      req.user = undefined;
      req.params = { userId: 'user-123' };
      req.body = { status: 'ACTIVE' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.ACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.updateUserStatus = jest.fn().mockResolvedValue(mockUser);

      await AdminController.updateUserStatus(req as Request, res as Response);

      expect(MockedAdminService.updateUserStatus).toHaveBeenCalledWith('user-123', 'ACTIVE', 'system');
    });

    it('should handle errors when updating user status', async () => {
      req.params = { userId: 'user-123' };
      req.body = { status: 'ACTIVE' };

      const error = new Error('Update failed');
      MockedAdminService.updateUserStatus = jest.fn().mockRejectedValue(error);

      await AdminController.updateUserStatus(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin updateUserStatus failed:',
        expect.objectContaining({
          error: 'Update failed',
          userId: 'user-123',
          status: 'ACTIVE',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update user status',
      });
    });
  });

  describe('suspendUser', () => {
    it('should suspend user successfully', async () => {
      req.params = { userId: 'user-123' };
      req.body = { reason: 'Policy violation' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.SUSPENDED,
        save: jest.fn(),
      };

      MockedAdminService.suspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.suspendUser(req as Request, res as Response);

      expect(MockedAdminService.suspendUser).toHaveBeenCalledWith('user-123', 'admin-123', 'Policy violation');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should suspend user without reason', async () => {
      req.params = { userId: 'user-123' };
      req.body = {};

      const mockUser = {
        id: 'user-123',
        status: UserStatus.SUSPENDED,
        save: jest.fn(),
      };

      MockedAdminService.suspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.suspendUser(req as Request, res as Response);

      expect(MockedAdminService.suspendUser).toHaveBeenCalledWith('user-123', 'admin-123', undefined);
    });

    it('should use system as adminId when user is not present', async () => {
      req.user = undefined;
      req.params = { userId: 'user-123' };
      req.body = { reason: 'Test' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.SUSPENDED,
        save: jest.fn(),
      };

      MockedAdminService.suspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.suspendUser(req as Request, res as Response);

      expect(MockedAdminService.suspendUser).toHaveBeenCalledWith('user-123', 'system', 'Test');
    });

    it('should handle errors when suspending user', async () => {
      req.params = { userId: 'user-123' };
      req.body = { reason: 'Test' };

      const error = new Error('Suspension failed');
      MockedAdminService.suspendUser = jest.fn().mockRejectedValue(error);

      await AdminController.suspendUser(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin suspendUser failed:',
        expect.objectContaining({
          error: 'Suspension failed',
          userId: 'user-123',
          reason: 'Test',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to suspend user',
      });
    });
  });

  describe('unsuspendUser', () => {
    it('should unsuspend user successfully', async () => {
      req.params = { userId: 'user-123' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.ACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.unsuspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.unsuspendUser(req as Request, res as Response);

      expect(MockedAdminService.unsuspendUser).toHaveBeenCalledWith('user-123', 'admin-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should use system as adminId when user is not present', async () => {
      req.user = undefined;
      req.params = { userId: 'user-123' };

      const mockUser = {
        id: 'user-123',
        status: UserStatus.ACTIVE,
        save: jest.fn(),
      };

      MockedAdminService.unsuspendUser = jest.fn().mockResolvedValue(mockUser);

      await AdminController.unsuspendUser(req as Request, res as Response);

      expect(MockedAdminService.unsuspendUser).toHaveBeenCalledWith('user-123', 'system');
    });

    it('should handle errors when unsuspending user', async () => {
      req.params = { userId: 'user-123' };

      const error = new Error('Unsuspension failed');
      MockedAdminService.unsuspendUser = jest.fn().mockRejectedValue(error);

      await AdminController.unsuspendUser(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin unsuspendUser failed:',
        expect.objectContaining({
          error: 'Unsuspension failed',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to unsuspend user',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      req.params = { userId: 'user-123' };
      req.body = { reason: 'User requested deletion' };

      MockedAdminService.deleteUser = jest.fn().mockResolvedValue(undefined);

      await AdminController.deleteUser(req as Request, res as Response);

      expect(MockedAdminService.deleteUser).toHaveBeenCalledWith('user-123', 'admin-123', 'User requested deletion');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should delete user without reason', async () => {
      req.params = { userId: 'user-123' };
      req.body = {};

      MockedAdminService.deleteUser = jest.fn().mockResolvedValue(undefined);

      await AdminController.deleteUser(req as Request, res as Response);

      expect(MockedAdminService.deleteUser).toHaveBeenCalledWith('user-123', 'admin-123', undefined);
    });

    it('should use system as adminId when user is not present', async () => {
      req.user = undefined;
      req.params = { userId: 'user-123' };
      req.body = { reason: 'Test' };

      MockedAdminService.deleteUser = jest.fn().mockResolvedValue(undefined);

      await AdminController.deleteUser(req as Request, res as Response);

      expect(MockedAdminService.deleteUser).toHaveBeenCalledWith('user-123', 'system', 'Test');
    });

    it('should handle errors when deleting user', async () => {
      req.params = { userId: 'user-123' };
      req.body = { reason: 'Test' };

      const error = new Error('Deletion failed');
      MockedAdminService.deleteUser = jest.fn().mockRejectedValue(error);

      await AdminController.deleteUser(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin deleteUser failed:',
        expect.objectContaining({
          error: 'Deletion failed',
          userId: 'user-123',
          reason: 'Test',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete user',
      });
    });
  });

  describe('getRescues', () => {
    it('should return rescues with default pagination', async () => {
      const mockResult = {
        rescues: [
          { id: 'rescue-1', name: 'Happy Tails' },
          { id: 'rescue-2', name: 'Paws & Claws' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getRescues = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getRescues(req as Request, res as Response);

      expect(MockedAdminService.getRescues).toHaveBeenCalledWith({
        status: undefined,
        search: undefined,
        page: 1,
        limit: 20,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return rescues with filters', async () => {
      req.query = {
        status: 'VERIFIED',
        search: 'happy',
        page: '2',
        limit: '15',
      };

      const mockResult = {
        rescues: [{ id: 'rescue-1', name: 'Happy Tails' }],
        total: 30,
        page: 2,
        totalPages: 2,
      };

      MockedAdminService.getRescues = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getRescues(req as Request, res as Response);

      expect(MockedAdminService.getRescues).toHaveBeenCalledWith({
        status: 'VERIFIED',
        search: 'happy',
        page: 2,
        limit: 15,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should handle errors when fetching rescues', async () => {
      const error = new Error('Query failed');
      MockedAdminService.getRescues = jest.fn().mockRejectedValue(error);

      await AdminController.getRescues(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin getRescues failed:',
        expect.objectContaining({
          error: 'Query failed',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve rescues',
      });
    });
  });

  describe('verifyRescue', () => {
    it('should verify rescue successfully', async () => {
      req.params = { rescueId: 'rescue-123' };

      const mockRescue = {
        id: 'rescue-123',
        name: 'Happy Tails Rescue',
        verified: true,
      };

      MockedAdminService.verifyRescue = jest.fn().mockResolvedValue(mockRescue);

      await AdminController.verifyRescue(req as Request, res as Response);

      expect(MockedAdminService.verifyRescue).toHaveBeenCalledWith('rescue-123', 'admin-123');
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRescue,
      });
    });

    it('should use system as adminId when user is not present', async () => {
      req.user = undefined;
      req.params = { rescueId: 'rescue-123' };

      const mockRescue = {
        id: 'rescue-123',
        verified: true,
      };

      MockedAdminService.verifyRescue = jest.fn().mockResolvedValue(mockRescue);

      await AdminController.verifyRescue(req as Request, res as Response);

      expect(MockedAdminService.verifyRescue).toHaveBeenCalledWith('rescue-123', 'system');
    });

    it('should handle errors when verifying rescue', async () => {
      req.params = { rescueId: 'rescue-123' };

      const error = new Error('Verification failed');
      MockedAdminService.verifyRescue = jest.fn().mockRejectedValue(error);

      await AdminController.verifyRescue(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin verifyRescue failed:',
        expect.objectContaining({
          error: 'Verification failed',
          rescueId: 'rescue-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to verify rescue',
      });
    });
  });

  describe('getSystemStatistics', () => {
    it('should return system statistics successfully', async () => {
      const mockStats = {
        totalUsers: 100,
        totalRescues: 25,
        totalPets: 150,
        totalApplications: 200,
        activeUsers: 80,
        verifiedRescues: 20,
        availablePets: 100,
        pendingApplications: 50,
      };

      MockedAdminService.getSystemStatistics = jest.fn().mockResolvedValue(mockStats);

      await AdminController.getSystemStatistics(req as Request, res as Response);

      expect(MockedAdminService.getSystemStatistics).toHaveBeenCalled();
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should handle errors when fetching system statistics', async () => {
      const error = new Error('Statistics computation failed');
      MockedAdminService.getSystemStatistics = jest.fn().mockRejectedValue(error);

      await AdminController.getSystemStatistics(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Admin getSystemStatistics failed:',
        expect.objectContaining({
          error: 'Statistics computation failed',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve system statistics',
      });
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats successfully', async () => {
      const mockStats = {
        users: { total: 100, active: 80, newThisMonth: 10, byRole: {} },
        rescues: { total: 25, verified: 20, pending: 5, newThisMonth: 3 },
        pets: { total: 150, available: 100, adopted: 50, newThisMonth: 15 },
        applications: { total: 200, pending: 50, approved: 100, newThisMonth: 20 },
      };

      MockedAdminService.getPlatformMetrics = jest.fn().mockResolvedValue(mockStats);

      await AdminController.getDashboardStats(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getPlatformMetrics).toHaveBeenCalled();
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle date range parameters', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockStats = {
        users: { total: 50, active: 40, newThisMonth: 5, byRole: {} },
        rescues: { total: 10, verified: 8, pending: 2, newThisMonth: 1 },
        pets: { total: 75, available: 50, adopted: 25, newThisMonth: 8 },
        applications: { total: 100, pending: 25, approved: 50, newThisMonth: 10 },
      };

      MockedAdminService.getPlatformMetrics = jest.fn().mockResolvedValue(mockStats);

      await AdminController.getDashboardStats(req as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle errors when fetching dashboard stats', async () => {
      const error = new Error('Stats computation failed');
      MockedAdminService.getPlatformMetrics = jest.fn().mockRejectedValue(error);

      await AdminController.getDashboardStats(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get dashboard stats:',
        expect.objectContaining({
          error: 'Stats computation failed',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get dashboard stats' });
    });
  });

  describe('getUsersAdmin', () => {
    it('should return users with default pagination', async () => {
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getUsersAdmin(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        userType: undefined,
        page: 1,
        limit: 20,
      });
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.users,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should return users with filters', async () => {
      req.query = {
        search: 'john',
        role: 'ADOPTER',
        status: 'ACTIVE',
        page: '2',
        limit: '10',
      };

      const mockResult = {
        users: [{ id: 'user-1', email: 'john@example.com' }],
        total: 15,
        page: 2,
        totalPages: 2,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getUsersAdmin(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        search: 'john',
        status: 'ACTIVE',
        userType: 'ADOPTER',
        page: 2,
        limit: 10,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.users,
        pagination: {
          page: 2,
          limit: 20,
          total: 15,
          pages: 2,
        },
      });
    });

    it('should handle unused query parameters', async () => {
      req.query = {
        search: 'john',
        _verificationStatus: 'verified',
        _sortBy: 'email',
        _sortOrder: 'ASC',
      };

      const mockResult = {
        users: [{ id: 'user-1', email: 'john@example.com' }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      MockedAdminService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await AdminController.getUsersAdmin(req as AuthenticatedRequest, res as Response);

      expect(MockedAdminService.getUsers).toHaveBeenCalledWith({
        search: 'john',
        status: undefined,
        userType: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should handle errors when fetching users', async () => {
      const error = new Error('Database error');
      MockedAdminService.getUsers = jest.fn().mockRejectedValue(error);

      await AdminController.getUsersAdmin(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error searching users:',
        expect.objectContaining({
          error: 'Database error',
          query: {},
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to search users',
        message: 'Database error',
      });
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      req.params = { userId: 'user-123' };
      req.body = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '+1234567890',
        userType: 'ADOPTER',
      };

      const mockUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+0987654321',
        userType: 'ADOPTER',
        save: jest.fn().mockResolvedValue(true),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedAuditLogService.log = jest.fn().mockResolvedValue(undefined);

      await AdminController.updateUserProfile(req as AuthenticatedRequest, res as Response);

      expect(MockedUser.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-123',
          action: 'UPDATE',
          entity: 'User',
          entityId: 'user-123',
          details: expect.any(Object),
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        })
      );
      expect(loggerHelpers.logRequest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-123',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
        }),
        message: 'User profile updated successfully',
      });
    });

    it('should update partial user profile fields', async () => {
      req.params = { userId: 'user-123' };
      req.body = {
        firstName: 'Jane',
      };

      const mockUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+0987654321',
        userType: 'ADOPTER',
        save: jest.fn().mockResolvedValue(true),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);
      MockedAuditLogService.log = jest.fn().mockResolvedValue(undefined);

      await AdminController.updateUserProfile(req as AuthenticatedRequest, res as Response);

      expect(mockUser.firstName).toBe('Jane');
      expect(mockUser.lastName).toBe('Doe'); // Should remain unchanged
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return error when user is not found', async () => {
      req.params = { userId: 'user-123' };
      req.body = { firstName: 'Jane' };

      MockedUser.findByPk = jest.fn().mockResolvedValue(null);

      await AdminController.updateUserProfile(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });

    it('should handle errors when updating user profile', async () => {
      req.params = { userId: 'user-123' };
      req.body = { firstName: 'Jane' };

      const error = new Error('Database error');
      MockedUser.findByPk = jest.fn().mockRejectedValue(error);

      await AdminController.updateUserProfile(req as AuthenticatedRequest, res as Response);

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating user profile:',
        expect.objectContaining({
          error: 'Database error',
          userId: 'user-123',
          duration: expect.any(Number),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update user profile',
        message: 'Database error',
      });
    });

    it('should handle save errors', async () => {
      req.params = { userId: 'user-123' };
      req.body = { firstName: 'Jane' };

      const mockUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+0987654321',
        userType: 'ADOPTER',
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      await AdminController.updateUserProfile(req as AuthenticatedRequest, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update user profile',
        message: 'Save failed',
      });
    });
  });
});
