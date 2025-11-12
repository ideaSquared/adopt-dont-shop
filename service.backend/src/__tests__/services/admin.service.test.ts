// Mock sequelize first
const mockSequelizeQuery = jest.fn().mockResolvedValue([]);
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    query: mockSequelizeQuery,
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

// Mock models
const mockAuditLogFindAll = jest.fn().mockResolvedValue([]);
jest.mock('../../models/User');
jest.mock('../../models/Rescue');
jest.mock('../../models/Pet');
jest.mock('../../models/Application');
jest.mock('../../models/AuditLog', () => {
  const mockModel = {
    findAll: mockAuditLogFindAll,
    findAndCountAll: jest.fn(),
    count: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockModel,
  };
});

// Mock audit log service
const mockAuditLogAction = jest.fn().mockResolvedValue(undefined);
const mockGetLogs = jest.fn().mockResolvedValue({ rows: [], count: 0 });
jest.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: mockAuditLogAction,
    getLogs: mockGetLogs,
  },
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
  logger: mockLogger,
  loggerHelpers: {
    logBusiness: jest.fn(),
    logDatabase: jest.fn(),
    logPerformance: jest.fn(),
    logExternalService: jest.fn(),
  },
}));

import User, { UserStatus, UserType } from '../../models/User';
import Rescue from '../../models/Rescue';
import Pet from '../../models/Pet';
import Application from '../../models/Application';
import AuditLog from '../../models/AuditLog';
import AdminService from '../../services/admin.service';

