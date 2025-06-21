import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserType } from '../models/User';
import UserService, {
  PaginationOptions,
  UserSearchFilters,
  UserUpdateData,
} from '../services/user.service';
import { logger, loggerHelpers } from '../utils/logger';

export class UserController {
  // Get user profile by ID
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID does not exist',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: 'An error occurred while fetching user information',
      });
    }
  }

  // Get current user profile
  static async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'Current user profile not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get current user profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: 'An error occurred while fetching your profile',
      });
    }
  }

  // Update user profile
  static async updateUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const userId = req.params.userId || req.userId!;
      const updateData: UserUpdateData = req.body;

      // Users can only update their own profile unless they're admin
      if (userId !== req.userId && req.user?.user_type !== UserType.ADMIN) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own profile',
        });
        return;
      }

      const updatedUser = await UserService.updateUserProfile(userId, updateData);

      loggerHelpers.logRequest(req);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error('Update user profile error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update profile',
        message: 'An error occurred while updating the profile',
      });
    }
  }

  // Search users
  static async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const filters: UserSearchFilters = {
        search: req.query.search as string,
        userType: req.query.userType as UserType,
        status: req.query.status as any,
        emailVerified: req.query.emailVerified === 'true',
        rescueId: req.query.rescueId as string,
        createdAfter: req.query.createdAfter
          ? new Date(req.query.createdAfter as string)
          : undefined,
        createdBefore: req.query.createdBefore
          ? new Date(req.query.createdBefore as string)
          : undefined,
      };

      const pagination: PaginationOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as string) || 'created_at',
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
      };

      const result = await UserService.searchUsers(filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Search users error:', error);
      res.status(500).json({
        error: 'Failed to search users',
        message: 'An error occurred while searching for users',
      });
    }
  }

  // Get user statistics (admin only)
  static async getUserStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const statistics = await UserService.getUserStatistics();

      res.status(200).json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get user statistics error:', error);
      res.status(500).json({
        error: 'Failed to get statistics',
        message: 'An error occurred while fetching user statistics',
      });
    }
  }

  // Update user role (admin only)
  static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { userId } = req.params;
      const { roleId } = req.body;

      const updatedUser = await UserService.updateUserRole(userId, roleId);

      loggerHelpers.logBusinessEvent('User role updated by admin', {
        adminId: req.userId,
        targetUserId: userId,
        newRoleId: roleId,
      });

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error('Update user role error:', error);

      if (error instanceof Error) {
        if (error.message === 'User not found' || error.message === 'Role not found') {
          res.status(404).json({
            error: 'Not found',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to update role',
        message: 'An error occurred while updating the user role',
      });
    }
  }

  // Deactivate user (admin only)
  static async deactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      await UserService.deactivateUser(userId, reason);

      loggerHelpers.logBusinessEvent('User deactivated by admin', {
        adminId: req.userId,
        targetUserId: userId,
        reason,
      });

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      logger.error('Deactivate user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to deactivate user',
        message: 'An error occurred while deactivating the user',
      });
    }
  }

  // Reactivate user (admin only)
  static async reactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      await UserService.reactivateUser(userId);

      loggerHelpers.logBusinessEvent('User reactivated by admin', {
        adminId: req.userId,
        targetUserId: userId,
      });

      res.status(200).json({
        success: true,
        message: 'User reactivated successfully',
      });
    } catch (error) {
      logger.error('Reactivate user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to reactivate user',
        message: 'An error occurred while reactivating the user',
      });
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Users can only view their own activity unless they're admin
      if (userId !== req.userId && req.user?.user_type !== UserType.ADMIN) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own activity summary',
        });
        return;
      }

      const summary = await UserService.getUserActivitySummary(userId);

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      logger.error('Get user activity summary error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get activity summary',
        message: 'An error occurred while fetching the activity summary',
      });
    }
  }

  // Get user preferences
  static async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const preferences = await UserService.getUserPreferences(userId);

      res.status(200).json({
        success: true,
        data: { preferences },
      });
    } catch (error) {
      logger.error('Get user preferences error:', error);
      res.status(500).json({
        error: 'Failed to get preferences',
        message: 'An error occurred while fetching user preferences',
      });
    }
  }

  // Update user preferences
  static async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const userId = req.userId!;
      const preferences = req.body;

      await UserService.updateUserPreferences(userId, preferences);

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      logger.error('Update user preferences error:', error);
      res.status(500).json({
        error: 'Failed to update preferences',
        message: 'An error occurred while updating preferences',
      });
    }
  }

  // Bulk update users (admin only)
  static async bulkUpdateUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { userIds, updateData } = req.body;

      const affectedCount = await UserService.bulkUpdateUsers(userIds, updateData);

      loggerHelpers.logBusinessEvent('Bulk user update by admin', {
        adminId: req.userId,
        affectedCount,
        userIds: userIds.length,
        updateFields: Object.keys(updateData),
      });

      res.status(200).json({
        success: true,
        message: `${affectedCount} users updated successfully`,
        data: { affectedCount },
      });
    } catch (error) {
      logger.error('Bulk update users error:', error);
      res.status(500).json({
        error: 'Failed to bulk update users',
        message: 'An error occurred while updating users',
      });
    }
  }
}

// Validation middleware
export const userValidation = {
  updateProfile: [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('bio')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Bio must be less than 1000 characters'),
    body('timezone').optional().isString().withMessage('Timezone must be a string'),
    body('language')
      .optional()
      .isISO31661Alpha2()
      .withMessage('Language must be a valid language code'),
  ],

  searchUsers: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('userType')
      .optional()
      .isIn(['adopter', 'rescue_staff', 'admin', 'moderator'])
      .withMessage('Invalid user type'),
    query('sortBy')
      .optional()
      .isIn(['created_at', 'last_login_at', 'first_name', 'last_name', 'email'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ],

  updateRole: [
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('roleId').isUUID().withMessage('Role ID must be a valid UUID'),
  ],

  bulkUpdate: [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('userIds.*').isUUID().withMessage('Each user ID must be a valid UUID'),
    body('updateData').isObject().withMessage('Update data must be an object'),
  ],
};

export default UserController;
