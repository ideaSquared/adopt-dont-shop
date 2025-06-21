import { Op } from 'sequelize';
import { AuditLog } from '../models/AuditLog';
import Role from '../models/Role';
import User, { UserStatus, UserType } from '../models/User';
import UserRole from '../models/UserRole';
import { logger, loggerHelpers } from '../utils/logger';

export interface UserSearchFilters {
  search?: string;
  role?: string;
  userType?: UserType;
  status?: UserStatus;
  isActive?: boolean;
  emailVerified?: boolean;
  rescueId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  bio?: string;
  profile_image_url?: string;
  timezone?: string;
  language?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  privacy_settings?: Record<string, any>;
  notification_preferences?: Record<string, any>;
}

export interface UserSearchResult {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<string, number>;
  recentRegistrations: number;
}

export class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
              },
            ],
          },
        ],
      });

      if (user) {
        loggerHelpers.logDatabase('READ', 'users', { userId });
      }

      return user;
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await User.findOne({
        where: { email: email.toLowerCase() },
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
              },
            ],
          },
        ],
      });

      return user;
    } catch (error) {
      logger.error('Failed to fetch user by email:', error);
      throw new Error('Failed to fetch user');
    }
  }

  static async updateUserProfile(userId: string, updateData: UserUpdateData): Promise<User> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Filter out undefined values
      const filteredData = Object.entries(updateData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      await user.update(filteredData);

      loggerHelpers.logBusinessEvent('User profile updated', {
        userId,
        updatedFields: Object.keys(filteredData),
      });

      // Audit log
      await AuditLog.create({
        service: 'user',
        user: userId,
        action: 'Profile update',
        level: 'INFO',
        timestamp: new Date(),
        category: 'USER_MANAGEMENT',
        metadata: {
          updatedFields: Object.keys(filteredData),
        },
      });

      return (await this.getUserById(userId)) as User;
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  static async searchUsers(
    filters: UserSearchFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<UserSearchResult> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;

      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      if (filters.search) {
        whereClause[Op.or] = [
          { first_name: { [Op.iLike]: `%${filters.search}%` } },
          { last_name: { [Op.iLike]: `%${filters.search}%` } },
          { email: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      if (filters.userType) {
        whereClause.user_type = filters.userType;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.emailVerified !== undefined) {
        whereClause.email_verified = filters.emailVerified;
      }

      if (filters.rescueId) {
        whereClause.rescue_id = filters.rescueId;
      }

      if (filters.createdAfter || filters.createdBefore) {
        whereClause.created_at = {};
        if (filters.createdAfter) {
          whereClause.created_at[Op.gte] = filters.createdAfter;
        }
        if (filters.createdBefore) {
          whereClause.created_at[Op.lte] = filters.createdBefore;
        }
      }

      const { rows: users, count } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
              },
            ],
          },
        ],
        order: [[sortBy, sortOrder]],
        limit,
        offset,
        distinct: true,
      });

      const totalPages = Math.ceil(count / limit);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: count,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw new Error('Failed to search users');
    }
  }

  static async getUserStatistics(): Promise<UserStatistics> {
    try {
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        userRoleCount,
        rescueRoleCount,
        adminRoleCount,
        recentRegistrations,
      ] = await Promise.all([
        User.count(),
        User.count({ where: { status: UserStatus.ACTIVE } }),
        User.count({ where: { email_verified: true } }),
        User.count({ where: { user_type: UserType.ADOPTER } }),
        User.count({ where: { user_type: UserType.RESCUE_STAFF } }),
        User.count({ where: { user_type: UserType.ADMIN } }),
        User.count({
          where: {
            created_at: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByRole: {
          user: userRoleCount,
          rescue: rescueRoleCount,
          admin: adminRoleCount,
        },
        recentRegistrations,
      };
    } catch (error) {
      logger.error('Failed to get user statistics:', error);
      throw new Error('Failed to get user statistics');
    }
  }

  static async updateUserRole(userId: string, roleId: string): Promise<User> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Remove existing roles
      await UserRole.destroy({ where: { user_id: userId } });

      // Add new role
      await UserRole.create({
        user_id: userId,
        role_id: roleId,
      });

      loggerHelpers.logBusinessEvent('User role updated', {
        userId,
        newRoleId: roleId,
        roleName: role.name,
      });

      // Audit log
      await AuditLog.create({
        service: 'user',
        user: userId,
        action: 'Role update',
        level: 'INFO',
        timestamp: new Date(),
        category: 'USER_MANAGEMENT',
        metadata: {
          newRoleId: roleId,
          roleName: role.name,
        },
      });

      return (await this.getUserById(userId)) as User;
    } catch (error) {
      logger.error('Failed to update user role:', error);
      throw error;
    }
  }

  static async bulkUpdateUsers(userIds: string[], updateData: Partial<User>): Promise<number> {
    try {
      const [affectedCount] = await User.update(updateData, {
        where: {
          user_id: {
            [Op.in]: userIds,
          },
        },
      });

      loggerHelpers.logBusinessEvent('Bulk user update', {
        affectedCount,
        userCount: userIds.length,
        updateFields: Object.keys(updateData),
      });

      return affectedCount;
    } catch (error) {
      logger.error('Failed to bulk update users:', error);
      throw new Error('Failed to bulk update users');
    }
  }

  static async deactivateUser(userId: string, reason?: string): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.status = UserStatus.INACTIVE;
      await user.save();

      loggerHelpers.logBusinessEvent('User deactivated', {
        userId,
        reason,
      });

      // Audit log
      await AuditLog.create({
        service: 'user',
        user: userId,
        action: 'User deactivation',
        level: 'WARNING',
        timestamp: new Date(),
        category: 'USER_MANAGEMENT',
        metadata: { reason },
      });
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      throw error;
    }
  }

  static async reactivateUser(userId: string): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.status = UserStatus.ACTIVE;
      user.login_attempts = 0;
      user.locked_until = null;
      await user.save();

      loggerHelpers.logBusinessEvent('User reactivated', { userId });

      // Audit log
      await AuditLog.create({
        service: 'user',
        user: userId,
        action: 'User reactivation',
        level: 'INFO',
        timestamp: new Date(),
        category: 'USER_MANAGEMENT',
      });
    } catch (error) {
      logger.error('Failed to reactivate user:', error);
      throw error;
    }
  }

  static async isUserActiveAndExists(userId: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      return user ? user.canLogin() : false;
    } catch (error) {
      logger.error('Failed to check user status:', error);
      return false;
    }
  }

  static async getUserActivitySummary(userId: string): Promise<any> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate activity metrics
      const daysSinceRegistration = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const daysSinceLastLogin = user.last_login_at
        ? Math.floor((Date.now() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        userId: user.user_id,
        registrationDate: user.created_at,
        lastLoginDate: user.last_login_at,
        daysSinceRegistration,
        daysSinceLastLogin,
        isActive: user.canLogin(),
        emailVerified: user.email_verified,
        status: user.status,
        loginAttempts: user.login_attempts,
        isLocked: user.isAccountLocked(),
      };
    } catch (error) {
      logger.error('Failed to get user activity summary:', error);
      throw error;
    }
  }

  static async getUserPreferences(userId: string): Promise<any> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return default preferences merged with user's preferences
      const defaultPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
        newsletter: true,
        adoptionAlerts: true,
        rescueUpdates: true,
        language: 'en',
        timezone: 'UTC',
        theme: 'light',
      };

      return {
        ...defaultPreferences,
        ...user.notification_preferences,
        privacy: user.privacy_settings,
      };
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  static async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Separate notification preferences from privacy settings
      const { privacy, ...notificationPrefs } = preferences;

      const updateData: any = {};

      if (Object.keys(notificationPrefs).length > 0) {
        updateData.notification_preferences = {
          ...user.notification_preferences,
          ...notificationPrefs,
        };
      }

      if (privacy) {
        updateData.privacy_settings = {
          ...user.privacy_settings,
          ...privacy,
        };
      }

      await user.update(updateData);

      loggerHelpers.logBusinessEvent('User preferences updated', {
        userId,
        updatedPreferences: Object.keys(preferences),
      });
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }
}

export default UserService;