const MockedUser = User as jest.Mocked<typeof User>;
const MockedRescue = Rescue as jest.Mocked<typeof Rescue>;
const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    describe('when getting users with filters', () => {
      it('should return paginated list of users', async () => {
        const mockUsers = [
          {
            userId: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: UserStatus.ACTIVE,
            userType: UserType.ADOPTER,
          },
          {
            userId: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            status: UserStatus.ACTIVE,
            userType: UserType.ADOPTER,
          },
        ];

        (MockedUser.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockUsers,
          count: 2,
        });

        const result = await AdminService.getUsers({ page: 1, limit: 10 });

        expect(result.users).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(MockedUser.findAndCountAll).toHaveBeenCalled();
      });

      it('should filter users by status', async () => {
        (MockedUser.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await AdminService.getUsers({ status: UserStatus.SUSPENDED });

        expect(MockedUser.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: UserStatus.SUSPENDED,
            }),
          })
        );
      });

      it('should filter users by user type', async () => {
        (MockedUser.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await AdminService.getUsers({ userType: UserType.RESCUE_STAFF });

        expect(MockedUser.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userType: UserType.RESCUE_STAFF,
            }),
          })
        );
      });

      it('should search users by name or email', async () => {
        (MockedUser.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await AdminService.getUsers({ search: 'john' });

        expect(MockedUser.findAndCountAll).toHaveBeenCalled();
      });
    });

    describe('when getting user by ID', () => {
      it('should return user with full details', async () => {
        const mockUser = {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: UserStatus.ACTIVE,
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        const result = await AdminService.getUserById('user-123');

        expect(result).toEqual(mockUser);
        expect(MockedUser.findByPk).toHaveBeenCalledWith('user-123', expect.any(Object));
      });

      it('should return null when user not found', async () => {
        (MockedUser.findByPk as jest.Mock).mockResolvedValue(null);

        const result = await AdminService.getUserById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('when updating user status', () => {
      it('should update user status and log the change', async () => {
        const mockUser = {
          userId: 'user-123',
          status: UserStatus.ACTIVE,
          save: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        await AdminService.updateUserStatus('user-123', UserStatus.SUSPENDED, 'admin-456');

        expect(mockUser.save).toHaveBeenCalled();
        expect(mockUser.status).toBe(UserStatus.SUSPENDED);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE_STATUS',
            entity: 'User',
            entityId: 'user-123',
          })
        );
      });

      it('should throw error when user not found', async () => {
        (MockedUser.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(
          AdminService.updateUserStatus('nonexistent', UserStatus.ACTIVE, 'admin-456')
        ).rejects.toThrow('User not found');
      });
    });

    describe('when suspending a user', () => {
      it('should suspend user and create audit log', async () => {
        const mockUser = {
          userId: 'user-123',
          status: UserStatus.ACTIVE,
          save: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        const result = await AdminService.suspendUser('user-123', 'admin-456', 'Spam activity');

        expect(mockUser.save).toHaveBeenCalled();
        expect(mockUser.status).toBe(UserStatus.SUSPENDED);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'SUSPEND',
            entity: 'User',
            entityId: 'user-123',
            details: expect.objectContaining({
              reason: 'Spam activity',
            }),
          })
        );

        expect(result).toEqual(mockUser);
      });
    });

    describe('when unsuspending a user', () => {
      it('should restore user to active status', async () => {
        const mockUser = {
          userId: 'user-123',
          status: UserStatus.SUSPENDED,
          save: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        await AdminService.unsuspendUser('user-123', 'admin-456');

        expect(mockUser.save).toHaveBeenCalled();
        expect(mockUser.status).toBe(UserStatus.ACTIVE);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UNSUSPEND',
            entity: 'User',
          })
        );
      });
    });

    describe('when deleting a user', () => {
      it('should soft delete user and log the action', async () => {
        const mockUser = {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          destroy: jest.fn().mockResolvedValue(undefined),
          toJSON: jest.fn().mockReturnValue({
            userId: 'user-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        await AdminService.deleteUser('user-123', 'admin-456', 'Account closure request');

        expect(mockUser.destroy).toHaveBeenCalled();

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'DELETE',
            entity: 'User',
            entityId: 'user-123',
            details: expect.objectContaining({
              reason: 'Account closure request',
            }),
          })
        );
      });
    });

    describe('when verifying a user', () => {
      it('should mark user as verified', async () => {
        const mockUser = {
          userId: 'user-123',
          emailVerified: false,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

        await AdminService.verifyUser('user-123', 'admin-456');

        expect(mockUser.update).toHaveBeenCalledWith({
          emailVerified: true,
        });

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_VERIFIED',
            entity: 'User',
          })
        );
      });
    });
  });

  describe('Rescue Management', () => {
    describe('when getting rescues', () => {
      it('should return paginated list of rescues', async () => {
        const mockRescues = [
          {
            rescueId: 'rescue-1',
            name: 'Happy Paws Rescue',
            verified: true,
          },
          {
            rescueId: 'rescue-2',
            name: 'Pet Haven',
            verified: false,
          },
        ];

        (MockedRescue.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockRescues,
          count: 2,
        });

        const result = await AdminService.getRescues({ page: 1, limit: 10 });

        expect(result.rescues).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(MockedRescue.findAndCountAll).toHaveBeenCalled();
      });

      it('should filter rescues by status', async () => {
        (MockedRescue.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await AdminService.getRescues({ status: 'verified' });

        expect(MockedRescue.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'verified',
            }),
          })
        );
      });
    });

    describe('when verifying a rescue', () => {
      it('should mark rescue as verified and log action', async () => {
        const mockRescue = {
          rescueId: 'rescue-123',
          name: 'Pet Rescue Org',
          status: 'pending',
          verifiedAt: null,
          save: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedRescue.findByPk as jest.Mock).mockResolvedValue(mockRescue);

        const result = await AdminService.verifyRescue('rescue-123', 'admin-456');

        expect(mockRescue.save).toHaveBeenCalled();
        expect(mockRescue.status).toBe('verified');
        expect(mockRescue.verifiedAt).toBeInstanceOf(Date);

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'VERIFY_RESCUE',
            entity: 'Rescue',
            entityId: 'rescue-123',
          })
        );

        expect(result).toEqual(mockRescue);
      });

      it('should throw error when rescue not found', async () => {
        (MockedRescue.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(AdminService.verifyRescue('nonexistent', 'admin-456')).rejects.toThrow(
          'Rescue not found'
        );
      });
    });

    describe('when rejecting rescue verification', () => {
      it('should update rescue status and log rejection', async () => {
        const mockRescue = {
          rescueId: 'rescue-123',
          verified: false,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedRescue.findByPk as jest.Mock).mockResolvedValue(mockRescue);

        await AdminService.rejectRescueVerification(
          'rescue-123',
          'admin-456',
          'Incomplete documentation'
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'RESCUE_VERIFICATION_REJECTED',
            entity: 'Rescue',
            details: expect.objectContaining({
              reason: 'Incomplete documentation',
            }),
          })
        );
      });
    });
  });

  describe('System Health and Metrics', () => {
    describe('when getting system health', () => {
      it('should return health status indicators', async () => {
        (MockedUser.findOne as jest.Mock).mockResolvedValue({ userId: 'test' });

        const result = await AdminService.getSystemHealth();

        expect(result).toHaveProperty('database');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('uptime');
        expect(result).toHaveProperty('memory');
        expect(result.database).toBe('healthy');
        expect(MockedUser.findOne).toHaveBeenCalled();
      });
    });

    describe('when getting platform metrics', () => {
      it('should return comprehensive platform statistics', async () => {
        (MockedUser.count as jest.Mock).mockResolvedValue(500);
        (MockedRescue.count as jest.Mock).mockResolvedValue(50);
        (MockedPet.count as jest.Mock).mockResolvedValue(200);
        (MockedApplication.count as jest.Mock).mockResolvedValue(300);
        mockSequelizeQuery.mockResolvedValueOnce([
          { role_name: 'admin', count: 10 },
          { role_name: 'user', count: 490 },
        ]);

        const result = await AdminService.getPlatformMetrics();

        expect(result).toHaveProperty('users');
        expect(result).toHaveProperty('rescues');
        expect(result).toHaveProperty('pets');
        expect(result).toHaveProperty('applications');
        expect(result.users.total).toBe(500);
        expect(result.rescues.total).toBe(50);
      });
    });

    describe('when getting system statistics', () => {
      it('should return detailed system statistics', async () => {
        (MockedUser.count as jest.Mock).mockResolvedValue(1000);
        (MockedRescue.count as jest.Mock).mockResolvedValue(100);
        (MockedPet.count as jest.Mock).mockResolvedValue(400);
        (MockedApplication.count as jest.Mock).mockResolvedValue(500);
        mockAuditLogFindAll.mockResolvedValueOnce([]);

        const result = await AdminService.getSystemStatistics();

        expect(result).toHaveProperty('totalUsers');
        expect(result).toHaveProperty('totalRescues');
        expect(result).toHaveProperty('totalPets');
        expect(result).toHaveProperty('totalApplications');
      });
    });
  });

  describe('Audit Logs', () => {
    describe('when getting audit logs', () => {
      it('should return paginated audit logs', async () => {
        const mockLogs = [
          {
            id: 'log-1',
            action: 'USER_CREATED',
            category: 'User',
            user: 'admin-456',
            timestamp: new Date(),
            level: 'info',
            status: 'success',
          },
          {
            id: 'log-2',
            action: 'USER_SUSPENDED',
            category: 'User',
            user: 'admin-456',
            timestamp: new Date(),
            level: 'warning',
            status: 'success',
          },
        ];

        mockGetLogs.mockResolvedValueOnce({
          rows: mockLogs,
          count: 2,
        });

        const result = await AdminService.getAuditLogs({ page: 1, limit: 20 });

        expect(result.logs).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(mockGetLogs).toHaveBeenCalled();
      });

      it('should filter audit logs by entity type', async () => {
        mockGetLogs.mockResolvedValueOnce({
          rows: [],
          count: 0,
        });

        await AdminService.getAuditLogs({ entity: 'User' });

        expect(mockGetLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'User',
          }),
          expect.any(Object)
        );
      });

      it('should filter audit logs by action type', async () => {
        mockGetLogs.mockResolvedValueOnce({
          rows: [],
          count: 0,
        });

        await AdminService.getAuditLogs({ action: 'USER_SUSPENDED' });

        expect(mockGetLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_SUSPENDED',
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('when performing bulk user operations', () => {
      it('should update multiple users and log each action', async () => {
        const mockUsers = [
          {
            userId: 'user-1',
            status: UserStatus.ACTIVE,
            save: jest.fn().mockResolvedValue(undefined),
          },
          {
            userId: 'user-2',
            status: UserStatus.ACTIVE,
            save: jest.fn().mockResolvedValue(undefined),
          },
        ];

        (MockedUser.findByPk as jest.Mock)
          .mockResolvedValueOnce(mockUsers[0])
          .mockResolvedValueOnce(mockUsers[1]);

        const result = await AdminService.bulkUserOperation(
          ['user-1', 'user-2'],
          'suspend',
          'admin-456'
        );

        expect(mockUsers[0].save).toHaveBeenCalled();
        expect(mockUsers[1].save).toHaveBeenCalled();
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(0);
      });

      it('should handle partial failures gracefully', async () => {
        const mockUser = {
          userId: 'user-1',
          status: UserStatus.ACTIVE,
          save: jest.fn().mockResolvedValue(undefined),
        };

        (MockedUser.findByPk as jest.Mock)
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null); // Second user not found

        const result = await AdminService.bulkUserOperation(
          ['user-1', 'user-999'],
          'suspend',
          'admin-456'
        );

        expect(result.successful).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should log errors when user operations fail', async () => {
      (MockedUser.findByPk as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AdminService.getUserById('user-123')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log errors when rescue operations fail', async () => {
      (MockedRescue.findByPk as vi.Mock).mockRejectedValue(new Error('Connection error'));

      await expect(AdminService.verifyRescue('rescue-123', 'admin-456')).rejects.toThrow();
    });

    it('should handle errors in platform metrics gracefully', async () => {
      (MockedUser.count as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(AdminService.getPlatformMetrics()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
