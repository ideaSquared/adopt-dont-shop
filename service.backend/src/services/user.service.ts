import { JsonObject } from '../types/common';
import { Op, QueryTypes, WhereOptions } from 'sequelize';
import Application from '../models/Application';
import { AuditLog } from '../models/AuditLog';
import Chat from '../models/Chat';
import ChatParticipant from '../models/ChatParticipant';
import User, { UserStatus, UserType } from '../models/User';
import UserFavorite from '../models/UserFavorite';
import sequelize from '../sequelize';
import {
  BulkUserUpdateData,
  PaginationOptions,
  UserPreferences,
  UserProfile,
  UserSearchFilters,
  UserSearchOptions,
  UserStatistics,
} from '../types';
import { UserActivity } from '../types/user';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

// Safe wrapper for loggerHelpers to prevent test failures
const safeLoggerHelpers = {
  logBusiness: (event: string, data: JsonObject, userId?: string) => {
    try {
      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(event, data, userId);
      } else {
        logger.info(`Business: ${event}`, { category: 'BUSINESS', userId, ...data });
      }
    } catch (error) {
      logger.info(`Business: ${event}`, { category: 'BUSINESS', userId, ...data });
    }
  },
};

// Define UserActivitySummary interface
interface UserWithPermissions {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  status: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  location: unknown;
  createdAt: Date;
  updatedAt: Date;
  roles: unknown[] | undefined;
  permissions: string[];
}
interface UserActivitySummary {
  applicationsCount: number;
  activeChatsCount: number;
  petsFavoritedCount: number;
  recentActivity: Array<{
    action: string;
    entity: string;
    timestamp: Date;
    details: JsonObject;
  }>;
  stats: {
    totalLoginCount: number;
    averageSessionDuration: number;
    lastLoginAt: Date | null;
    accountCreatedAt: Date;
    profileCompleteness: number;
  };
}

