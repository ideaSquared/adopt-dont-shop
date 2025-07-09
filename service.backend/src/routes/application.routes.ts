import express from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';

const router = express.Router();
const applicationController = new ApplicationController();

// Routes requiring authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/applications:
 *   get:
 *     tags: [Application Management]
 *     summary: Get adoption applications
 *     description: Get adoption applications with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN]
 *         description: Filter by application status
 *       - in: query
 *         name: petId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by pet ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin/rescue staff only)
 *       - in: query
 *         name: rescueId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by rescue organization ID
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
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 applications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       applicationId:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN]
 *                       pet:
 *                         type: object
 *                         properties:
 *                           petId:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           breed:
 *                             type: string
 *                       applicant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             format: uuid
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *                       submittedAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/',
  ApplicationController.validateGetApplications,
  applicationController.getApplications
);

/**
 * @swagger
 * /api/v1/applications:
 *   post:
 *     tags: [Application Management]
 *     summary: Create new adoption application
 *     description: Submit a new adoption application for a pet. Adopter role required.
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
 *               - petId
 *               - answers
 *             properties:
 *               petId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the pet being applied for
 *               answers:
 *                 type: object
 *                 description: Application form answers based on rescue requirements
 *                 example:
 *                   experience: "5 years with dogs"
 *                   housing: "House with fenced yard"
 *                   otherPets: "One cat, friendly with dogs"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes or comments
 *                 example: "Very excited to provide a loving home"
 *     responses:
 *       201:
 *         description: Application created successfully
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
 *                   example: "Application created successfully"
 *                 applicationId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   example: "DRAFT"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Application already exists for this pet
 */
router.post(
  '/',
  requireRole(UserType.ADOPTER),
  ApplicationController.validateCreateApplication,
  applicationController.createApplication
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}:
 *   get:
 *     tags: [Application Management]
 *     summary: Get application details by ID
 *     description: Get detailed information about a specific application
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 application:
 *                   type: object
 *                   properties:
 *                     applicationId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN]
 *                     pet:
 *                       type: object
 *                       properties:
 *                         petId:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                         breed:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                     applicant:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                     answers:
 *                       type: object
 *                       description: Application form answers
 *                     notes:
 *                       type: string
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           documentId:
 *                             type: string
 *                             format: uuid
 *                           fileName:
 *                             type: string
 *                           fileType:
 *                             type: string
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
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
  '/:applicationId',
  ApplicationController.validateApplicationId,
  applicationController.getApplicationById
);

// Update application (owner only for draft/submitted)
router.put(
  '/:applicationId',
  ApplicationController.validateUpdateApplication,
  applicationController.updateApplication
);

// Submit application for review (owner only)
router.post(
  '/:applicationId/submit',
  ApplicationController.validateApplicationId,
  applicationController.submitApplication
);

// Update application status (rescue staff/admin only)
router.patch(
  '/:applicationId/status',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateUpdateApplicationStatus,
  applicationController.updateApplicationStatus
);

// Withdraw application (owner only)
router.post(
  '/:applicationId/withdraw',
  ApplicationController.validateApplicationId,
  applicationController.withdrawApplication
);

// Delete application (owner only)
router.delete(
  '/:applicationId',
  ApplicationController.validateApplicationId,
  applicationController.deleteApplication
);

// Add document to application (owner only)
router.post(
  '/:applicationId/documents',
  ApplicationController.validateDocumentUpload,
  applicationController.addDocument
);

// Update reference status (rescue staff/admin only)
router.patch(
  '/:applicationId/references',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateReferenceUpdate,
  applicationController.updateReference
);

// Get application form structure for a rescue
router.get('/form-structure/:rescueId', applicationController.getApplicationFormStructure);

// Validate application answers
router.post('/validate/:rescueId', applicationController.validateApplicationAnswers);

// Get application statistics (rescue staff/admin only)
router.get(
  '/statistics',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  applicationController.getApplicationStatistics
);

// Bulk update applications (admin only)
router.patch(
  '/bulk-update',
  requireRole(UserType.ADMIN),
  ApplicationController.validateBulkUpdate,
  applicationController.bulkUpdateApplications
);

// Legacy routes for backwards compatibility
router.get(
  '/:applicationId/history',
  ApplicationController.validateApplicationId,
  applicationController.getApplicationHistory
);

router.post(
  '/:applicationId/schedule-visit',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.scheduleVisit
);

export default router;
