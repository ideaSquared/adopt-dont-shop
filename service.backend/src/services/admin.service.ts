import { Op, QueryTypes, WhereOptions } from 'sequelize';
import Application from '../models/Application';
import AuditLog from '../models/AuditLog';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import User, { UserStatus, UserType } from '../models/User';
import sequelize from '../sequelize';
import { RescueListResponse, SystemStatistics, UserListResponse } from '../types/admin';
import { JsonObject } from '../types/common';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

interface UserFilter {
  role?: string;
  status?: string;
  verificationStatus?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

interface RescueFilter {
  status?: string;
  verified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  rescues: {
    total: number;
    verified: number;
    pending: number;
    newThisMonth: number;
  };
  pets: {
    total: number;
    available: number;
    adopted: number;
    newThisMonth: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    newThisMonth: number;
  };
}

class AdminService {
  /**
   * Get all users with filtering and pagination
   */
  static async getUsers(
    filters: {
      status?: UserStatus;
      userType?: UserType;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<UserListResponse> {
    const startTime = Date.now();

    try {
      const { status, userType, search, page = 1, limit = 20 } = filters;

      const whereConditions: WhereOptions = {};

      if (status) {
        whereConditions.status = status;
      }
      if (userType) {
        whereConditions.userType = userType;
      }

      if (search) {
        whereConditions[Op.or as any] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: users, count: total } = await User.findAndCountAll({
        where: whereConditions,
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
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      loggerHelpers.logPerformance('Admin User List', {
        duration: Date.now() - startTime,
        filters: Object.keys(filters),
        resultCount: users.length,
        total,
        page,
      });

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching users:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const startTime = Date.now();

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

      loggerHelpers.logDatabase('READ', {
        userId,
        duration: Date.now() - startTime,
        found: !!user,
      });

      return user;
    } catch (error) {
      logger.error('Error fetching user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(
    userId: string,
    status: UserStatus,
    adminId: string
  ): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const originalStatus = user.status;
      user.status = status;
      await user.save();

      await AuditLogService.log({
        action: 'UPDATE_STATUS',
        entity: 'User',
        entityId: userId,
        details: {
          originalStatus,
          newStatus: status,
          adminId,
        },
        userId: adminId,
      });

      loggerHelpers.logBusiness(
        'User Status Updated by Admin',
        {
          userId,
          originalStatus,
          newStatus: status,
          adminId,
          duration: Date.now() - startTime,
        },
        adminId
      );

      return user;
    } catch (error) {
      logger.error('Error updating user status:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        status,
        adminId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Suspend user account
   */
  static async suspendUser(userId: string, adminId: string, reason?: string): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.status = UserStatus.SUSPENDED;
      await user.save();

      await AuditLogService.log({
        action: 'SUSPEND',
        entity: 'User',
        entityId: userId,
        details: {
          reason: reason || null,
          adminId,
        },
        userId: adminId,
      });

      loggerHelpers.logBusiness(
        'User Suspended by Admin',
        {
          userId,
          reason,
          adminId,
          duration: Date.now() - startTime,
        },
        adminId
      );

      return user;
    } catch (error) {
      logger.error('Error suspending user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        adminId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Unsuspend user account
   */
  static async unsuspendUser(userId: string, adminId: string): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.status = UserStatus.ACTIVE;
      await user.save();

      await AuditLogService.log({
        action: 'UNSUSPEND',
        entity: 'User',
        entityId: userId,
        details: {
          adminId,
        },
        userId: adminId,
      });

      loggerHelpers.logBusiness(
        'User Unsuspended by Admin',
        {
          userId,
          adminId,
          duration: Date.now() - startTime,
        },
        adminId
      );

      return user;
    } catch (error) {
      logger.error('Error unsuspending user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        adminId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.destroy();

      await AuditLogService.log({
        action: 'DELETE',
        entity: 'User',
        entityId: userId,
        details: {
          reason: reason || null,
          adminId,
          userData: JSON.parse(JSON.stringify(user.toJSON())),
        },
        userId: adminId,
      });

      loggerHelpers.logBusiness(
        'User Deleted by Admin',
        {
          userId,
          reason,
          adminId,
          duration: Date.now() - startTime,
        },
        adminId
      );
    } catch (error) {
      logger.error('Error deleting user:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        adminId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get all rescues with filtering and pagination
   */
  static async getRescues(
    filters: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<RescueListResponse> {
    const startTime = Date.now();

    try {
      const { status, search, page = 1, limit = 20 } = filters;

      const whereConditions: WhereOptions = {};

      if (status) {
        whereConditions.status = status;
      }

      if (search) {
        whereConditions[Op.or as any] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: rescues, count: total } = await Rescue.findAndCountAll({
        where: whereConditions,
        include: [
          {
            association: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      loggerHelpers.logPerformance('Admin Rescue List', {
        duration: Date.now() - startTime,
        filters: Object.keys(filters),
        resultCount: rescues.length,
        total,
        page,
      });

      return {
        rescues,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching rescues:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Verify a rescue organization
   */
  static async verifyRescue(rescueId: string, adminId: string): Promise<Rescue> {
    const startTime = Date.now();

    try {
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      rescue.status = 'verified';
      rescue.verifiedAt = new Date();
      await rescue.save();

      await AuditLogService.log({
        action: 'VERIFY_RESCUE',
        entity: 'Rescue',
        entityId: rescueId,
        details: {
          adminId,
        },
        userId: adminId,
      });

      loggerHelpers.logBusiness(
        'Rescue Verified by Admin',
        {
          rescueId,
          adminId,
          duration: Date.now() - startTime,
        },
        adminId
      );

      loggerHelpers.logDatabase('READ', {
        rescueId,
        duration: Date.now() - startTime,
        found: !!rescue,
      });

      return rescue;
    } catch (error) {
      logger.error('Error verifying rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        adminId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Reject rescue verification
   */
  static async rejectRescueVerification(rescueId: string, adminId: string, reason: string) {
    try {
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      await rescue.update({
        status: 'pending',
      });

      // Log the action
      await AuditLogService.log({
        userId: adminId,
        action: 'RESCUE_VERIFICATION_REJECTED',
        entity: 'Rescue',
        entityId: rescueId,
        details: { reason },
      });

      return rescue;
    } catch (error) {
      logger.error('Error rejecting rescue verification:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    try {
      // Check database connectivity
      let databaseStatus = 'healthy';
      try {
        await User.findOne({ limit: 1 });
      } catch (error) {
        databaseStatus = 'unhealthy';
      }

      // Check other system components
      const systemStatus = {
        database: databaseStatus,
        api: 'healthy', // API is responding if we got here
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      };

      return systemStatus;
    } catch (error) {
      logger.error('Error checking system health:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(
    filters: {
      userId?: string;
      entity?: string;
      action?: string;
      level?: 'INFO' | 'WARNING' | 'ERROR';
      status?: 'success' | 'failure';
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ logs: unknown[]; total: number; page: number; totalPages: number }> {
    const startTime = Date.now();

    try {
      const {
        userId,
        entity,
        action,
        level,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = filters;

      const whereConditions: WhereOptions = {};

      if (userId) {
        whereConditions.user = userId;
      }
      if (entity) {
        whereConditions.category = entity;
      }
      if (action) {
        whereConditions.action = action;
      }
      if (level) {
        whereConditions.level = level;
      }
      if (status) {
        whereConditions.status = status;
      }

      if (startDate && endDate) {
        whereConditions.timestamp = {
          [Op.between]: [startDate, endDate],
        };
      } else if (startDate) {
        whereConditions.timestamp = {
          [Op.gte]: startDate,
        };
      } else if (endDate) {
        whereConditions.timestamp = {
          [Op.lte]: endDate,
        };
      }

      const { rows: logs, count: total } = await AuditLogService.getLogs(whereConditions, {
        limit,
        offset: (page - 1) * limit,
        order: [['timestamp', 'DESC']],
      });

      const formattedLogs = logs.map((log: AuditLog & { userDetails?: User }) => ({
        id: log.id,
        service: log.service,
        user: log.user,
        userName: log.userDetails
          ? `${log.userDetails.firstName} ${log.userDetails.lastName}`
          : null,
        userEmail: log.userDetails?.email || null,
        userType: log.userDetails?.userType || null,
        action: log.action,
        level: log.level,
        status: log.status,
        timestamp: log.timestamp,
        metadata: log.metadata,
        category: log.category,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
      }));

      loggerHelpers.logPerformance('Admin Audit Logs', {
        duration: Date.now() - startTime,
        filters: Object.keys(filters),
        resultCount: logs.length,
        total,
        page,
      });

      return {
        logs: formattedLogs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', {
        error: error instanceof Error ? error.message : String(error),
        filters: Object.keys(filters),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Export data for compliance/backup
   */
  static async exportData(dataType: string, format = 'json', filters?: JsonObject) {
    try {
      let data;

      switch (dataType) {
        case 'users':
          data = await User.findAll({
            where: filters || {},
            attributes: { exclude: ['password'] },
          });
          break;
        case 'rescues':
          data = await Rescue.findAll({ where: filters || {} });
          break;
        case 'pets':
          data = await Pet.findAll({ where: filters || {} });
          break;
        case 'applications':
          data = await Application.findAll({ where: filters || {} });
          break;
        case 'audit_logs':
          data = await AuditLog.findAll({ where: filters || {} });
          break;
        default:
          throw new Error('Invalid data type for export');
      }

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        // Would need to implement CSV conversion
        throw new Error('CSV export not yet implemented');
      }

      return data;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Bulk user operation with proper error handling
   */
  static async bulkUserOperation(
    userIds: string[],
    operation: string,
    adminId: string,
    data?: JsonObject
  ) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          let result;
          switch (operation) {
            case 'suspend':
              result = await this.suspendUser(
                userId,
                String(data?.reason || 'Bulk operation'),
                adminId
              );
              break;
            case 'unsuspend':
              result = await this.unsuspendUser(userId, adminId);
              break;
            case 'update':
              if (data && typeof data === 'object') {
                result = await this.updateUserStatus(userId, data.status as UserStatus, adminId);
              } else {
                throw new Error('Update data required for update operation');
              }
              break;
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
          results.push({ userId, success: true, result });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Log the bulk operation
      await AuditLogService.log({
        userId: adminId,
        action: 'BULK_OPERATION',
        entity: 'User',
        entityId: `bulk-${userIds.length}`,
        details: {
          operation,
          userIds,
          results: JSON.parse(JSON.stringify(results)), // Convert to plain object
        },
      });

      return {
        totalProcessed: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      logger.error(
        'Error in bulk user operation:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Verify a user account
   */
  static async verifyUser(userId: string, adminId: string) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user verification status using the correct field name
      await user.update({ emailVerified: true });

      // Log the action
      await AuditLogService.log({
        userId: adminId,
        action: 'USER_VERIFIED',
        entity: 'User',
        entityId: userId,
        details: {
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminId,
        },
      });

      logger.info(`User ${userId} verified by admin ${adminId}`);
      return user;
    } catch (error) {
      logger.error('Error verifying user:', error);
      throw error;
    }
  }

  /**
   * Get user count by role
   */
  private static async getUserCountByRole(): Promise<Record<string, number>> {
    try {
      const roleCounts = (await sequelize.query(
        `
        SELECT 
          r.name as role_name,
          COUNT(ur.user_id) as count
        FROM roles r
        LEFT JOIN user_roles ur ON r.role_id = ur.role_id
        GROUP BY r.role_id, r.name
        ORDER BY r.name
      `,
        {
          type: QueryTypes.SELECT,
        }
      )) as Array<{ role_name: string; count: number }>;

      const result: Record<string, number> = {};
      roleCounts.forEach(role => {
        result[role.role_name] = Number(role.count);
      });

      return result;
    } catch (error) {
      logger.error('Error getting user count by role:', error);
      return {};
    }
  }

  /**
   * Get new rescues this month
   */
  private static async getNewRescuesThisMonth(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return await Rescue.count({
        where: {
          createdAt: {
            [Op.gte]: thirtyDaysAgo,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting new rescues this month:', error);
      return 0;
    }
  }

  /**
   * Get platform metrics
   */
  static async getPlatformMetrics(): Promise<PlatformMetrics> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // User metrics
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const newUsersThisMonth = await User.count({
        where: { createdAt: { [Op.gte]: startOfMonth } },
      });

      // Rescue statistics - use status field instead of isVerified
      const totalRescues = await Rescue.count();
      const verifiedRescues = await Rescue.count({ where: { status: 'verified' } });
      const pendingRescues = await Rescue.count({ where: { status: 'pending' } });

      // Pet statistics - use createdAt instead of adoptedDate
      const totalPets = await Pet.count();
      const availablePets = await Pet.count({ where: { status: 'available' } });
      const adoptedPets = await Pet.count({
        where: {
          status: 'adopted',
          created_at: {
            [Op.between]: [startOfMonth, now],
          },
        },
      });

      // Application statistics - use created_at
      const totalApplications = Number(
        await Application.count({
          where: {
            created_at: {
              [Op.between]: [startOfMonth, now],
            },
          },
        })
      );

      const approvedApplications = Number(
        await Application.count({
          where: {
            status: 'approved',
            created_at: {
              [Op.between]: [startOfMonth, now],
            },
          },
        })
      );

      // Calculate rates safely with proper type conversion
      const adoptionRate =
        totalPets > 0 ? Math.round((Number(adoptedPets) / Number(totalPets)) * 100) : 0;
      const approvalRate =
        totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0;
      const verificationRate =
        totalRescues > 0 ? Math.round((Number(verifiedRescues) / Number(totalRescues)) * 100) : 0;

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: Number(newUsersThisMonth) || 0,
          byRole: await this.getUserCountByRole(),
        },
        rescues: {
          total: totalRescues,
          verified: verifiedRescues,
          pending: pendingRescues,
          newThisMonth: await this.getNewRescuesThisMonth(),
        },
        pets: {
          total: totalPets,
          available: availablePets,
          adopted: adoptedPets,
          newThisMonth: Number(newUsersThisMonth) || 0,
        },
        applications: {
          total: totalApplications,
          pending: pendingRescues,
          approved: approvedApplications,
          newThisMonth: Number(newUsersThisMonth) || 0,
        },
      };
    } catch (error) {
      logger.error(
        'Error getting platform metrics:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStatistics(): Promise<SystemStatistics> {
    const startTime = Date.now();

    try {
      const totalUsers = await User.count();
      const totalRescues = await Rescue.count();
      const totalPets = await Pet.count();
      const totalApplications = await Application.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const verifiedRescues = await Rescue.count({ where: { status: 'verified' } });
      const availablePets = await Pet.count({ where: { status: 'available' } });
      const pendingApplications = await Application.count({ where: { stage: 'pending' } });
      const recentActivity = await AuditLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
      });

      loggerHelpers.logPerformance('System Statistics', {
        duration: Date.now() - startTime,
        totalUsers,
        totalRescues,
        totalPets,
        totalApplications,
      });

      return {
        totalUsers,
        totalRescues,
        totalPets,
        totalApplications,
        activeUsers,
        verifiedRescues,
        availablePets,
        pendingApplications,
        recentActivity,
      };
    } catch (error) {
      logger.error('Error fetching system statistics:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
}

export default AdminService;
