import { Router } from 'express';
import UserController, { userValidation } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, requirePermissionOrOwnership } from '../middleware/rbac';
import { PERMISSIONS } from '../types';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     tags: [User Management]
 *     summary: Get current user profile
 *     description: Get the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     userType:
 *                       type: string
 *                       enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *                     phone:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/profile
 *     description: Handle GET request for /api/v1/profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/profile successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/profile
 *     description: Handle GET request for /api/v1/profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/profile successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/profile', UserController.getCurrentUserProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     tags: [User Management]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Animal lover with experience caring for rescue dogs"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/profile
 *     description: Handle PUT request for /api/v1/profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/profile successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/profile successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/profile
 *     description: Handle PUT request for /api/v1/profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/profile successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/profile successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/profile', userValidation.updateProfile, UserController.updateUser);

/**
 * @swagger
 * /api/v1/users/preferences:
 *   get:
 *     tags: [User Management]
 *     summary: Get user preferences
 *     description: Get the authenticated user's notification and app preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 preferences:
 *                   type: object
 *                   properties:
 *                     emailNotifications:
 *                       type: boolean
 *                       example: true
 *                     pushNotifications:
 *                       type: boolean
 *                       example: false
 *                     marketingEmails:
 *                       type: boolean
 *                       example: false
 *                     language:
 *                       type: string
 *                       example: en
 *                     timezone:
 *                       type: string
 *                       example: America/New_York
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/preferences:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/preferences
 *     description: Handle GET request for /api/v1/preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/preferences successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/preferences:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/preferences
 *     description: Handle GET request for /api/v1/preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/preferences successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/preferences', UserController.getUserPreferences);

/**
 * @swagger
 * /api/v1/users/preferences:
 *   put:
 *     tags: [User Management]
 *     summary: Update user preferences
 *     description: Update the authenticated user's notification and app preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *                 example: true
 *               pushNotifications:
 *                 type: boolean
 *                 example: false
 *               marketingEmails:
 *                 type: boolean
 *                 example: false
 *               language:
 *                 type: string
 *                 example: en
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Preferences updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/preferences:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/preferences
 *     description: Handle PUT request for /api/v1/preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/preferences successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/preferences successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/preferences:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/preferences
 *     description: Handle PUT request for /api/v1/preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/preferences successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/preferences successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/preferences', UserController.updateUserPreferences);

/**
 * @swagger
 * /api/v1/users/preferences/reset:
 *   post:
 *     tags: [User Management]
 *     summary: Reset user preferences to defaults
 *     description: Reset all user preferences to their default values
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Preferences reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Preferences reset to defaults
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/preferences/reset:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/preferences/reset
 *     description: Handle POST request for /api/v1/preferences/reset
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/preferences/reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/preferences/reset successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/preferences/reset:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/preferences/reset
 *     description: Handle POST request for /api/v1/preferences/reset
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/preferences/reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/preferences/reset successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/preferences/reset', UserController.resetUserPreferences);

/**
 * @swagger
 * /api/v1/users/account:
 *   delete:
 *     tags: [User Management]
 *     summary: Delete user account
 *     description: Permanently delete the authenticated user's account and all associated data
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "No longer need the service"
 *               feedback:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Great service, but circumstances changed"
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         headers:
 *           Set-Cookie:
 *             description: Cleared authentication cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/account:
 *   delete:
 *     tags: [User Management]
 *     summary: DELETE /api/v1/account
 *     description: Handle DELETE request for /api/v1/account
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/account successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/account successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/account:
 *   delete:
 *     tags: [User Management]
 *     summary: DELETE /api/v1/account
 *     description: Handle DELETE request for /api/v1/account
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/account successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/account successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/account', UserController.deleteAccount);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     tags: [User Management]
 *     summary: Search users (Admin only)
 *     description: Search and filter users with pagination. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *         example: "john"
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *         description: Filter by user type
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                         format: email
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       userType:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/search',
  requirePermission(PERMISSIONS.ADMIN_USER_SEARCH),
  userValidation.searchUsers,
  UserController.searchUsers
);

/**
 * @swagger
 * /api/v1/users/statistics:
 *   get:
 *     tags: [User Management]
 *     summary: Get user statistics (Admin only)
 *     description: Get comprehensive user statistics and metrics. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 1250
 *                     verifiedUsers:
 *                       type: integer
 *                       example: 1100
 *                     usersByType:
 *                       type: object
 *                       properties:
 *                         ADOPTER:
 *                           type: integer
 *                           example: 1000
 *                         RESCUE_STAFF:
 *                           type: integer
 *                           example: 200
 *                         ADMIN:
 *                           type: integer
 *                           example: 50
 *                     newUsersThisMonth:
 *                       type: integer
 *                       example: 45
 *                     activeUsersLastWeek:
 *                       type: integer
 *                       example: 300
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/v1/statistics:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/statistics
 *     description: Handle GET request for /api/v1/statistics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/statistics successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/statistics:
 *   get:
 *     tags: [User Management]
 *     summary: GET /api/v1/statistics
 *     description: Handle GET request for /api/v1/statistics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/statistics successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/statistics',
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  UserController.getUserStats
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [User Management]
 *     summary: Get user by ID
 *     description: Get detailed user information by ID. Users can view their own profile, admins can view any.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     userType:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:userId',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserById
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     tags: [User Management]
 *     summary: Update user profile by ID
 *     description: Update user profile information by ID. Users can update their own profile, admins can update any.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Animal lover with rescue experience"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:userId',
  requirePermissionOrOwnership(PERMISSIONS.USER_UPDATE, 'userId'),
  userValidation.updateProfile,
  UserController.updateUser
);

/**
 * @swagger
 * /api/v1/users/{userId}/activity:
 *   get:
 *     tags: [User Management]
 *     summary: Get user activity summary
 *     description: Get user's activity history and statistics. Users can view their own activity, admins can view any.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activity:
 *                   type: object
 *                   properties:
 *                     applicationsSubmitted:
 *                       type: integer
 *                       example: 5
 *                     favoritePets:
 *                       type: integer
 *                       example: 12
 *                     messagesExchanged:
 *                       type: integer
 *                       example: 34
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     recentActions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           details:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:userId/activity',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserActivitySummary
);

/**
 * @swagger
 * /api/v1/users/{userId}/permissions:
 *   get:
 *     tags: [User Management]
 *     summary: Get user permissions
 *     description: Get all permissions for a specific user based on their roles
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pets:read", "applications:read", "pets:create"]
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:userId/permissions',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserPermissions
);

/**
 * @swagger
 * /api/v1/users/{userId}/with-permissions:
 *   get:
 *     tags: [User Management]
 *     summary: Get user with permissions
 *     description: Get user details along with their permissions and roles
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User with permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 userType:
 *                   type: string
 *                   enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roleId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:userId/with-permissions',
  requirePermissionOrOwnership(PERMISSIONS.USER_READ, 'userId'),
  UserController.getUserWithPermissions
);

/**
 * @swagger
 * /api/v1/users/{userId}/role:
 *   put:
 *     tags: [User Management]
 *     summary: Update user role (Admin only)
 *     description: Update user's role/type. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userType
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *                 example: RESCUE_STAFF
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Promoted to rescue staff role"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User role updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{userId}/role:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/{userId}/role
 *     description: Handle PUT request for /api/v1/{userId}/role
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/{userId}/role successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/{userId}/role successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{userId}/role:
 *   put:
 *     tags: [User Management]
 *     summary: PUT /api/v1/{userId}/role
 *     description: Handle PUT request for /api/v1/{userId}/role
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PUT /api/v1/{userId}/role successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PUT /api/v1/{userId}/role successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:userId/role',
  requirePermission(PERMISSIONS.ADMIN_USER_ROLE_UPDATE),
  userValidation.updateRole,
  UserController.updateUserRole
);

/**
 * @swagger
 * /api/v1/users/{userId}/deactivate:
 *   post:
 *     tags: [User Management]
 *     summary: Deactivate user (Admin only)
 *     description: Deactivate a user account. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Policy violation"
 *               notifyUser:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deactivated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{userId}/deactivate:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/{userId}/deactivate
 *     description: Handle POST request for /api/v1/{userId}/deactivate
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{userId}/deactivate successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{userId}/deactivate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{userId}/deactivate:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/{userId}/deactivate
 *     description: Handle POST request for /api/v1/{userId}/deactivate
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{userId}/deactivate successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{userId}/deactivate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/:userId/deactivate',
  requirePermission(PERMISSIONS.ADMIN_USER_DEACTIVATE),
  UserController.deactivateUser
);

/**
 * @swagger
 * /api/v1/users/{userId}/reactivate:
 *   post:
 *     tags: [User Management]
 *     summary: Reactivate user (Admin only)
 *     description: Reactivate a deactivated user account. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Issue resolved"
 *               notifyUser:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       200:
 *         description: User reactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User reactivated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{userId}/reactivate:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/{userId}/reactivate
 *     description: Handle POST request for /api/v1/{userId}/reactivate
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{userId}/reactivate successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{userId}/reactivate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{userId}/reactivate:
 *   post:
 *     tags: [User Management]
 *     summary: POST /api/v1/{userId}/reactivate
 *     description: Handle POST request for /api/v1/{userId}/reactivate
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{userId}/reactivate successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{userId}/reactivate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/:userId/reactivate',
  requirePermission(PERMISSIONS.ADMIN_USER_REACTIVATE),
  UserController.reactivateUser
);

/**
 * @swagger
 * /api/v1/users/bulk-update:
 *   post:
 *     tags: [User Management]
 *     summary: Bulk update users (Admin only)
 *     description: Update multiple users at once. Admin access required.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - updates
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000", "987fcdeb-51a2-43d7-8f9e-123456789abc"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   userType:
 *                     type: string
 *                     enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *                   isActive:
 *                     type: boolean
 *                   emailNotifications:
 *                     type: boolean
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Bulk role update for rescue staff"
 *     responses:
 *       200:
 *         description: Users updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "5 users updated successfully"
 *                 updatedCount:
 *                   type: integer
 *                   example: 5
 *                 failedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/bulk-update',
  requirePermission(PERMISSIONS.ADMIN_USER_BULK_UPDATE),
  userValidation.bulkUpdate,
  UserController.bulkUpdateUsers
);

export default router;
