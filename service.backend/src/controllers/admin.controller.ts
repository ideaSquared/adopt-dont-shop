import { Request, Response } from 'express';
import User, { UserStatus, UserType } from '../models/User';
import AdminService from '../services/admin.service';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    rescueId?: string;
  };
}

export class AdminController {
  /**
   * Get platform metrics (dashboard data)
   */
  static async getPlatformMetrics(req: AuthenticatedRequest, res: Response) {
    try {
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
    } catch (error) {
      logger.error('Error getting platform metrics:', error);
      res.status(500).json({
        error: 'Failed to get platform metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search and manage users
   */
  static async searchUsers(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const {
        search,
        role,
        status,
        verificationStatus,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const result = await AdminService.getUsers({
        search: search as string,
        status: status as UserStatus,
        userType: role as UserType,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: 20,
          total: result.total,
          pages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Error searching users:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to search users',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
    try {
      const health = await AdminService.getSystemHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Error getting system health:', error);
      res.status(500).json({
        error: 'Failed to get system health',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 50,
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
    } catch (error) {
      logger.error('Error getting audit logs:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to get audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get rescue organization management data
   */
  static async getRescueManagement(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 20, status } = req.query;

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
    } catch (error) {
      logger.error('Error getting rescue management:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to get rescue management',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Moderate a rescue organization (approve/reject)
   */
  static async moderateRescue(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
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
    } catch (error) {
      logger.error('Error moderating rescue:', {
        error: error instanceof Error ? error.message : String(error),
        action: req.body.action,
        rescueId: req.params.rescueId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to moderate rescue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get platform usage analytics with corrected parameter handling
   */
  static async getUsageAnalytics(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
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
    } catch (error) {
      logger.error('Error getting usage analytics:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to get usage analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export platform data
   */
  static async exportData(req: AuthenticatedRequest, res: Response) {
    try {
      const { type, format = 'json' } = req.query;

      // Validation
      if (!type) {
        return res.status(400).json({
          error: 'Export type is required',
        });
      }

      const validTypes = ['users', 'rescues', 'pets', 'applications'];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({
          error: 'Invalid export type',
        });
      }

      const validFormats = ['json', 'csv'];
      if (!validFormats.includes(format as string)) {
        return res.status(400).json({
          error: 'Invalid export format',
        });
      }

      const exportData = await AdminService.exportData(
        type as 'users' | 'rescues' | 'pets' | 'applications',
        format as string
      );

      // Set appropriate headers for download
      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      }

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      logger.error('Error exporting data:', error);
      res.status(500).json({
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get user details with fixed filters
   */
  static async getUserDetails(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      const user = await AdminService.getUserById(userId);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error getting user details:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to get user details',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get platform configuration
   */
  static async getConfiguration(req: AuthenticatedRequest, res: Response) {
    try {
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
    } catch (error) {
      logger.error('Error getting configuration:', error);
      res.status(500).json({
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update platform configuration (placeholder)
   */
  static async updateConfiguration(req: AuthenticatedRequest, res: Response) {
    try {
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
    } catch (error) {
      logger.error('Error updating configuration:', error);
      res.status(500).json({
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getUsers(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 20, status, userType, search } = req.query;

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
    } catch (error) {
      logger.error('Admin getUsers failed:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
      });
    }
  }

  static async getUserById(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;

      const user = await AdminService.getUserById(userId);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Admin getUserById failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
      });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const { status } = req.body;
      const adminId = (req as AuthenticatedRequest).user?.userId || 'system';

      const user = await AdminService.updateUserStatus(userId, status, adminId);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Admin updateUserStatus failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        status: req.body.status,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
      });
    }
  }

  static async suspendUser(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = (req as AuthenticatedRequest).user?.userId || 'system';

      const user = await AdminService.suspendUser(userId, adminId, reason);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Admin suspendUser failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        reason: req.body.reason,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to suspend user',
      });
    }
  }

  static async unsuspendUser(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const adminId = (req as AuthenticatedRequest).user?.userId || 'system';

      const user = await AdminService.unsuspendUser(userId, adminId);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Admin unsuspendUser failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to unsuspend user',
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = (req as AuthenticatedRequest).user?.userId || 'system';

      await AdminService.deleteUser(userId, adminId, reason);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Admin deleteUser failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        reason: req.body.reason,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
    }
  }

  static async getRescues(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 20, status, search } = req.query;

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
    } catch (error) {
      logger.error('Admin getRescues failed:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rescues',
      });
    }
  }

  static async verifyRescue(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const { rescueId } = req.params;
      const adminId = (req as AuthenticatedRequest).user?.userId || 'system';

      const rescue = await AdminService.verifyRescue(rescueId, adminId);

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: rescue,
      });
    } catch (error) {
      logger.error('Admin verifyRescue failed:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId: req.params.rescueId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to verify rescue',
      });
    }
  }

  static async getSystemStatistics(req: Request, res: Response) {
    const startTime = Date.now();

    try {
      const statistics = await AdminService.getSystemStatistics();

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Admin getSystemStatistics failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system statistics',
      });
    }
  }

  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { startDate, endDate } = req.query;

      const stats = await AdminService.getPlatformMetrics();

      loggerHelpers.logRequest(req, res, Date.now() - startTime);
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get dashboard stats:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
  }

  static async getUsersAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const {
        search,
        role,
        status,
        _verificationStatus, // Prefix with underscore to indicate intentionally unused
        page = 1,
        limit = 20,
        _sortBy = 'createdAt', // Prefix with underscore to indicate intentionally unused
        _sortOrder = 'DESC', // Prefix with underscore to indicate intentionally unused
      } = req.query;

      const result = await AdminService.getUsers({
        search: search as string,
        status: status as UserStatus,
        userType: role as UserType,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      loggerHelpers.logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: 20,
          total: result.total,
          pages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Error searching users:', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to search users',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update user profile (admin action)
   */
  static async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
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
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (email !== undefined) user.email = email;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      if (userType !== undefined) user.userType = userType;

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
    } catch (error) {
      logger.error('Error updating user profile:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
        duration: Date.now() - startTime,
      });
      res.status(500).json({
        error: 'Failed to update user profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