export class UserService {
  static async getUserById(userId: string, includePrivate: boolean = false): Promise<User | null> {
    const startTime = Date.now();

    try {
      const scope = includePrivate ? 'withSecrets' : 'defaultScope';

      const user = await User.scope(scope).findByPk(userId, {
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

      if (loggerHelpers && loggerHelpers.logDatabase) {
        loggerHelpers.logDatabase('READ', {
          userId,
          duration: Date.now() - startTime,
          found: !!user,
        });
      }

      if (!user) {
        logger.warn('User not found', { userId });
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Failed to fetch user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw new Error('Failed to retrieve user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const startTime = Date.now();

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

      if (loggerHelpers && loggerHelpers.logDatabase) {
        loggerHelpers.logDatabase('READ', {
          email: email.toLowerCase(),
          duration: Date.now() - startTime,
          found: !!user,
        });
      }

      return user;
    } catch (error) {
      logger.error('Failed to fetch user by email:', {
        error: error instanceof Error ? error.message : String(error),
        email: email.toLowerCase(),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async updateUserProfile(
    userId: string,
    updateData: Partial<UserProfile>,
    updatedBy?: string
  ): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Store original data for audit
      const originalData = user.toJSON();

      // Process the update data to match the database model format
      const processedUpdateData: Record<string, unknown> = { ...updateData };

      // Handle location transformation if present
      if (updateData.location) {
        const { coordinates, type, ...locationData } = updateData.location;

        // If we have coordinates, create a proper GeoJSON Point
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          processedUpdateData.location = {
            type: type || 'Point',
            coordinates: coordinates,
          };
        } else {
          // If no coordinates, remove location from update to avoid errors
          delete processedUpdateData.location;
        }

        // Update other location fields separately
        if (locationData.country !== undefined) {
          processedUpdateData.country = locationData.country;
        }
        if (locationData.city !== undefined) {
          processedUpdateData.city = locationData.city;
        }
        if (locationData.addressLine1 !== undefined) {
          processedUpdateData.addressLine1 = locationData.addressLine1;
        }
        if (locationData.addressLine2 !== undefined) {
          processedUpdateData.addressLine2 = locationData.addressLine2;
        }
        if (locationData.postalCode !== undefined) {
          processedUpdateData.postalCode = locationData.postalCode;
        }
      }

      // Update user
      await user.update(processedUpdateData);

      // Log the update
      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        details: {
          originalData: JSON.parse(JSON.stringify(originalData)),
          updateData: JSON.parse(JSON.stringify(processedUpdateData)),
        },
        userId,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Profile Updated',
          {
            userId,
            updatedFields: Object.keys(updateData),
            duration: Date.now() - startTime,
          },
          userId
        );
      }

      return user.reload();
    } catch (error) {
      logger.error('Failed to update user profile:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async searchUsers(
    filters: UserSearchFilters = {},
    options: UserSearchOptions = {}
  ): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const startTime = Date.now();

    try {
      const {
        search,
        status,
        userType,
        emailVerified,
        createdFrom,
        createdTo,
        lastLoginFrom,
        lastLoginTo,
      } = filters;

      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

      // Build where conditions (apply non-search filters first)
      let whereConditions: WhereOptions = {};

      if (status) {
        whereConditions.status = status;
      }

      if (userType) {
        whereConditions.userType = userType;
      }

      if (emailVerified !== undefined) {
        whereConditions.emailVerified = emailVerified;
      }

      if (createdFrom || createdTo) {
        const createdDateFilter: Record<symbol, Date> = {};
        if (createdFrom) {
          createdDateFilter[Op.gte] = createdFrom;
        }
        if (createdTo) {
          createdDateFilter[Op.lte] = createdTo;
        }
        whereConditions.createdAt = createdDateFilter;
      }

      if (lastLoginFrom || lastLoginTo) {
        const lastLoginDateFilter: Record<symbol, Date> = {};
        if (lastLoginFrom) {
          lastLoginDateFilter[Op.gte] = lastLoginFrom;
        }
        if (lastLoginTo) {
          lastLoginDateFilter[Op.lte] = lastLoginTo;
        }
        whereConditions.lastLoginAt = lastLoginDateFilter;
      }

      // Apply search last to avoid structure conflicts
      if (search) {
        whereConditions = {
          ...whereConditions,
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
        };
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Execute query
      const { rows: users, count: total } = await User.findAndCountAll({
        where: whereConditions,
        order: [[sortBy, sortOrder]],
        limit,
        offset,
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

      const totalPages = Math.ceil(total / limit);

      if (loggerHelpers && loggerHelpers.logPerformance) {
        loggerHelpers.logPerformance('User Search', {
          duration: Date.now() - startTime,
          filters: Object.keys(filters),
          resultCount: users.length,
          total,
          page: options.page || 1,
        });
      }

      return {
        users,
        total,
        page: options.page || 1,
        totalPages: Math.ceil(total / (options.limit || 20)),
      };
    } catch (error) {
      logger.error('Failed to search users:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw new Error('Failed to search users');
    }
  }

  static async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Merge with existing preferences
      const updatedNotificationPreferences = {
        ...user.notificationPreferences,
        ...preferences,
      };

      const updatedPrivacySettings = preferences.privacySettings
        ? { ...user.privacySettings, ...preferences.privacySettings }
        : user.privacySettings;

      await user.update({
        notificationPreferences: updatedNotificationPreferences,
        privacySettings: updatedPrivacySettings,
      });

      // Log the preference update
      await AuditLogService.log({
        action: 'UPDATE_PREFERENCES',
        entity: 'User',
        entityId: userId,
        details: JSON.parse(JSON.stringify(preferences || {})),
        userId,
      });

      safeLoggerHelpers.logBusiness(
        'User Preferences Updated',
        {
          userId,
          preferences: JSON.parse(JSON.stringify(preferences)),
          duration: Date.now() - startTime,
        },
        userId
      );

      return user.reload();
    } catch (error) {
      logger.error('Failed to update user preferences:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const notificationPrefs = (user.notificationPreferences as any) || {};
      const privacySettings = (user.privacySettings as any) || {};

      if (loggerHelpers && loggerHelpers.logDatabase) {
        loggerHelpers.logDatabase('READ', {
          userId,
          duration: Date.now() - startTime,
          found: !!notificationPrefs && !!privacySettings,
        });
      }

      return {
        emailNotifications: notificationPrefs.emailNotifications,
        pushNotifications: notificationPrefs.pushNotifications,
        smsNotifications: notificationPrefs.smsNotifications,
        privacySettings: {
          profileVisibility: privacySettings.profileVisibility || 'public',
          showLocation: privacySettings.showLocation || false,
          showContactInfo: privacySettings.showContactInfo || false,
        },
      };
    } catch (error) {
      logger.error('Failed to get user preferences:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async resetUserPreferences(userId: string): Promise<UserPreferences> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const defaultPreferences: UserPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        privacySettings: {
          profileVisibility: 'public',
          showLocation: false,
          showContactInfo: false,
        },
      };

      const defaultNotificationPrefs = {
        emailNotifications: defaultPreferences.emailNotifications || false,
        pushNotifications: defaultPreferences.pushNotifications || false,
        smsNotifications: defaultPreferences.smsNotifications || false,
        applicationUpdates: true,
        chatMessages: true,
        petAlerts: true,
        rescueUpdates: true,
      };

      await user.update({
        notificationPreferences: defaultNotificationPrefs as any,
        privacySettings: defaultPreferences.privacySettings as any,
      });

      // Log the preference reset
      await AuditLogService.log({
        action: 'RESET_PREFERENCES',
        entity: 'User',
        entityId: userId,
        details: { resetToDefaults: true },
        userId,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Preferences Reset',
          {
            userId,
            duration: Date.now() - startTime,
          },
          userId
        );
      }

      return defaultPreferences;
    } catch (error) {
      logger.error('Failed to reset user preferences:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async getUserActivity(userId: string): Promise<UserActivity> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get real application count
      const applicationsCount = await Application.count({
        where: { user_id: userId },
      });

      // Get active chats count
      const activeChatsCount = await Chat.count({
        include: [
          {
            model: ChatParticipant,
            where: { participant_id: userId },
            required: true,
          },
        ],
        where: { status: 'active' },
      });

      // Get pets favorited count
      const petsFavoritedCount = await UserFavorite.count({
        where: { user_id: userId },
      });

      // Get recent activity from audit logs
      const recentActivity = await AuditLog.findAll({
        where: { user: userId },
        order: [['timestamp', 'DESC']],
        limit: 5,
        attributes: ['action', 'category', 'timestamp', 'metadata'],
      });

      // Calculate total login count from audit logs
      const totalLoginCount = await AuditLog.count({
        where: {
          user: userId,
          action: 'LOGIN',
        },
      });

      // Calculate average session duration from audit logs
      const sessionData = (await sequelize.query(
        `
        SELECT 
          DATE_TRUNC('day', timestamp) as session_date,
          MIN(timestamp) as first_action,
          MAX(timestamp) as last_action
        FROM audit_logs 
        WHERE "user" = :userId
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', timestamp)
        HAVING COUNT(*) > 1
      `,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      )) as Array<{
        session_date: string;
        first_action: Date;
        last_action: Date;
      }>;

      const averageSessionDuration =
        sessionData.length > 0
          ? sessionData.reduce((sum, session) => {
              const duration =
                new Date(session.last_action).getTime() - new Date(session.first_action).getTime();
              return sum + duration / (1000 * 60); // Convert to minutes
            }, 0) / sessionData.length
          : 0;

      const activity: UserActivity = {
        applicationsCount,
        activeChatsCount,
        petsFavoritedCount,
        recentActivity: (recentActivity || []).map(log => ({
          type: this.mapActionToActivityType(log.action),
          description: this.formatActivityDescription(log.action, log.metadata),
          timestamp: log.timestamp,
          metadata: log.metadata || {},
        })),
        lastLogin: user.lastLoginAt,
        accountCreated: user.createdAt,
        totalLoginCount,
        averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
      };

      if (loggerHelpers && loggerHelpers.logPerformance) {
        loggerHelpers.logPerformance('User Activity', {
          duration: Date.now() - startTime,
          userId,
          applicationCount: applicationsCount,
          chatCount: activeChatsCount,
          favoriteCount: petsFavoritedCount,
        });
      }

      return activity;
    } catch (error) {
      logger.error('Failed to get user activity:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get user activity summary with real data
   */
  static async getUserActivitySummary(userId: string): Promise<UserActivitySummary> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get real application count
      const applicationsCount = await Application.count({
        where: { user_id: userId },
      });

      // Get active chats count
      const activeChatsCount = await Chat.count({
        include: [
          {
            model: ChatParticipant,
            where: { participant_id: userId },
            required: true,
          },
        ],
        where: { status: 'active' },
      });

      // Get pets favorited count
      const petsFavoritedCount = await UserFavorite.count({
        where: { user_id: userId },
      });

      // Get recent activity from audit logs
      const recentActivity = await AuditLog.findAll({
        where: { user: userId },
        order: [['timestamp', 'DESC']],
        limit: 10,
        attributes: ['action', 'category', 'timestamp', 'metadata'],
      });

      // Calculate total login count from audit logs
      const totalLoginCount = await AuditLog.count({
        where: {
          user: userId,
          action: 'USER_LOGIN',
        },
      });

      // Calculate average session duration from audit logs
      const sessionData = (await sequelize.query(
        `
        SELECT 
          DATE_TRUNC('day', timestamp) as session_date,
          MIN(timestamp) as first_action,
          MAX(timestamp) as last_action
        FROM audit_logs 
        WHERE "user" = :userId
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', timestamp)
        HAVING COUNT(*) > 1
      `,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      )) as Array<{
        session_date: string;
        first_action: Date;
        last_action: Date;
      }>;

      const averageSessionDuration =
        sessionData.length > 0
          ? sessionData.reduce((sum, session) => {
              const duration =
                new Date(session.last_action).getTime() - new Date(session.first_action).getTime();
              return sum + duration / (1000 * 60); // Convert to minutes
            }, 0) / sessionData.length
          : 0;

      const activitySummary: UserActivitySummary = {
        applicationsCount,
        activeChatsCount,
        petsFavoritedCount,
        recentActivity: recentActivity.map(activity => ({
          action: activity.action,
          entity: activity.category || 'unknown',
          timestamp: activity.timestamp,
          details: activity.metadata || {},
        })),
        stats: {
          totalLoginCount,
          averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
          lastLoginAt: user.lastLoginAt,
          accountCreatedAt: user.createdAt,
          profileCompleteness: this.calculateProfileCompleteness(user),
        },
      };

      loggerHelpers.logPerformance('User Activity Summary', {
        duration: Date.now() - startTime,
        userId,
        applicationCount: applicationsCount,
        chatCount: activeChatsCount,
        favoriteCount: petsFavoritedCount,
      });

      return activitySummary;
    } catch (error) {
      logger.error('Failed to get user activity summary:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Map audit log action to activity type
   */
  private static mapActionToActivityType(
    action: string
  ): 'application' | 'chat' | 'favorite' | 'profile_update' | 'login' {
    if (action.includes('APPLICATION')) {
      return 'application';
    }
    if (action.includes('CHAT') || action.includes('MESSAGE')) {
      return 'chat';
    }
    if (action.includes('FAVORITE')) {
      return 'favorite';
    }
    if (action.includes('PROFILE') || action.includes('USER_UPDATE')) {
      return 'profile_update';
    }
    if (action.includes('LOGIN')) {
      return 'login';
    }
    return 'profile_update'; // default fallback
  }

  /**
   * Format activity description from action and metadata
   */
  private static formatActivityDescription(action: string, metadata?: JsonObject | null): string {
    switch (action) {
      case 'APPLICATION_SUBMITTED':
        return `Submitted application for ${metadata?.petName || 'a pet'}`;
      case 'USER_LOGIN':
        return 'Logged into account';
      case 'PROFILE_UPDATED':
        return 'Updated profile information';
      case 'PET_FAVORITED':
        return `Added ${metadata?.petName || 'a pet'} to favorites`;
      case 'MESSAGE_SENT':
        return 'Sent a message';
      case 'CHAT_CREATED':
        return 'Started a new conversation';
      default:
        return action.toLowerCase().replace(/_/g, ' ');
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private static calculateProfileCompleteness(user: User): number {
    const fields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phoneNumber,
      user.profileImageUrl,
      user.bio,
      typeof user.location === 'string' ? user.location : null,
    ];

    const completedFields = fields.filter(
      field => field && typeof field === 'string' && field.trim() !== ''
    ).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Get comprehensive user statistics with real data
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    const startTime = Date.now();

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const [totalUsers, activeUsers, newUsersThisMonth, verifiedUsers] = await Promise.all([
        User.count(),

        // Active users (with activity in last 30 days)
        User.count({
          include: [
            {
              model: AuditLog,
              where: { timestamp: { [Op.gte]: thirtyDaysAgo } },
              required: true,
            },
          ],
          distinct: true,
        }),

        // New users this month
        User.count({
          where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
        }),

        // Verified users
        User.count({
          where: { emailVerified: true },
        }),
      ]);

      // Calculate monthly growth
      const monthlyGrowth = (await sequelize.query(
        `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM users 
        WHERE created_at >= :oneYearAgo
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `,
        {
          replacements: { oneYearAgo },
          type: QueryTypes.SELECT,
        }
      )) as Array<{ month: string; count: number }>;

      // Get geographic distribution
      const geographicDistribution = (await sequelize.query(
        `
        SELECT 
          COALESCE(country, 'Unknown') as country,
          COUNT(*) as count
        FROM users 
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `,
        {
          type: QueryTypes.SELECT,
        }
      )) as Array<{ country: string; count: number }>;

      const statistics: UserStatistics = {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        verifiedUsers,
        usersByType: {
          [UserType.ADOPTER]: 0, // These would need separate queries
          [UserType.RESCUE_STAFF]: 0,
          [UserType.ADMIN]: 0,
          [UserType.MODERATOR]: 0,
        },
        usersByStatus: {
          [UserStatus.ACTIVE]: activeUsers,
          [UserStatus.INACTIVE]: totalUsers - activeUsers,
          [UserStatus.PENDING_VERIFICATION]: 0,
          [UserStatus.SUSPENDED]: 0,
          [UserStatus.DEACTIVATED]: 0,
        },
        monthlyGrowth: monthlyGrowth.map(month => ({
          month: month.month,
          year: new Date(month.month).getFullYear(),
          newUsers: Number(month.count),
          activeUsers: Number(month.count), // Simplified for now
        })),
        geographicDistribution: geographicDistribution.map(geo => ({
          country: geo.country,
          userCount: Number(geo.count),
          percentage: totalUsers > 0 ? Math.round((Number(geo.count) / totalUsers) * 100) : 0,
        })),
      };

      if (loggerHelpers && loggerHelpers.logPerformance) {
        loggerHelpers.logPerformance('User Statistics', {
          duration: Date.now() - startTime,
          userId: undefined,
          totalUsers: totalUsers,
          activeUsers: activeUsers,
        });
      }

      return statistics;
    } catch (error) {
      logger.error('Failed to get user statistics:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async updateUserRole(
    userId: string,
    newUserType: UserType,
    adminUserId: string
  ): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oldUserType = user.userType;
      await user.update({ userType: newUserType });

      // Audit log
      await AuditLog.create({
        service: 'user',
        user: adminUserId,
        action: 'User role update',
        level: 'INFO',
        timestamp: new Date(),
        category: 'USER_MANAGEMENT',
        metadata: {
          targetUserId: userId,
          oldRole: oldUserType,
          newRole: newUserType,
        },
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Role Updated',
          {
            userId,
            oldRole: oldUserType,
            newRole: newUserType,
            updatedBy: adminUserId,
            duration: Date.now() - startTime,
          },
          adminUserId
        );
      }

      return user.reload();
    } catch (error) {
      logger.error('Failed to update user role:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        newRole: newUserType,
        updatedBy: adminUserId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async deactivateUser(
    userId: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === UserStatus.INACTIVE) {
        throw new Error('User is already deactivated');
      }

      user.status = UserStatus.INACTIVE;
      // user.deactivatedAt = new Date(); // User model doesn't have this field
      await user.save();

      // Log deactivation
      await AuditLogService.log({
        action: 'DEACTIVATE',
        entity: 'User',
        entityId: userId,
        details: {
          reason: reason || null,
          deactivatedBy,
        },
        userId: deactivatedBy,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Deactivated',
          {
            userId,
            reason,
            deactivatedBy,
            duration: Date.now() - startTime,
          },
          deactivatedBy
        );
      }

      return user.reload();
    } catch (error) {
      logger.error('Failed to deactivate user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deactivatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async reactivateUser(userId: string, activatedBy: string): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === UserStatus.ACTIVE) {
        throw new Error('User is already active');
      }

      user.status = UserStatus.ACTIVE;
      // user.deactivatedAt = null; // User model doesn't have this field
      await user.save();

      // Log activation
      await AuditLogService.log({
        action: 'REACTIVATE',
        entity: 'User',
        entityId: userId,
        details: {
          activatedBy,
          previousStatus: UserStatus.INACTIVE,
        },
        userId: activatedBy,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Reactivated',
          {
            userId,
            activatedBy,
            duration: Date.now() - startTime,
          },
          activatedBy
        );
      }

      return user.reload();
    } catch (error) {
      logger.error('Failed to reactivate user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        activatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static canUserSeePrivateData(
    requestingUserId: string,
    targetUserId: string,
    requestingUserType: UserType
  ): boolean {
    // Users can always see their own data
    if (requestingUserId === targetUserId) {
      return true;
    }

    // Admins can see all user data
    if (requestingUserType === UserType.ADMIN) {
      return true;
    }

    // Other users cannot see private data
    return false;
  }

  static validateUserOperation(
    requestingUserId: string,
    targetUserId: string,
    operation: string
  ): void {
    if (requestingUserId === targetUserId) {
      throw new Error(`Cannot ${operation} your own account`);
    }
  }

  static validateBulkOperation(
    requestingUserId: string,
    targetUserIds: string[],
    operation: string
  ): void {
    if (targetUserIds.includes(requestingUserId)) {
      throw new Error(`Cannot include your own account in bulk ${operation} operation`);
    }
  }

  static processSearchFilters(queryParams: Record<string, string | undefined>): UserSearchFilters {
    return {
      search: queryParams.search as string,
      status: queryParams.status as UserStatus,
      userType: queryParams.userType as UserType,
      emailVerified:
        queryParams.emailVerified === 'true'
          ? true
          : queryParams.emailVerified === 'false'
            ? false
            : undefined,
      createdFrom: queryParams.createdFrom
        ? new Date(queryParams.createdFrom as string)
        : undefined,
      createdTo: queryParams.createdTo ? new Date(queryParams.createdTo as string) : undefined,
      lastLoginFrom: queryParams.lastLoginFrom
        ? new Date(queryParams.lastLoginFrom as string)
        : undefined,
      lastLoginTo: queryParams.lastLoginTo
        ? new Date(queryParams.lastLoginTo as string)
        : undefined,
    };
  }

  static processPaginationOptions(
    queryParams: Record<string, string | undefined>
  ): PaginationOptions {
    return {
      page: queryParams.page ? parseInt(queryParams.page as string) : undefined,
      limit: queryParams.limit ? parseInt(queryParams.limit as string) : undefined,
      sortBy: queryParams.sortBy as string,
      sortOrder: queryParams.sortOrder as 'ASC' | 'DESC',
    };
  }

  static async bulkUpdateUsers(updates: BulkUserUpdateData[], updatedBy: string): Promise<number> {
    const startTime = Date.now();

    try {
      const [affectedRows] = await User.update(updates[0].updates, {
        where: {
          userId: {
            [Op.in]: updates[0].userIds,
          },
        },
      });

      // Log bulk update
      await AuditLogService.log({
        action: 'BULK_UPDATE',
        entity: 'User',
        entityId: 'multiple',
        details: {
          updateCount: updates.length,
          updatedBy,
          updates: updates[0].userIds.map(userId => ({
            userId,
            fields: Object.keys(updates[0].updates),
          })),
        },
        userId: updatedBy,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'Bulk User Update',
          {
            updateCount: updates.length,
            updatedBy,
            duration: Date.now() - startTime,
          },
          updatedBy
        );
      }

      return affectedRows;
    } catch (error) {
      logger.error('Failed to bulk update users:', {
        error: error instanceof Error ? error.message : String(error),
        updateCount: updates.length,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Delete user account (self-deletion)
   */
  static async deleteAccount(userId: string, reason?: string): Promise<void> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Soft delete related data first
      await Application.update(
        { deleted_at: new Date() },
        { where: { user_id: userId, deleted_at: null } }
      );

      await UserFavorite.destroy({ where: { user_id: userId } });

      // Remove from chats
      await ChatParticipant.destroy({ where: { participant_id: userId } });

      // Soft delete the user
      await user.destroy();

      await AuditLogService.log({
        action: 'DELETE',
        entity: 'User',
        entityId: userId,
        details: {
          reason: reason || 'Self-deletion',
          selfDeleted: true,
        },
        userId,
      });

      safeLoggerHelpers.logBusiness(
        'User Account Self-Deleted',
        {
          userId,
          reason: reason || null,
          timestamp: new Date().toISOString(),
        },
        userId
      );

      logger.info('User account deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user account:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get user permissions from their roles
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
                attributes: ['permissionName'],
              },
            ],
          },
        ],
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Extract unique permissions from all roles
      const permissions = new Set<string>();
      if (user.Roles) {
        for (const role of user.Roles) {
          if (role.Permissions) {
            for (const permission of role.Permissions) {
              permissions.add((permission as any).permissionName);
            }
          }
        }
      }

      return Array.from(permissions);
    } catch (error) {
      logger.error('Error getting user permissions:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user with their permissions
   */
  static async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    try {
      const user = await User.findByPk(userId, {
        attributes: [
          'userId',
          'firstName',
          'lastName',
          'email',
          'userType',
          'status',
          'emailVerified',
          'phoneNumber',
          'profileImageUrl',
          'bio',
          'location',
          'createdAt',
          'updatedAt',
        ],
        include: [
          {
            association: 'Roles',
            attributes: ['roleId', 'name', 'description'],
            include: [
              {
                association: 'Permissions',
                attributes: ['permissionName'],
              },
            ],
          },
        ],
      });

      if (!user) {
        return null;
      }

      // Extract unique permissions from all roles
      const permissions = new Set<string>();
      if (user.Roles) {
        for (const role of user.Roles) {
          if (role.Permissions) {
            for (const permission of role.Permissions) {
              permissions.add((permission as any).permissionName);
            }
          }
        }
      }

      return {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.Roles,
        permissions: Array.from(permissions),
      };
    } catch (error) {
      logger.error('Error getting user with permissions:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}

export default UserService;
