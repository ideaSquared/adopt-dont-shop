import User, { UserStatus, UserType } from '../../models/User';
import UserService from '../../services/user.service';
import { UserUpdateData } from '../../types/user';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/AuditLog');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Sequelize and Op
jest.mock('sequelize', () => {
  const actualSequelize = jest.requireActual('sequelize');
  return {
    ...actualSequelize,
    Op: {
      gte: Symbol('gte'),
      lte: Symbol('lte'),
      iLike: Symbol('iLike'),
      or: Symbol('or'),
      ne: Symbol('ne'),
    },
  };
});

// Create proper mock for User model
const MockedUser = User as jest.Mocked<typeof User>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      const userId = 'user-123';
      const mockUser = {
        userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      };

      MockedUser.scope = jest.fn().mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await UserService.getUserById(userId, true);

      expect(MockedUser.scope).toHaveBeenCalledWith('withSecrets');
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent';
      MockedUser.scope = jest.fn().mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(null),
      });

      const result = await UserService.getUserById(userId);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const userId = 'user-123';
      MockedUser.scope = jest.fn().mockReturnValue({
        findByPk: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(UserService.getUserById(userId)).rejects.toThrow('Failed to retrieve user');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateData: UserUpdateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockUser = {
        userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          userId,
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        }),
        toJSON: jest.fn().mockReturnValue({
          userId,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.updateUserProfile(userId, updateData);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalledWith(updateData);
      expect(mockUser.reload).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent';
      const updateData: UserUpdateData = { firstName: 'Jane' };

      MockedUser.findByPk = jest.fn().mockResolvedValue(null);

      await expect(UserService.updateUserProfile(userId, updateData)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const filters = {
        search: 'john',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      };

      const options = {
        page: 1,
        limit: 10,
      };

      const mockUsers = [
        {
          userId: 'user-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: UserType.ADOPTER,
          status: UserStatus.ACTIVE,
        },
      ];

      MockedUser.findAndCountAll = jest.fn().mockResolvedValue({
        count: 1,
        rows: mockUsers,
      });

      const result = await UserService.searchUsers(filters, options);

      expect(MockedUser.findAndCountAll).toHaveBeenCalled();
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const userId = 'user-123';
      const preferences = {
        emailNotifications: false,
        pushNotifications: true,
        smsNotifications: false,
        privacySettings: {
          profileVisibility: 'public' as const,
          showLocation: true,
          showContactInfo: false,
        },
      };

      const mockUser = {
        userId,
        notificationPreferences: {
          emailNotifications: true,
          pushNotifications: false,
        },
        privacySettings: {
          profileVisibility: 'public',
        },
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          userId,
          notificationPreferences: {
            emailNotifications: false,
            pushNotifications: true,
          },
        }),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.updateUserPreferences(userId, preferences);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(userId);
      expect(mockUser.update).toHaveBeenCalled();
      expect(mockUser.reload).toHaveBeenCalled();
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity successfully', async () => {
      const userId = 'user-123';
      const mockUser = {
        userId,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.getUserActivity(userId);

      expect(result).toHaveProperty('applicationsCount');
      expect(result).toHaveProperty('activeChatsCount');
      expect(result).toHaveProperty('lastLogin');
      expect(result).toHaveProperty('accountCreated');
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent';
      MockedUser.findByPk = jest.fn().mockResolvedValue(null);

      await expect(UserService.getUserActivity(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserStatistics', () => {
    it('should get user statistics successfully', async () => {
      // Mock User.count calls
      MockedUser.count = jest
        .fn()
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(80) // active users
        .mockResolvedValueOnce(10) // new users this month
        .mockResolvedValueOnce(75); // verified users

      // Mock getUserCountByType
      MockedUser.findAll = jest
        .fn()
        .mockResolvedValueOnce([
          { user_type: UserType.ADOPTER, count: '70' },
          { user_type: UserType.RESCUE_STAFF, count: '25' },
          { user_type: UserType.ADMIN, count: '5' },
        ])
        .mockResolvedValueOnce([
          { status: UserStatus.ACTIVE, count: '80' },
          { status: UserStatus.INACTIVE, count: '15' },
          { status: UserStatus.PENDING_VERIFICATION, count: '5' },
        ]);

      const result = await UserService.getUserStatistics();

      expect(result).toHaveProperty('totalUsers', 100);
      expect(result).toHaveProperty('activeUsers', 80);
      expect(result).toHaveProperty('verifiedUsers', 75);
      expect(result).toHaveProperty('usersByType');
      expect(result).toHaveProperty('usersByStatus');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const userId = 'user-123';
      const newUserType = UserType.RESCUE_STAFF;
      const adminUserId = 'admin-123';

      const mockUser = {
        userId,
        userType: UserType.ADOPTER,
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          userId,
          userType: newUserType,
        }),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.updateUserRole(userId, newUserType, adminUserId);

      expect(mockUser.update).toHaveBeenCalledWith({ userType: newUserType });
      expect(mockUser.reload).toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const userId = 'user-123';
      const adminUserId = 'admin-456';
      const mockUser = {
        userId,
        status: UserStatus.ACTIVE,
        save: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          userId,
          status: UserStatus.INACTIVE,
        }),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.deactivateUser(userId, adminUserId);

      expect(mockUser.save).toHaveBeenCalled();
      expect(result.status).toBe(UserStatus.INACTIVE);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent';
      const adminUserId = 'admin-456';

      MockedUser.findByPk = jest.fn().mockResolvedValue(null);

      await expect(UserService.deactivateUser(userId, adminUserId)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      const userId = 'user-123';
      const adminUserId = 'admin-456';
      const mockUser = {
        userId,
        status: UserStatus.INACTIVE,
        save: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          userId,
          status: UserStatus.ACTIVE,
        }),
      };

      MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.reactivateUser(userId, adminUserId);

      expect(mockUser.save).toHaveBeenCalled();
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('bulkUpdateUsers', () => {
    it('should bulk update users successfully', async () => {
      const updates = [
        {
          userIds: ['user-1', 'user-2'],
          updates: {
            firstName: 'Updated',
            lastName: 'Name',
          },
        },
        {
          userIds: ['user-3'],
          updates: {
            firstName: 'Another',
            lastName: 'Update',
          },
        },
      ];
      const adminUserId = 'admin-456';

      MockedUser.update = jest.fn().mockResolvedValue([3]);

      const result = await UserService.bulkUpdateUsers(updates, adminUserId);

      expect(result).toBe(3);
    });
  });

  describe('canUserSeePrivateData', () => {
    it('should allow user to see their own data', () => {
      const userId = 'user-123';
      const result = UserService.canUserSeePrivateData(userId, userId, UserType.ADOPTER);
      expect(result).toBe(true);
    });

    it('should allow admin to see any user data', () => {
      const adminId = 'admin-123';
      const userId = 'user-456';
      const result = UserService.canUserSeePrivateData(adminId, userId, UserType.ADMIN);
      expect(result).toBe(true);
    });

    it('should not allow user to see other user data', () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const result = UserService.canUserSeePrivateData(userId1, userId2, UserType.ADOPTER);
      expect(result).toBe(false);
    });
  });

  describe('validateBulkOperation', () => {
    it('should throw error if user includes own account', () => {
      expect(() => {
        UserService.validateBulkOperation('user-1', ['user-2', 'user-1', 'user-3'], 'update');
      }).toThrow('Cannot include your own account in bulk update operation');
    });

    it('should not throw error if user does not include own account', () => {
      expect(() => {
        UserService.validateBulkOperation('user-1', ['user-2', 'user-3'], 'update');
      }).not.toThrow();
    });
  });

  describe('processSearchFilters', () => {
    it('should process search filters correctly', () => {
      const queryParams = {
        search: 'john',
        userType: 'adopter',
        status: 'active',
        emailVerified: 'true',
      };

      const result = UserService.processSearchFilters(queryParams);

      expect(result.search).toBe('john');
      expect(result.userType).toBe('adopter');
      expect(result.status).toBe('active');
      expect(result.emailVerified).toBe(true);
    });

    it('should handle boolean emailVerified values correctly', () => {
      const trueResult = UserService.processSearchFilters({ emailVerified: 'true' });
      const falseResult = UserService.processSearchFilters({ emailVerified: 'false' });
      const undefinedResult = UserService.processSearchFilters({ emailVerified: 'other' });

      expect(trueResult.emailVerified).toBe(true);
      expect(falseResult.emailVerified).toBe(false);
      expect(undefinedResult.emailVerified).toBe(undefined);
    });
  });

  describe('processPaginationOptions', () => {
    it('should process pagination options correctly', () => {
      const queryParams = {
        page: '2',
        limit: '25',
        sortBy: 'firstName',
        sortOrder: 'ASC',
      };

      const result = UserService.processPaginationOptions(queryParams);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.sortBy).toBe('firstName');
      expect(result.sortOrder).toBe('ASC');
    });
  });
});
