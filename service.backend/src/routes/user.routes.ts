import { Router } from 'express';
import UserController, { userValidation } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requirePermissionOrOwnership } from '../middleware/rbac';
import { PERMISSIONS } from '../types';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /users/profile - Get current user profile
router.get('/profile', UserController.getCurrentUserProfile);

// PUT /users/profile - Update current user profile
router.put('/profile', userValidation.updateProfile, UserController.updateUser);

// GET /users/preferences - Get current user preferences
router.get('/preferences', UserController.getUserPreferences);

// PUT /users/preferences - Update current user preferences
router.put('/preferences', UserController.updateUserPreferences);

// POST /users/preferences/reset - Reset user preferences to defaults
router.post('/preferences/reset', UserController.resetUserPreferences);

// GET /users/search - Search users (admin/rescue staff only)
router.get('/search', requireAdmin, userValidation.searchUsers, UserController.searchUsers);

// GET /users/statistics - Get user statistics (admin only)
router.get('/statistics', requireAdmin, UserController.getUserStats);

// GET /users/:userId - Get user by ID
router.get(
  '/:userId',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserById
);

// PUT /users/:userId - Update user profile by ID
router.put(
  '/:userId',
  requirePermissionOrOwnership(PERMISSIONS.USER_UPDATE, 'userId'),
  userValidation.updateProfile,
  UserController.updateUser
);

// GET /users/:userId/activity - Get user activity summary
router.get(
  '/:userId/activity',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserActivitySummary
);

// PUT /users/:userId/role - Update user role (admin only)
router.put('/:userId/role', requireAdmin, userValidation.updateRole, UserController.updateUserRole);

// POST /users/:userId/deactivate - Deactivate user (admin only)
router.post('/:userId/deactivate', requireAdmin, UserController.deactivateUser);

// POST /users/:userId/reactivate - Reactivate user (admin only)
router.post('/:userId/reactivate', requireAdmin, UserController.reactivateUser);

// POST /users/bulk-update - Bulk update users (admin only)
router.post(
  '/bulk-update',
  requireAdmin,
  userValidation.bulkUpdate,
  UserController.bulkUpdateUsers
);

export default router;
