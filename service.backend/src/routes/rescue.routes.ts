import { Router } from 'express';
import { body, param } from 'express-validator';
import { z } from 'zod';
import {
  AddStaffMemberRequestSchema,
  AdoptionPolicySchema,
  RescueBulkUpdateRequestSchema,
  RescueCreateRequestSchema,
  RescueDeletionRequestSchema,
  RescueRejectionRequestSchema,
  RescueSearchQuerySchema,
  RescueUpdateRequestSchema,
  RescueVerificationRequestSchema,
  StaffInvitationRequestSchema,
} from '@adopt-dont-shop/lib.validation';
import { RescueController } from '../controllers/rescue.controller';
import { QuestionController } from '../controllers/question.controller';
import { authenticateToken } from '../middleware/auth';
import { fieldMask, fieldWriteGuard } from '../middleware/field-permissions';
import {
  invitationSendLimiter,
  searchLimiter,
  sensitiveWriteLimiter,
} from '../middleware/rate-limiter';
import { validateBody, validateParams, validateQuery } from '../middleware/zod-validate';
import { requirePermission } from '../middleware/rbac';
import { requirePlanFeature } from '../middleware/plan-gate';

const router = Router();
const rescueController = new RescueController();
const questionController = new QuestionController();

// Param schemas — kept here so the file is self-contained.
const RescueIdParamSchema = z.object({
  rescueId: z.string().uuid('Invalid rescue ID format'),
});
const RescueAndUserParamSchema = RescueIdParamSchema.extend({
  userId: z.string().min(1, 'User ID is required'),
});

const validateRescueId = validateParams(RescueIdParamSchema);
const validateRescueAndUser = validateParams(RescueAndUserParamSchema);

// Body / query validators — backed by canonical Zod schemas in
// @adopt-dont-shop/lib.validation. Same rules, same error response
// shape (see middleware/zod-validate), one source of truth.
const validateCreateRescue = validateBody(RescueCreateRequestSchema);
const validateUpdateRescue = validateBody(RescueUpdateRequestSchema);
const validateSearchQuery = validateQuery(RescueSearchQuerySchema);
const validateAddStaff = validateBody(AddStaffMemberRequestSchema);
const validateInviteStaff = validateBody(StaffInvitationRequestSchema);
const validateVerification = validateBody(RescueVerificationRequestSchema);
const validateRejection = validateBody(RescueRejectionRequestSchema);
const validateDeletion = validateBody(RescueDeletionRequestSchema);
const validateAdoptionPolicy = validateBody(AdoptionPolicySchema);
const validateBulkUpdate = validateBody(RescueBulkUpdateRequestSchema);

// Send-email body — kept here for now since EmailTemplate-shaped payloads
// haven't migrated to lib.validation yet; the rest of the rescue surface
// is already on Zod above.
const validateSendEmail = validateBody(
  z.object({
    templateId: z.string().trim().min(1).max(100).optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(5000).optional(),
  })
);

// Public routes (no authentication required)

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Search rescue organizations
 *     description: Search and filter rescue organizations with pagination
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for rescue name or location
 *         example: "Golden Retriever Rescue"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, suspended, inactive]
 *         description: Filter by verification status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *         example: "New York"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, verifiedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
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
 *         description: Rescue organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rescues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rescueId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: "Golden Hearts Rescue"
 *                       location:
 *                         type: string
 *                         example: "New York, NY"
 *                       description:
 *                         type: string
 *                       website:
 *                         type: string
 *                         format: uri
 *                       isVerified:
 *                         type: boolean
 *                       petCount:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
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
 * /api/v1/:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
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
 * /api/v1/:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
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
 * /api/v1/:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
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
  '/',
  searchLimiter,
  validateSearchQuery,
  fieldMask('rescues'),
  rescueController.searchRescues
);

