import { Response } from 'express';
import { DEFAULT_PAGE_SIZE, LARGE_PAGE_SIZE } from '../constants/pagination';
import User, { UserStatus, UserType } from '../models/User';
import Rescue from '../models/Rescue';
import AdminService from '../services/admin.service';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';
import type { RescuePlan } from '../config/plans';
import { AuthenticatedRequest } from '../types/auth';

export class AdminController {
  /**
   * Get platform metrics (dashboard data)
   */
  static async getPlatformMetrics(req: AuthenticatedRequest, res: Response) {
    const { startDate, endDate } = req.query;

    let _start: Date | undefined;
    let _end: Date | undefined;

    if (startDate) {
      _start = new Date(startDate as string);
    }
    if (endDate) {
      _end = new Date(endDate as string);
    }

    const metrics = await AdminService.getPlatformMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }

  /**
   * Search and manage users
   */
  static async searchUsers(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const {
      search,
      userType,
      status,
      verificationStatus,
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const allowedSortBy = ['email', 'firstName', 'lastName', 'createdAt', 'status'];
    const safeSortBy = allowedSortBy.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const safeSortOrder =
      (sortOrder as string)?.toUpperCase() === 'ASC' ? ('ASC' as const) : ('DESC' as const);

    const parsedLimit = parseInt(limit as string);

    const result = await AdminService.getUsers({
      search: search as string,
      status: status as UserStatus,
      userType: userType as UserType,
      page: parseInt(page as string),
      limit: parsedLimit,
      sortBy: safeSortBy,
      sortOrder: safeSortOrder,
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: parsedLimit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  }

  /**
   * Perform admin action on a user
   */
  static async performUserAction(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const { action, reason, status } = req.body;
      const adminId = req.user!.userId;

      // Validation
      if (!action) {
        return res.status(400).json({
          error: 'Action is required',
        });
      }

      let result;
      switch (action) {
        case 'suspend':
          result = await AdminService.suspendUser(userId, adminId, reason);
          break;
        case 'unsuspend':
          result = await AdminService.unsuspendUser(userId, adminId);
          break;
        case 'verify':
          result = await AdminService.verifyUser(userId, adminId);
          break;
        case 'update_status':
          if (!status) {
            return res.status(400).json({
              error: 'Status is required for update_status action',
            });
          }
          result = await AdminService.updateUserStatus(userId, status, adminId);
          break;
        case 'delete':
          await AdminService.deleteUser(userId, adminId, reason);
          result = { success: true };
          break;
        default:
          return res.status(400).json({
            error: 'Invalid action specified',
          });
      }

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: result,
        message: `User ${action} successful`,
      });
    } catch (error) {
      logger.error('Error performing user action:', {
        error: error instanceof Error ? error.message : String(error),
        action: req.body.action,
        userId: req.params.userId,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({
          error: 'User not found',
        });
      }
      res.status(500).json({
        error: 'Failed to perform user action',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(req: AuthenticatedRequest, res: Response) {
    const health = await AdminService.getSystemHealth();

    res.json({
      success: true,
      data: health,
    });
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const {
      page = 1,
      limit = LARGE_PAGE_SIZE,
      action,
      userId,
      entity,
      level,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await AdminService.getAuditLogs({
      action: action as string,
      userId: userId as string,
      entity: entity as string,
      level: level as 'INFO' | 'WARNING' | 'ERROR' | undefined,
      status: status as 'success' | 'failure' | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: 20,
        total: result.total,
        pages: result.totalPages,
      },
    });
  }

  /**
   * Get rescue organization management data
   */
  static async getRescueManagement(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { page = 1, limit = DEFAULT_PAGE_SIZE, status } = req.query;

    const result = await AdminService.getRescues({
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result.rescues,
      pagination: {
        page: result.page,
        limit: 20,
        total: result.total,
        pages: result.totalPages,
      },
    });
  }

  /**
   * Moderate a rescue organization (approve/reject)
   */
  static async moderateRescue(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { rescueId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user!.userId;

    let result;
    switch (action) {
      case 'verify':
        result = await AdminService.verifyRescue(rescueId, adminId);
        break;
      case 'reject':
        result = await AdminService.rejectRescueVerification(rescueId, adminId, reason);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid action specified',
        });
    }

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result,
      message: `Rescue ${action} successful`,
    });
  }

  /**
   * Get comprehensive dashboard analytics using AnalyticsService
   */
  static async getDashboardAnalytics(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();
    const { startDate, endDate } = req.query;

    const { AnalyticsService } = await import('../services/analytics.service');

    const options = {
      startDate: startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const [userMetrics, adoptionMetrics, applicationMetrics] = await Promise.all([
      AnalyticsService.getUserBehaviorMetrics(options),
      AnalyticsService.getAdoptionMetrics(options),
      AnalyticsService.getApplicationMetrics(options),
    ]);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: {
        users: userMetrics,
        adoptions: adoptionMetrics,
        applications: applicationMetrics,
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Get platform usage analytics with corrected parameter handling
   */
  static async getUsageAnalytics(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    }

    const analytics = await AdminService.getSystemStatistics();

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: analytics,
    });
  }

  /**
   * Export platform data.
   *
   * ADS-421: previously buffered the entire table in memory and
   * pretty-printed it to a JSON string — a single export request
   * could OOM the process. Now streams paginated rows directly to
   * the response in JSON / JSONL / CSV.
   */
  static async exportData(req: AuthenticatedRequest, res: Response) {
    const { type, format = 'json' } = req.query;

    // Validation
    if (!type) {
      return res.status(400).json({
        error: 'Export type is required',
      });
    }

    const validTypes = ['users', 'rescues', 'pets', 'applications', 'audit_logs'];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        error: 'Invalid export type',
      });
    }

