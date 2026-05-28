import { z } from 'zod';
import { normalizeEmail } from '@adopt-dont-shop/lib.validation';
import type {
  UserActivity as SharedUserActivity,
  UserActivityFilters,
  UserActivityType,
} from '@adopt-dont-shop/lib.types';
import { JsonObject } from '../types/common';
import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { validateSortField } from '../utils/sort-validation';
import { escapeLikePattern } from '../utils/escape-like';
import Application from '../models/Application';
import { AuditLog } from '../models/AuditLog';
import Chat from '../models/Chat';
import ChatParticipant from '../models/ChatParticipant';
import User, { UserStatus, UserType } from '../models/User';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import UserPrivacyPrefs, { ProfileVisibility } from '../models/UserPrivacyPrefs';
import sequelize from '../sequelize';
import {
  BulkUserUpdateData,
  PaginationOptions,
  UserPreferences,
  UserSearchFilters,
  UserSearchOptions,
  UserStatistics,
} from '../types';
import { UserActivity } from '../types/user';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../middleware/error-handler';
import { isAdminRole } from '../utils/is-admin-role';
import { redactSensitiveFields } from '../utils/redact';
import RefreshToken from '../models/RefreshToken';
import { invalidateAuthCache } from '../lib/auth-cache';
import { emitAuthRoleChanged } from '../socket/socket-registry';

const USER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'email',
  'firstName',
  'lastName',
  'status',
] as const;

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

// Internal user shape for service-layer returns
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