/**
 * @swagger
 * /api/v1/rescues/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Get rescue organization details
 *     description: Get detailed information about a specific rescue organization
 *     parameters:
 *       - in: path
 *         name: rescueId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rescue organization ID
 *     responses:
 *       200:
 *         description: Rescue organization details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rescue:
 *                   type: object
 *                   properties:
 *                     rescueId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zipCode:
 *                       type: string
 *                     country:
 *                       type: string
 *                     website:
 *                       type: string
 *                       format: uri
 *                     description:
 *                       type: string
 *                     mission:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     contactPerson:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
 * /api/v1/{rescueId}:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}
 *     description: Handle GET request for /api/v1/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId} successful
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
  '/:rescueId',
  validateRescueId,
  fieldMask('rescues', { audit: true, resourceIdParam: 'rescueId' }),
  rescueController.getRescueById
);

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: Get pets from rescue organization
 *     description: Get all pets available from a specific rescue organization
 *     parameters:
 *       - in: path
 *         name: rescueId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rescue organization ID
 *     responses:
 *       200:
 *         description: Rescue pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       petId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       breed:
 *                         type: string
 *                       age:
 *                         type: string
 *                       size:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [AVAILABLE, PENDING, ADOPTED]
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
 * /api/v1/{rescueId}/pets:
 *   get:
 *     tags: [Rescue Organizations]
 *     summary: GET /api/v1/{rescueId}/pets
 *     description: Handle GET request for /api/v1/{rescueId}/pets
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{rescueId}/pets successful
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
router.get('/:rescueId/pets', validateRescueId, rescueController.getRescuePets);

// Get adoption policies (public route)
router.get('/:rescueId/adoption-policies', validateRescueId, rescueController.getAdoptionPolicies);

// Routes requiring authentication
router.use(authenticateToken);

// Create rescue (any authenticated user can apply)

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
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
 *         description: POST /api/v1/ successful
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
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
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
 *         description: POST /api/v1/ successful
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
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
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
 *         description: POST /api/v1/ successful
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
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Rescue Organizations]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
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
 *         description: POST /api/v1/ successful
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
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/',
  validateCreateRescue,
  fieldWriteGuard('rescues', { audit: true }),
  rescueController.createRescue
);

// Update rescue (rescue admin or staff)
router.put(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('rescues.update'),
  fieldWriteGuard('rescues', { audit: true, resourceIdParam: 'rescueId' }),
  rescueController.updateRescue
);

router.patch(
  '/:rescueId',
  validateRescueId,
  validateUpdateRescue,
  requirePermission('rescues.update'),
  fieldWriteGuard('rescues', { audit: true, resourceIdParam: 'rescueId' }),
  rescueController.updateRescue
);

// Staff management (rescue admin)
router.get(
  '/:rescueId/staff',
  validateRescueId,
  requirePermission('staff.read'),
  rescueController.getRescueStaff
);

router.post(
  '/:rescueId/staff',
  validateRescueId,
  validateAddStaff,
  requirePermission('staff.create'),
  rescueController.addStaffMember
);

router.put(
  '/:rescueId/staff/:userId',
  validateRescueAndUser,
  validateBody(z.object({ title: z.string().trim().max(100).optional() })),
  requirePermission('staff.update'),
  rescueController.updateStaffMember
);

router.delete(
  '/:rescueId/staff/:userId',
  validateRescueAndUser,
  requirePermission('staff.delete'),
  rescueController.removeStaffMember
);

// Staff invitation management (rescue admin)
router.post(
  '/:rescueId/invitations',
  invitationSendLimiter,
  validateRescueId,
  validateInviteStaff,
  requirePermission('staff.create'),
  rescueController.inviteStaffMember
);

router.get(
  '/:rescueId/invitations',
  validateRescueId,
  requirePermission('staff.read'),
  rescueController.getPendingInvitations
);

router.delete(
  '/:rescueId/invitations/:invitationId',
  validateRescueId,
  param('invitationId').isInt().withMessage('Invalid invitation ID'),
  requirePermission('staff.delete'),
  rescueController.cancelInvitation
);

// Analytics (rescue admin/staff) — gated to growth+ plans
router.get(
  '/:rescueId/analytics',
  validateRescueId,
  requirePermission('admin.reports'),
  requirePlanFeature('analytics'),
  rescueController.getRescueAnalytics
);

// Adoption policies (rescue admin/staff can update, public can read)
router.put(
  '/:rescueId/adoption-policies',
  validateRescueId,
  validateAdoptionPolicy,
  requirePermission('rescues.update'),
  rescueController.updateAdoptionPolicies
);

// Admin-only routes
router.post(
  '/:rescueId/verify',
  validateRescueId,
  validateVerification,
  requirePermission('rescues.verify'),
  rescueController.verifyRescue
);

router.post(
  '/:rescueId/reject',
  validateRescueId,
  validateRejection,
  requirePermission('rescues.verify'),
  rescueController.rejectRescue
);

router.delete(
  '/:rescueId',
  sensitiveWriteLimiter,
  validateRescueId,
  validateDeletion,
  requirePermission('rescues.delete'),
  rescueController.deleteRescue
);

// Send email to rescue organization (admin only)
router.post(
  '/:rescueId/send-email',
  validateRescueId,
  validateSendEmail,
  requirePermission('rescues.update'),
  rescueController.sendEmail
);

// Bulk update rescues (admin only)
router.post(
  '/bulk-update',
  sensitiveWriteLimiter,
  authenticateToken,
  validateBulkUpdate,
  requirePermission('rescues.verify'),
  rescueController.bulkUpdateRescues
);

// Application Questions management
// GET requires only authentication — any user filling in an application needs to read questions
router.get(
  '/:rescueId/questions',
  validateRescueId,
  questionController.getQuestions.bind(questionController)
);

router.post(
  '/:rescueId/questions',
  validateRescueId,
  QuestionController.validateCreateQuestion,
  requirePermission('rescues.update'),
  requirePlanFeature('custom_questions'),
  questionController.createQuestion.bind(questionController)
);

router.put(
  '/:rescueId/questions/:questionId',
  validateRescueId,
  QuestionController.validateQuestionId,
  QuestionController.validateUpdateQuestion,
  requirePermission('rescues.update'),
  requirePlanFeature('custom_questions'),
  questionController.updateQuestion.bind(questionController)
);

router.delete(
  '/:rescueId/questions/:questionId',
  validateRescueId,
  QuestionController.validateQuestionId,
  requirePermission('rescues.update'),
  requirePlanFeature('custom_questions'),
  questionController.deleteQuestion.bind(questionController)
);

router.patch(
  '/:rescueId/questions/reorder',
  validateRescueId,
  QuestionController.validateReorderQuestions,
  requirePermission('rescues.update'),
  requirePlanFeature('custom_questions'),
  questionController.reorderQuestions.bind(questionController)
);

export default router;
