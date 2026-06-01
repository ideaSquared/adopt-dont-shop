import { Response } from 'express';
import { body, query } from 'express-validator';
import { BulkUserUpdateRequestSchema } from '@adopt-dont-shop/lib.validation';
import User, { UserType } from '../models/User';
import UserService from '../services/user.service';
import AuthService from '../services/auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from './auth.controller';
import { AuthenticatedRequest } from '../types';
import { logger, loggerHelpers } from '../utils/logger';
import { validateBody } from '../middleware/zod-validate';
import { RichTextProcessingService } from '../services/rich-text-processing.service';

// Validation rules
export const userValidation = {
  // ADS-784: the snake_case `updateProfile` express-validator chain was removed.
  // The FE sends camelCase, so it never matched; the users.* update routes now
  // use validateBody(UpdateProfileRequestSchema) (camelCase) directly.
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

  bulkUpdate: validateBody(BulkUserUpdateRequestSchema),
};

export class UserController {
  /**
   * Get current user profile
   */
  async getCurrentUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const user = await UserService.getUserById(userId);
    res.json(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  /**
   * Update user profile
   */
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const requestingUserId = req.user!.userId;
    const requestingUserType = req.user!.userType as UserType;

    if (requestingUserId !== userId && requestingUserType !== UserType.ADMIN) {
      res.status(403).json({ error: "Cannot update another user's profile" });
      return;
    }

    if (typeof req.body.bio === 'string') {
      req.body.bio = RichTextProcessingService.sanitize(req.body.bio);
    }

    const updatedUser = await UserService.updateUserProfile(userId, req.body);
    res.json(updatedUser);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const requestingUserId = req.user!.userId;

    // Prevent self-deactivation
    UserService.validateUserOperation(requestingUserId, userId, 'deactivate');

    const result = await UserService.deactivateUser(userId, requestingUserId);
    res.json(result);
  }

  /**
   * Activate user account
   */
  async activateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const requestingUserId = req.user!.userId;

    const result = await UserService.reactivateUser(userId, requestingUserId);
    res.json(result);
  }

  /**
   * Search users with filters
   */
  async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = UserService.processSearchFilters(
      req.query as Record<string, string | undefined>
    );
    const result = await UserService.searchUsers(filters);
    res.json(result);
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userIds, updateData, reason } = req.body;
    const requestingUserId = req.user!.userId;

    // Prevent including own account in bulk operations
    UserService.validateBulkOperation(requestingUserId, userIds, 'update');

    const result = await UserService.bulkUpdateUsers(
      [{ userIds, updates: updateData, reason }],
      requestingUserId
    );
    res.json(result);
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await UserService.getUserStatistics();
    res.json(stats);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const preferences = await UserService.getUserPreferences(userId);
    res.json({
      success: true,
      data: preferences,
    });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const preferences = req.body;

    const updatedPreferences = await UserService.updateUserPreferences(userId, preferences);
    res.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully',
    });
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const resetPreferences = await UserService.resetUserPreferences(userId);
    res.json({
      success: true,
      data: resetPreferences,
      message: 'Preferences reset to defaults',
    });
  }

  /**
   * Get user activity summary (aggregate stats).
   */
  async getUserActivitySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const activitySummary = await UserService.getUserActivitySummary(userId);
    res.json({
      success: true,
      data: activitySummary,
    });
  }

  /**
   * Get user activity log (paginated audit-log entries).
   */
  async getUserActivityLog(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { from, to, limit, offset } = req.query;
    const activity = await UserService.getUserActivityLog(userId, {
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
      offset: typeof offset === 'string' ? Number(offset) : undefined,
    });
    res.json({
      success: true,
      data: activity,
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { userType } = req.body;
    const adminUserId = req.user!.userId;

    const updatedUser = await UserService.updateUserRole(userId, userType, adminUserId);
    res.json({
      success: true,
      data: updatedUser,
      message: 'User role updated successfully',
    });
  }

  /**
   * Reactivate user account
   */
  async reactivateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const requestingUserId = req.user!.userId;

    const result = await UserService.reactivateUser(userId, requestingUserId);
    res.json({
      success: true,
      data: result,
      message: 'User reactivated successfully',
    });
  }

  /**
   * Delete current user account.
   *
   * ADS-592: requires step-up auth — the caller must re-supply their current
   * password (and a TOTP code if 2FA is enabled). On success, both
   * `accessToken` and `refreshToken` cookies are cleared and the underlying
   * tokens are revoked so a stolen session cannot continue to act as the
   * deleted user.
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    const startTime = Date.now();
    const userId = req.user!.userId;

    const { password, twoFactorToken, reason } = req.body ?? {};

    if (typeof password !== 'string' || password.length === 0) {
      return res.status(401).json({ error: 'Password is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      await AuthService.verifyStepUpCredentials(user, password, twoFactorToken);
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : 'Invalid credentials';
      loggerHelpers.logSecurity('Account deletion step-up auth failed', {
        userId,
        reason: message,
      });
      return res.status(401).json({ error: message });
    }

    const accessToken =
      req.cookies?.[ACCESS_TOKEN_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    // Revoke tokens before destroying the user so any race with a parallel
    // request sees the revocation. AuthService.logout is best-effort and
    // does not throw on missing/invalid tokens.
    await AuthService.logout(refreshToken, accessToken, userId, req.ip, req.get('user-agent'));

    await UserService.deleteAccount(userId, reason);

    res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);

    logger.info('User account deleted', { userId, duration: Date.now() - startTime });

    return res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }

  /**
   * Get user permissions
   * GET /api/v1/users/:userId/permissions
   */
  async getUserPermissions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const startTime = Date.now();
    const { userId } = req.params;

    const userPermissions = await UserService.getUserPermissions(userId);

    logger.info('User permissions retrieved', {
      userId,
      permissionCount: userPermissions.length,
      duration: Date.now() - startTime,
    });

    return res.json({
      success: true,
      permissions: userPermissions,
    });
  }

  /**
   * Get user with permissions
   * GET /api/v1/users/:userId/with-permissions
   */
  async getUserWithPermissions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const startTime = Date.now();
    const { userId } = req.params;

    const userWithPermissions = await UserService.getUserWithPermissions(userId);

    if (!userWithPermissions) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    logger.info('User with permissions retrieved', {
      userId,
      duration: Date.now() - startTime,
    });

    return res.json(userWithPermissions);
  }
}

export default new UserController();
