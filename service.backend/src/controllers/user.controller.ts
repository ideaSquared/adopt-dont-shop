import { Response } from 'express';
import { body, query } from 'express-validator';
import { UserType } from '../models/User';
import UserService from '../services/user.service';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

// Validation rules
export const userValidation = {
  updateProfile: [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location must be less than 100 characters'),
    body('profile_image_url').optional().isURL().withMessage('Profile image must be a valid URL'),
  ],

  searchUsers: [
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'])
      .withMessage('Invalid status'),
    query('user_type')
      .optional()
      .isIn(['ADOPTER', 'RESCUE_STAFF', 'ADMIN'])
      .withMessage('Invalid user type'),
    query('email_verified').optional().isBoolean().withMessage('Email verified must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
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
    body('user_type').isIn(['ADOPTER', 'RESCUE_STAFF', 'ADMIN']).withMessage('Invalid user type'),
  ],

  bulkUpdate: [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),
    body('userIds.*').isUUID().withMessage('Each user ID must be a valid UUID'),
    body('updateData').isObject().withMessage('Update data must be an object'),
    body('updateData.status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'])
      .withMessage('Invalid status'),
    body('updateData.user_type')
      .optional()
      .isIn(['ADOPTER', 'RESCUE_STAFF', 'ADMIN'])
      .withMessage('Invalid user type'),
  ],
};

export class UserController {
  /**
   * Get current user profile
   */
  async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await UserService.getUserById(userId);
      res.json(user);
    } catch (error) {
      logger.error('Get current user profile failed:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.userId;
      const requestingUserType = req.user!.userType as UserType;

      // Check if user can see private data
      const canSeePrivateData = UserService.canUserSeePrivateData(
        requestingUserId,
        userId,
        requestingUserType
      );

      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (!canSeePrivateData) {
        // Return limited public data only
        const publicUser = {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          bio: user.bio,
          createdAt: user.createdAt,
        };
        res.json(publicUser);
        return;
      }

      res.json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get user by ID failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Update user profile
   */
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const requestingUserId = req.user!.userId;
      const requestingUserType = req.user!.userType as UserType;

      // Check permissions
      if (requestingUserId !== userId && requestingUserType !== UserType.ADMIN) {
        res.status(403).json({ error: "Cannot update another user's profile" });
        return;
      }

      const updatedUser = await UserService.updateUserProfile(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Update user failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.userId;

      // Prevent self-deactivation
      UserService.validateUserOperation(requestingUserId, userId, 'deactivate');

      const result = await UserService.deactivateUser(userId, requestingUserId);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Deactivate user failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (errorMessage.includes('Cannot deactivate')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }

  /**
   * Activate user account
   */
  async activateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.userId;

      const result = await UserService.reactivateUser(userId, requestingUserId);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Activate user failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to activate user' });
    }
  }

  /**
   * Search users with filters
   */
  async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = UserService.processSearchFilters(
        req.query as Record<string, string | undefined>
      );
      const result = await UserService.searchUsers(filters);
      res.json(result);
    } catch (error) {
      logger.error('Search users failed:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds, updateData } = req.body;
      const requestingUserId = req.user!.userId;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ error: 'userIds must be a non-empty array' });
        return;
      }

      // Prevent including own account in bulk operations
      UserService.validateBulkOperation(requestingUserId, userIds, 'update');

      const result = await UserService.bulkUpdateUsers(
        [{ userIds, updates: updateData }],
        requestingUserId
      );
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Bulk update users failed:', error);

      if (errorMessage.includes('Cannot include your own account')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to bulk update users' });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await UserService.getUserStatistics();
      res.json(stats);
    } catch (error) {
      logger.error('Get user stats failed:', error);
      res.status(500).json({ error: 'Failed to get user statistics' });
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const preferences = await UserService.getUserPreferences(userId);
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Get user preferences failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user preferences',
      });
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const preferences = req.body;

      const updatedPreferences = await UserService.updateUserPreferences(userId, preferences);
      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      logger.error('Update user preferences failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user preferences',
      });
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const resetPreferences = await UserService.resetUserPreferences(userId);
      res.json({
        success: true,
        data: resetPreferences,
        message: 'Preferences reset to defaults',
      });
    } catch (error) {
      logger.error('Reset user preferences failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset user preferences',
      });
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const activitySummary = await UserService.getUserActivitySummary(userId);
      res.json({
        success: true,
        data: activitySummary,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get user activity summary failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get user activity summary',
      });
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { userType } = req.body;
      const adminUserId = req.user!.userId;

      const updatedUser = await UserService.updateUserRole(userId, userType, adminUserId);
      res.json({
        success: true,
        data: updatedUser,
        message: 'User role updated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Update user role failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (errorMessage.includes('Cannot change role')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
      });
    }
  }

  /**
   * Reactivate user account
   */
  async reactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.userId;

      const result = await UserService.reactivateUser(userId, requestingUserId);
      res.json({
        success: true,
        data: result,
        message: 'User reactivated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Reactivate user failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to reactivate user',
      });
    }
  }

  /**
   * Delete current user account
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();

    try {
      const userId = req.user!.userId;
      const { reason } = req.body;

      await UserService.deleteAccount(userId, reason);

      // Clear the user's session by logging them out
      res.clearCookie('authToken');

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });

      logger.info('User account deleted', { userId, duration: Date.now() - startTime });
    } catch (error) {
      logger.error('Error deleting account:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.userId,
        duration: Date.now() - startTime,
      });

      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.status(500).json({
        error: 'Failed to delete account',
      });
    }
  }
}

export default new UserController();