    const validFormats = ['json', 'jsonl', 'csv'];
    if (!validFormats.includes(format as string)) {
      return res.status(400).json({
        error: 'Invalid export format',
      });
    }

    const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    } else if (format === 'jsonl') {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    const stream = AdminService.streamExport(
      type as 'users' | 'rescues' | 'pets' | 'applications' | 'audit_logs',
      format as 'json' | 'jsonl' | 'csv'
    );

    stream.on('error', error => {
      logger.error('Error streaming export:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to export data',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  }

  /**
   * Get user details with fixed filters
   */
  static async getUserDetails(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;

    const user = await AdminService.getUserById(userId);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
    });
  }

  /**
   * Get platform configuration
   */
  static async getConfiguration(req: AuthenticatedRequest, res: Response) {
    // This would typically return platform configuration settings
    // For now, returning a placeholder
    const config = {
      platform: {
        name: "Adopt Don't Shop",
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      features: {
        realTimeMessaging: true,
        fileUploads: true,
        notifications: true,
        analytics: true,
      },
      limits: {
        maxFileSize: '10MB',
        maxUsers: 'unlimited',
        maxRescues: 'unlimited',
        maxPets: 'unlimited',
      },
    };

    res.json({
      success: true,
      data: config,
    });
  }

  /**
   * Update platform configuration (placeholder)
   */
  static async updateConfiguration(req: AuthenticatedRequest, res: Response) {
    const { key, value } = req.body;

    // Validation
    if (!key || value === undefined) {
      return res.status(400).json({
        error: 'Configuration key and value are required',
      });
    }

    // This would implement actual configuration updates
    // For now, just log the attempt
    logger.info(`Admin ${req.user!.userId} attempted to update config: ${key} = ${value}`);

    res.json({
      success: true,
      message: 'Configuration update not implemented yet',
      data: { key, value },
    });
  }

  static async getUsers(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { page = 1, limit = DEFAULT_PAGE_SIZE, status, userType, search } = req.query;

    const result = await AdminService.getUsers({
      status: status as UserStatus,
      userType: userType as UserType,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result,
    });
  }

  static async getUserById(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;

    const user = await AdminService.getUserById(userId);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
    });
  }

  static async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;
    const { status } = req.body;
    const adminId = req.user?.userId || 'system';

    const user = await AdminService.updateUserStatus(userId, status, adminId);

    // ADS-450 / ADS-464: capture request-level metadata (IP, user-agent)
    // alongside the service-layer audit row so admin actions are
    // forensically reconstructible.
    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_USER_STATUS',
      entity: 'User',
      entityId: userId,
      details: { status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
    });
  }

  static async suspendUser(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId || 'system';

    const user = await AdminService.suspendUser(userId, adminId, reason);

    // ADS-450 / ADS-464: durable audit trail with request metadata.
    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_SUSPEND_USER',
      entity: 'User',
      entityId: userId,
      details: { reason: reason ?? null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
    });
  }

  static async unsuspendUser(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;
    const adminId = req.user?.userId || 'system';

    const user = await AdminService.unsuspendUser(userId, adminId);

    // ADS-450 / ADS-464: durable audit trail with request metadata.
    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_UNSUSPEND_USER',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
    });
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId || 'system';

    await AdminService.deleteUser(userId, adminId, reason);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  }

  static async getRescues(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { page = 1, limit = DEFAULT_PAGE_SIZE, status, search } = req.query;

    const result = await AdminService.getRescues({
      status: status as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result,
    });
  }

  static async verifyRescue(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { rescueId } = req.params;
    const adminId = req.user?.userId || 'system';

    const rescue = await AdminService.verifyRescue(rescueId, adminId);

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: rescue,
    });
  }

  static async getSystemStatistics(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const statistics = await AdminService.getSystemStatistics();

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: statistics,
    });
  }

  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    const { startDate, endDate } = req.query;

    const stats = await AdminService.getPlatformMetrics();

    loggerHelpers.logRequest(req, res, Date.now() - startTime);
    res.json(stats);
  }

  static async getUsersAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    const {
      search,
      role,
      status,
      _verificationStatus, // Prefix with underscore to indicate intentionally unused
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const allowedSortBy = ['email', 'firstName', 'lastName', 'createdAt', 'status'];
    const safeSortBy = allowedSortBy.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const safeSortOrder =
      (sortOrder as string)?.toUpperCase() === 'ASC' ? ('ASC' as const) : ('DESC' as const);

    const parsedLimit = parseInt(limit as string);

    const result = await AdminService.getUsers({
      search: search as string,
      status: status as UserStatus,
      userType: role as UserType,
      page: parseInt(page as string),
      limit: parsedLimit,
      sortBy: safeSortBy,
      sortOrder: safeSortOrder,
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: parsedLimit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  }

  /**
   * Update user profile (admin action)
   */
  static async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    const { userId } = req.params;
    const { firstName, lastName, email, phoneNumber, userType } = req.body;
    const adminId = req.user!.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
    };

    // Update user fields
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }
    if (email !== undefined) {
      user.email = email;
    }
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
    }
    if (userType !== undefined) {
      user.userType = userType;
    }

    await user.save();

    // Log the change
    await AuditLogService.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      details: {
        old: oldData,
        new: { firstName, lastName, email, phoneNumber, userType },
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    loggerHelpers.logRequest(req, res, Date.now() - startTime);

    res.json({
      success: true,
      data: user,
      message: 'User profile updated successfully',
    });
  }

  static async updateRescuePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { rescueId } = req.params;
    const { plan, planExpiresAt } = req.body as {
      plan: RescuePlan;
      planExpiresAt?: string | null;
    };

    const rescue = await Rescue.findByPk(rescueId);
    if (!rescue) {
      res.status(404).json({ error: 'Rescue not found' });
      return;
    }

    const previousPlan = rescue.plan;
    await rescue.update({
      plan,
      planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
    });

    await AuditLogService.log({
      action: 'UPDATE_PLAN',
      entity: 'Rescue',
      entityId: rescueId,
      details: { previousPlan, newPlan: plan, planExpiresAt: planExpiresAt ?? null },
      userId: req.user?.userId ?? 'system',
      ipAddress: req.ip ?? '',
      userAgent: req.get('user-agent') ?? '',
    });

    res.json({
      success: true,
      data: { rescueId, plan, planExpiresAt: planExpiresAt ?? null },
    });
  }
}