// UserActivitySummary contract lives in @adopt-dont-shop/lib.types.
// The internal builder returns Date objects (serialised to ISO 8601 by
// express's res.json), which match the wire-format `string` fields in
// the shared type.
type UserActivitySummaryInternal = {
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
};

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  location: z
    .object({
      type: z.string().optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  privacySettings: z
    .object({
      profileVisibility: z.enum(['public', 'private', 'rescue_only']).optional(),
      showLocation: z.boolean().optional(),
      allowMessages: z.boolean().optional(),
      showAdoptionHistory: z.boolean().optional(),
      showContactInfo: z.boolean().optional(),
      allowSearchIndexing: z.boolean().optional(),
    })
    .optional(),
  notificationPreferences: z
    .object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      applicationUpdates: z.boolean().optional(),
      chatMessages: z.boolean().optional(),
      petAlerts: z.boolean().optional(),
      rescueUpdates: z.boolean().optional(),
    })
    .optional(),
});

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
    const normalized = normalizeEmail(email);

    try {
      const user = await User.findOne({
        where: { email: normalized },
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
          email: normalized,
          duration: Date.now() - startTime,
          found: !!user,
        });
      }

      return user;
    } catch (error) {
      logger.error('Failed to fetch user by email:', {
        error: error instanceof Error ? error.message : String(error),
        email: normalized,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async updateUserProfile(
    userId: string,
    updateData: Record<string, unknown>,
    updatedBy?: string
  ): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Store original data for audit
      const originalData = user.toJSON();

      // Validate and whitelist allowed fields to prevent mass assignment
      const safeData = UpdateProfileSchema.parse(updateData);

      // Process the update data to match the database model format
      const processedUpdateData: Record<string, unknown> = { ...safeData };

      // Handle location transformation if present
      if (safeData.location) {
        const { coordinates, type, ...locationData } = safeData.location;

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
          originalData: redactSensitiveFields(
            JSON.parse(JSON.stringify(originalData))
          ) as JsonObject,
          updateData: redactSensitiveFields(
            JSON.parse(JSON.stringify(processedUpdateData))
          ) as JsonObject,
        },
        userId,
      });

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'User Profile Updated',
          {
            userId,
            updatedFields: Object.keys(safeData),
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
      // Use Op.like for SQLite compatibility (iLike is PostgreSQL-specific)
      // Escape LIKE wildcards to prevent enumeration attacks (%  = any chars, _ = one char)
      if (search) {
        const safeTerm = `%${escapeLikePattern(search)}%`;

        whereConditions = {
          ...whereConditions,
          [Op.or]: [
            { firstName: { [Op.like]: safeTerm } },
            { lastName: { [Op.like]: safeTerm } },
            { email: { [Op.like]: safeTerm } },
          ],
        };
      }

      // Calculate offset
      const offset = (page - 1) * limit;
      const safeSortBy = validateSortField(sortBy, USER_SORT_FIELDS, 'createdAt');

      // Execute query
      const { rows: users, count: total } = await User.findAndCountAll({
        where: whereConditions,
        order: [[safeSortBy, sortOrder]],
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
        throw new NotFoundError('User not found');
      }

      // Plan 5.6: notification prefs and privacy prefs live in their own
      // typed tables. Both auto-created by the User.afterCreate hook so
      // the findOrCreate is just defensive against pre-existing users.
      const [notifPrefs] = await UserNotificationPrefs.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
      });
      await notifPrefs.update(userPrefsToPrefsRowPatch(preferences));

      if (preferences.privacySettings) {
        const [privacyPrefs] = await UserPrivacyPrefs.findOrCreate({
          where: { user_id: userId },
          defaults: { user_id: userId },
        });
        await privacyPrefs.update(privacyPatchToPrefsRow(preferences.privacySettings));
      }

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
        throw new NotFoundError('User not found');
      }

      // Sequential reads — SQLite (test dialect) can't parallelise queries
      // inside the same auto-transaction findOrCreate opens.
      const [notifRow] = await UserNotificationPrefs.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
      });
      const [privacyRow] = await UserPrivacyPrefs.findOrCreate({
        where: { user_id: userId },
        defaults: { user_id: userId },
      });

      if (loggerHelpers && loggerHelpers.logDatabase) {
        loggerHelpers.logDatabase('READ', {
          userId,
          duration: Date.now() - startTime,
          found: true,
        });
      }

      return {
        emailNotifications: notifRow.email_enabled,
        pushNotifications: notifRow.push_enabled,
        smsNotifications: notifRow.sms_enabled,
        privacySettings: {
          profileVisibility: privacyRow.profile_visibility as 'public' | 'private' | 'friends',
          showLocation: privacyRow.show_location,
          showContactInfo: false,
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
        throw new NotFoundError('User not found');
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

      // Reset both pref tables by destroying + recreating so the table-level
      // DB defaults stand in (one source of truth for what "default" means).
      // Sequential — SQLite serialises transactions per connection.
      await UserNotificationPrefs.destroy({ where: { user_id: userId } });
      await UserPrivacyPrefs.destroy({ where: { user_id: userId } });
      await UserNotificationPrefs.create({ user_id: userId });
      await UserPrivacyPrefs.create({ user_id: userId });

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
        throw new NotFoundError('User not found');
      }

      // Get real application count
      const applicationsCount = await Application.count({
        where: { userId },
      });

      // Get active chats count
      const activeChatsCount = await Chat.count({
        include: [
          {
            association: 'Participants',
            where: { participant_id: userId },
            required: true,
          },
        ],
        where: { status: 'active' },
      });

      // Get pets favorited count
      const petsFavoritedCount = await UserFavorite.count({
        where: { userId },
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
      // Database-agnostic SQL query
      const isPostgres = sequelize.getDialect() === 'postgres';
      const sessionData = (await sequelize.query(
        isPostgres
          ? `
          SELECT
            DATE_TRUNC('day', timestamp) as session_date,
            MIN(timestamp) as first_action,
            MAX(timestamp) as last_action
          FROM audit_logs
          WHERE "user" = :userId
            AND timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', timestamp)
          HAVING COUNT(*) > 1
        `
          : `
          SELECT
            strftime('%Y-%m-%d', timestamp) as session_date,
            MIN(timestamp) as first_action,
            MAX(timestamp) as last_action
          FROM audit_logs
          WHERE "user" = :userId
            AND timestamp >= datetime('now', '-30 days')
          GROUP BY strftime('%Y-%m-%d', timestamp)
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
          description: this.formatActivityDescription(log.action, log.category, log.metadata),
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
  static async getUserActivitySummary(userId: string): Promise<UserActivitySummaryInternal> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get real application count
      const applicationsCount = await Application.count({
        where: { userId },
      });

      // Get active chats count
      const activeChatsCount = await Chat.count({
        include: [
          {
            association: 'Participants',
            where: { participant_id: userId },
            required: true,
          },
        ],
        where: { status: 'active' },
      });

      // Get pets favorited count
      const petsFavoritedCount = await UserFavorite.count({
        where: { userId },
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
      // Database-agnostic SQL query
      const isPostgres = sequelize.getDialect() === 'postgres';
      const sessionData = (await sequelize.query(
        isPostgres
          ? `
          SELECT
            DATE_TRUNC('day', timestamp) as session_date,
            MIN(timestamp) as first_action,
            MAX(timestamp) as last_action
          FROM audit_logs
          WHERE "user" = :userId
            AND timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', timestamp)
          HAVING COUNT(*) > 1
        `
          : `
          SELECT
            strftime('%Y-%m-%d', timestamp) as session_date,
            MIN(timestamp) as first_action,
            MAX(timestamp) as last_action
          FROM audit_logs
          WHERE "user" = :userId
            AND timestamp >= datetime('now', '-30 days')
          GROUP BY strftime('%Y-%m-%d', timestamp)
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

      const activitySummary: UserActivitySummaryInternal = {
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
  private static mapActionToActivityType(action: string): UserActivityType {
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
    return 'other';
  }

  /**
   * Get paginated user activity log from audit_logs.
   */
  static async getUserActivityLog(
    userId: string,
    filters: UserActivityFilters = {}
  ): Promise<SharedUserActivity[]> {
    const startTime = Date.now();
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const where: WhereOptions = { user: userId };
      if (filters.from || filters.to) {
        const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
        if (filters.from) {
          range[Op.gte] = new Date(filters.from);
        }
        if (filters.to) {
          range[Op.lte] = new Date(filters.to);
        }
        (where as { timestamp?: typeof range }).timestamp = range;
      }

      const rows = await AuditLog.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'action',
          'category',
          'metadata',
          'ip_address',
          'user_agent',
          'timestamp',
        ],
      });

      const activities: SharedUserActivity[] = rows.map(row => ({
        activityId: row.id,
        activityType: this.mapActionToActivityType(row.action),
        action: row.action,
        description: this.formatActivityDescription(row.action, row.category, row.metadata),
        category: row.category,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.timestamp.toISOString(),
      }));

      loggerHelpers.logPerformance('User Activity Log', {
        duration: Date.now() - startTime,
        userId,
        rowCount: activities.length,
      });

      return activities;
    } catch (error) {
      logger.error('Failed to get user activity log:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Format activity description from action, entity category, and metadata.
   *
   * Audit rows are emitted as (action, category, metadata) where category is
   * the entity name (PET, APPLICATION, USER, ...) and metadata.details holds
   * arbitrary context — often a human-readable name. We compose all three so
   * bare verbs like CREATE/UPDATE/DELETE surface their entity instead of
   * appearing as a one-word "create" / "update" in the UI.
   */
  private static formatActivityDescription(
    action: string,
    category: string,
    metadata?: JsonObject | null
  ): string {
    // High-frequency actions get bespoke phrasing.
    const knownPhrasings: Record<string, (entity: string | undefined) => string> = {
      APPLICATION_SUBMITTED: entity => `Submitted application for ${entity ?? 'a pet'}`,
      APPLICATION_UPDATED: entity => `Updated application${entity ? ` for ${entity}` : ''}`,
      APPLICATION_STATUS_UPDATED: entity =>
        `Application status changed${entity ? ` for ${entity}` : ''}`,
      WITHDRAW: () => 'Withdrew application',
      USER_LOGIN: () => 'Logged into account',
      LOGIN: () => 'Logged in',
      LOGOUT: () => 'Logged out',
      LOGIN_FAILED: () => 'Failed login attempt',
      PROFILE_UPDATED: () => 'Updated profile',
      USER_CREATED: () => 'Account created',
      PASSWORD_RESET: () => 'Password reset',
      PASSWORD_RESET_REQUEST: () => 'Requested password reset',
      EMAIL_VERIFICATION: () => 'Verified email address',
      PET_FAVORITED: entity => `Added ${entity ?? 'a pet'} to favorites`,
      MESSAGE_SENT: () => 'Sent a message',
      MESSAGE_READ: () => 'Read a message',
      CHAT_CREATED: () => 'Started a new conversation',
      FILE_UPLOAD: entity => `Uploaded ${entity ?? 'a file'}`,
      FILE_DELETE: entity => `Deleted ${entity ?? 'a file'}`,
      VIEW: entity => `Viewed ${entity ?? category.toLowerCase()}`,
      TWO_FACTOR_ENABLED: () => 'Enabled two-factor authentication',
      TWO_FACTOR_DISABLED: () => 'Disabled two-factor authentication',
    };

    const entityLabel = this.extractEntityLabel(metadata);
    const phrasing = knownPhrasings[action];
    if (phrasing) {
      return phrasing(entityLabel);
    }

    // Generic fallback: combine verb + entity. Example:
    //   action="CREATE",  category="PET",         entity="Buddy"  → "Created pet: Buddy"
    //   action="UPDATE",  category="APPLICATION", entity=undefined → "Updated application"
    //   action="DELETE",  category="CHAT",         entity=undefined → "Deleted chat"
    const verb = this.actionToVerb(action);
    const entityName = category ? category.toLowerCase().replace(/_/g, ' ') : '';
    const base = entityName ? `${verb} ${entityName}` : verb;
    return entityLabel ? `${base}: ${entityLabel}` : base;
  }

  /**
   * Pull a display-friendly entity label out of metadata. Audit writers
   * stash human-readable context under metadata.details (petName, title,
   * name, email, ...); fall back to metadata.entityId so something
   * recognisable surfaces even when the writer didn't include a name.
   */
  private static extractEntityLabel(metadata?: JsonObject | null): string | undefined {
    if (!metadata) {
      return undefined;
    }
    const details =
      typeof metadata.details === 'object' && metadata.details !== null
        ? (metadata.details as JsonObject)
        : undefined;
    const candidateKeys = ['petName', 'title', 'name', 'rescueName', 'subject', 'email'];
    for (const key of candidateKeys) {
      const fromDetails = details?.[key];
      if (typeof fromDetails === 'string' && fromDetails.length > 0) {
        return fromDetails;
      }
      const fromMetadata = metadata[key];
      if (typeof fromMetadata === 'string' && fromMetadata.length > 0) {
        return fromMetadata;
      }
    }
    const entityId = metadata.entityId;
    if (typeof entityId === 'string' && entityId.length > 0) {
      return entityId;
    }
    return undefined;
  }

  /** Convert an UPPER_SNAKE action name to a past-tense verb phrase. */
  private static actionToVerb(action: string): string {
    const verbMap: Record<string, string> = {
      CREATE: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
      VIEW: 'Viewed',
      UPDATE_STATUS: 'Updated status of',
      ADD_IMAGES: 'Added images to',
      UPDATE_IMAGES: 'Updated images on',
      REMOVE_IMAGE: 'Removed image from',
      BULK_OPERATION: 'Performed bulk operation on',
      BULK_UPDATE: 'Bulk-updated',
      SUSPEND: 'Suspended',
      UNSUSPEND: 'Unsuspended',
      DEACTIVATE: 'Deactivated',
      REACTIVATE: 'Reactivated',
    };
    if (verbMap[action]) {
      return verbMap[action];
    }
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^./, c => c.toUpperCase());
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
              association: 'AuditLogs',
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
      // Database-agnostic SQL query
      const isPostgres = sequelize.getDialect() === 'postgres';
      const monthlyGrowth = (await sequelize.query(
        isPostgres
          ? `
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
          FROM users
          WHERE created_at >= :oneYearAgo
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `
          : `
          SELECT
            strftime('%Y-%m-01', created_at) as month,
            COUNT(*) as count
          FROM users
          WHERE created_at >= :oneYearAgo
          GROUP BY strftime('%Y-%m', created_at)
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
          [UserType.SUPER_ADMIN]: 0,
          [UserType.SUPPORT_AGENT]: 0,
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
      // Belt-and-braces: the Zod controller validator already rejects
      // SUPER_ADMIN as a settable role and route middleware blocks adopters,
      // but the service layer must independently refuse self-grants and
      // refuse SUPER_ADMIN grants from non-SUPER_ADMIN callers so any future
      // relaxation of the controller schema does not yield an instant
      // self-escalation.
      if (adminUserId === userId) {
        throw new ForbiddenError('Cannot change your own role via this endpoint');
      }

      if (newUserType === UserType.SUPER_ADMIN) {
        const actor = await User.findByPk(adminUserId);
        if (actor?.userType !== UserType.SUPER_ADMIN) {
          throw new ForbiddenError('Only super_admin can assign super_admin role');
        }
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const oldUserType = user.userType;
      await user.update({ userType: newUserType });

      // Push a socket event so any live frontend session re-fetches the
      // user profile and re-evaluates role-gated UI (ProtectedRoute,
      // admin nav, etc.) without waiting for the next page refresh.
      emitAuthRoleChanged(userId);

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
        throw new NotFoundError('User not found');
      }

      if (user.status === UserStatus.INACTIVE) {
        throw new ConflictError('User is already deactivated');
      }

      user.status = UserStatus.INACTIVE;
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
        throw new NotFoundError('User not found');
      }

      if (user.status === UserStatus.ACTIVE) {
        throw new ConflictError('User is already active');
      }

      user.status = UserStatus.ACTIVE;
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

    // Admins (and super_admins) can see all user data
    if (isAdminRole(requestingUserType)) {
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
      throw new ForbiddenError(`Cannot ${operation} your own account`);
    }
  }

  static validateBulkOperation(
    requestingUserId: string,
    targetUserIds: string[],
    operation: string
  ): void {
    if (targetUserIds.includes(requestingUserId)) {
      throw new ForbiddenError(`Cannot include your own account in bulk ${operation} operation`);
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

  static async bulkUpdateUsers(
    updates: BulkUserUpdateData[],
    updatedBy: string
  ): Promise<{
    success: number;
    failed: number;
    failedIds: string[];
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const startTime = Date.now();

    try {
      // individualHooks:true (below) so the per-row beforeValidate (email NFKC +
      // mixed-script reject), beforeUpdate (password hashing + tokens_invalid_before
      // bump on userType change), and afterSave (auth-cache invalidation) hooks
      // fire for each user.
      //
      // The inline tokens_invalid_before bump below is belt-and-braces — the
      // beforeUpdate hook already covers it, but the explicit payload guarantees
      // the column is bumped even if individualHooks were ever removed.
      const payload = updates[0].updates;
      const userTypeChange = Object.prototype.hasOwnProperty.call(payload, 'userType');
      const targetUserIds = updates[0].userIds;

      // Same belt-and-braces hardening as updateUserRole: refuse self-grants
      // through a bulk path and refuse SUPER_ADMIN assignment from a non-
      // SUPER_ADMIN actor, regardless of what the controller schema permits.
      if (userTypeChange) {
        if (targetUserIds.includes(updatedBy)) {
          throw new ForbiddenError('Cannot change your own role via this endpoint');
        }

        const newUserType = (payload as { userType?: UserType }).userType;
        if (newUserType === UserType.SUPER_ADMIN) {
          const actor = await User.findByPk(updatedBy);
          if (actor?.userType !== UserType.SUPER_ADMIN) {
            throw new ForbiddenError('Only super_admin can assign super_admin role');
          }
        }
      }

      const effectiveUpdates = userTypeChange
        ? { ...payload, tokensInvalidBefore: new Date() }
        : payload;

      // Per-id updates with allSettled so a failure on one user (validation,
      // hook reject, etc.) doesn't take down the whole batch and we can return
      // the precise list of failedIds for per-item retry in the admin UI.
      const settled = await Promise.allSettled(
        targetUserIds.map(async userId => {
          const [affected] = await User.update(effectiveUpdates, {
            where: { userId },
            individualHooks: true,
          });
          if (affected === 0) {
            throw new NotFoundError('User not found');
          }
          return userId;
        })
      );

      const results = settled.map((outcome, index) => {
        const id = targetUserIds[index];
        if (outcome.status === 'fulfilled') {
          return { id, success: true };
        }
        const reasonMessage =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        return { id, success: false, error: reasonMessage };
      });

      const failedIds = results.filter(r => !r.success).map(r => r.id);
      const successCount = results.length - failedIds.length;

      // Log bulk update — ADS-651: per-user entries each carry the
      // operator reason so the audit log captures *why* every affected
      // user changed state, not just that they were part of a bulk job.
      // Only audit the successful rows; failed updates didn't change state.
      const reason = updates[0].reason ?? null;
      const successfulIds = results.filter(r => r.success).map(r => r.id);
      await Promise.all(
        successfulIds.map(userId =>
          AuditLogService.log({
            action: 'BULK_UPDATE',
            entity: 'User',
            entityId: userId,
            details: {
              fields: Object.keys(updates[0].updates),
              reason,
              bulk_operation: true,
            },
            userId: updatedBy,
          })
        )
      );

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

      return {
        success: successCount,
        failed: failedIds.length,
        failedIds,
        results,
      };
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
        throw new NotFoundError('User not found');
      }

      // Soft delete related data first
      await Application.update({ deletedAt: new Date() }, { where: { userId, deletedAt: null } });

      await UserFavorite.destroy({ where: { userId } });

      // Remove from chats
      await ChatParticipant.destroy({ where: { participant_id: userId } });

      // Revoke all active sessions before destroying the account
      const revokedCount = await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: userId, is_revoked: false } }
      );
      invalidateAuthCache(userId);

      // Soft delete the user
      await user.destroy();

      await AuditLogService.log({
        action: 'REFRESH_TOKENS_REVOKED',
        entity: 'User',
        entityId: userId,
        details: { reason: 'account_deleted', count: revokedCount[0] },
        userId,
      });

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
        throw new NotFoundError('User not found');
      }

      // Extract unique permissions from all roles
      const permissions = new Set<string>();
      if (user.Roles) {
        for (const role of user.Roles) {
          if (role.Permissions) {
            for (const permission of role.Permissions) {
              permissions.add(permission.permissionName);
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
              permissions.add(permission.permissionName);
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

/**
 * Map the camelCase UserPreferences shape used by the user-facing API
 * (emailNotifications/pushNotifications/etc) to the column-named partial
 * accepted by UserNotificationPrefs.update(). Privacy keys are skipped —
 * those still live on User.
 */
function userPrefsToPrefsRowPatch(input: UserPreferences): Partial<{
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  application_updates: boolean;
  chat_messages: boolean;
  pet_matches: boolean;
  rescue_updates: boolean;
}> {
  const np = (input as unknown as { notificationPreferences?: Record<string, boolean | undefined> })
    .notificationPreferences;
  const out: Partial<{
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    application_updates: boolean;
    chat_messages: boolean;
    pet_matches: boolean;
    rescue_updates: boolean;
  }> = {};
  if (input.emailNotifications !== undefined) {
    out.email_enabled = input.emailNotifications;
  }
  if (input.pushNotifications !== undefined) {
    out.push_enabled = input.pushNotifications;
  }
  if (input.smsNotifications !== undefined) {
    out.sms_enabled = input.smsNotifications;
  }
  if (np?.emailNotifications !== undefined) {
    out.email_enabled = np.emailNotifications;
  }
  if (np?.pushNotifications !== undefined) {
    out.push_enabled = np.pushNotifications;
  }
  if (np?.smsNotifications !== undefined) {
    out.sms_enabled = np.smsNotifications;
  }
  if (np?.applicationUpdates !== undefined) {
    out.application_updates = np.applicationUpdates;
  }
  if (np?.chatMessages !== undefined) {
    out.chat_messages = np.chatMessages;
  }
  if (np?.petAlerts !== undefined) {
    out.pet_matches = np.petAlerts;
  }
  if (np?.rescueUpdates !== undefined) {
    out.rescue_updates = np.rescueUpdates;
  }
  return out;
}

/**
 * Map an API-side privacy patch to the column-named partial accepted by
 * UserPrivacyPrefs.update(). The legacy showContactInfo and allowMessages
 * keys aren't tracked in the new table — silently ignored.
 */
function privacyPatchToPrefsRow(input: NonNullable<UserPreferences['privacySettings']>): Partial<{
  profile_visibility: ProfileVisibility;
  show_location: boolean;
}> {
  const out: Partial<{ profile_visibility: ProfileVisibility; show_location: boolean }> = {};
  if (input.profileVisibility !== undefined) {
    // Legacy API uses 'friends' for what the typed table calls 'rescues_only'.
    switch (input.profileVisibility) {
      case 'public':
        out.profile_visibility = ProfileVisibility.PUBLIC;
        break;
      case 'private':
        out.profile_visibility = ProfileVisibility.PRIVATE;
        break;
      case 'friends':
        out.profile_visibility = ProfileVisibility.RESCUES_ONLY;
        break;
    }
  }
  if (input.showLocation !== undefined) {
    out.show_location = input.showLocation;
  }
  return out;
}

export default UserService;
