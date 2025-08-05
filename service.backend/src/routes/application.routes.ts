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

/**
 * @swagger
 * /api/v1/applications/{applicationId}:
 *   put:
 *     tags: [Application Management]
 *     summary: Update adoption application
 *     description: Update application details. Only allowed for applications in DRAFT or SUBMITTED status by the owner.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: object
 *                 description: Updated application form answers
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes or comments
 *     responses:
 *       200:
 *         description: Application updated successfully
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
 *                   example: "Application updated successfully"
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Update application (owner only for draft/submitted)
router.put(
  '/:applicationId',
  ApplicationController.validateUpdateApplication,
  applicationController.updateApplication
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/submit:
 *   post:
 *     tags: [Application Management]
 *     summary: Submit application for review
 *     description: Submit a draft application for review by rescue staff. Only the application owner can submit their own application.
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
 *         description: Application submitted successfully
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
 *                   example: "Application submitted for review"
 *                 status:
 *                   type: string
 *                   example: "SUBMITTED"
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Application cannot be submitted (not in DRAFT status)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Submit application for review (owner only)
router.post(
  '/:applicationId/submit',
  ApplicationController.validateApplicationId,
  applicationController.submitApplication
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/status:
 *   patch:
 *     tags: [Application Management]
 *     summary: Update application status
 *     description: Update the status of an application. Only rescue staff and admins can update application status.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNDER_REVIEW, APPROVED, REJECTED]
 *                 description: New application status
 *               reviewNotes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes from the reviewer
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection (required if status is REJECTED)
 *     responses:
 *       200:
 *         description: Application status updated successfully
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
 *                   example: "Application status updated"
 *                 status:
 *                   type: string
 *                   example: "APPROVED"
 *                 reviewedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Update application status (rescue staff/admin only)
router.patch(
  '/:applicationId/status',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateUpdateApplicationStatus,
  applicationController.updateApplicationStatus
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/withdraw:
 *   post:
 *     tags: [Application Management]
 *     summary: Withdraw application
 *     description: Withdraw a submitted application. Only the application owner can withdraw their own application.
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for withdrawing the application
 *     responses:
 *       200:
 *         description: Application withdrawn successfully
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
 *                   example: "Application withdrawn successfully"
 *                 status:
 *                   type: string
 *                   example: "WITHDRAWN"
 *       400:
 *         description: Application cannot be withdrawn (invalid status)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Withdraw application (owner only)
router.post(
  '/:applicationId/withdraw',
  ApplicationController.validateApplicationId,
  applicationController.withdrawApplication
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}:
 *   delete:
 *     tags: [Application Management]
 *     summary: Delete application
 *     description: Permanently delete an application. Only the application owner can delete their own application, and only if it's in DRAFT status.
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
 *         description: Application deleted successfully
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
 *                   example: "Application deleted successfully"
 *       400:
 *         description: Application cannot be deleted (not in DRAFT status)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Delete application (owner only)
router.delete(
  '/:applicationId',
  ApplicationController.validateApplicationId,
  applicationController.deleteApplication
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/documents:
 *   post:
 *     tags: [Application Management]
 *     summary: Add document to application
 *     description: Upload and attach a document to an application. Only the application owner can add documents.
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file (PDF, DOC, DOCX, JPG, PNG)
 *               documentType:
 *                 type: string
 *                 enum: [REFERENCE, VETERINARY_RECORD, PROOF_OF_RESIDENCE, OTHER]
 *                 description: Type of document being uploaded
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional description of the document
 *     responses:
 *       201:
 *         description: Document uploaded successfully
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
 *                   example: "Document uploaded successfully"
 *                 document:
 *                   type: object
 *                   properties:
 *                     documentId:
 *                       type: string
 *                       format: uuid
 *                     fileName:
 *                       type: string
 *                     fileType:
 *                       type: string
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       413:
 *         description: File too large
 */
// Add document to application (owner only)
router.post(
  '/:applicationId/documents',
  ApplicationController.validateDocumentUpload,
  applicationController.addDocument
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/references:
 *   patch:
 *     tags: [Application Management]
 *     summary: Update reference status
 *     description: Update the status of references for an application. Only rescue staff and admins can update reference status.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referenceId
 *               - status
 *             properties:
 *               referenceId:
 *                 type: string
 *                 format: uuid
 *                 description: Reference ID to update
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONTACTED, COMPLETED, FAILED]
 *                 description: New reference status
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes about the reference check
 *               contactedAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the reference was contacted
 *     responses:
 *       200:
 *         description: Reference status updated successfully
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
 *                   example: "Reference status updated"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Update reference status (rescue staff/admin only)
router.patch(
  '/:applicationId/references',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateReferenceUpdate,
  applicationController.updateReference
);

// Get application form structure for a rescue

/**
 * @swagger
 * /api/v1/applications/form-structure/{rescueId}:
 *   get:
 *     tags: [Application Management]
 *     summary: Get application form structure
 *     description: Get the custom application form structure for a specific rescue organization
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
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
 *         description: Form structure retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 formStructure:
 *                   type: object
 *                   properties:
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sectionId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           fields:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 fieldId:
 *                                   type: string
 *                                 type:
 *                                   type: string
 *                                   enum: [text, textarea, select, checkbox, radio, file]
 *                                 label:
 *                                   type: string
 *                                 required:
 *                                   type: boolean
 *                                 options:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/form-structure/{rescueId}:
 *   get:
 *     tags: [Applications]
 *     summary: GET /api/v1/form-structure/{rescueId}
 *     description: Handle GET request for /api/v1/form-structure/{rescueId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/form-structure/{rescueId} successful
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
router.get('/form-structure/:rescueId', applicationController.getApplicationFormStructure);

// Validate application answers

/**
 * @swagger
 * /api/v1/applications/validate/{rescueId}:
 *   post:
 *     tags: [Application Management]
 *     summary: Validate application answers
 *     description: Validate application form answers against rescue-specific requirements before submission
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: rescueId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Rescue organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: object
 *                 description: Application form answers to validate
 *                 additionalProperties: true
 *               petId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional pet ID for pet-specific validation
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 valid:
 *                   type: boolean
 *                   description: Whether all answers are valid
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                   description: Validation errors (if any)
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                   description: Validation warnings (if any)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/validate/{rescueId}:
 *   post:
 *     tags: [Applications]
 *     summary: POST /api/v1/validate/{rescueId}
 *     description: Handle POST request for /api/v1/validate/{rescueId}
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
 *         description: POST /api/v1/validate/{rescueId} successful
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
 *                   example: "POST /api/v1/validate/{rescueId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/validate/:rescueId', applicationController.validateApplicationAnswers);

// Get application statistics (rescue staff/admin only)

/**
 * @swagger
 * /api/v1/applications/statistics:
 *   get:
 *     tags: [Application Management]
 *     summary: Get application statistics
 *     description: Get statistical data about applications for dashboard and reporting. Only rescue staff and admins can access this data.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: rescueId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter statistics by rescue organization
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics period
 *     responses:
 *       200:
 *         description: Application statistics retrieved successfully
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
 *                     totalApplications:
 *                       type: integer
 *                       description: Total number of applications
 *                     applicationsByStatus:
 *                       type: object
 *                       properties:
 *                         DRAFT:
 *                           type: integer
 *                         SUBMITTED:
 *                           type: integer
 *                         UNDER_REVIEW:
 *                           type: integer
 *                         APPROVED:
 *                           type: integer
 *                         REJECTED:
 *                           type: integer
 *                         WITHDRAWN:
 *                           type: integer
 *                     averageProcessingTime:
 *                       type: number
 *                       description: Average time to process applications (in days)
 *                     approvalRate:
 *                       type: number
 *                       description: Percentage of applications approved
 *                     trendsOverTime:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/statistics',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  applicationController.getApplicationStatistics
);

// Bulk update applications (admin only)

/**
 * @swagger
 * /api/v1/applications/bulk-update:
 *   patch:
 *     tags: [Application Management]
 *     summary: Bulk update applications
 *     description: Update multiple applications at once. Only admins can perform bulk updates.
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
 *               - applicationIds
 *               - updates
 *             properties:
 *               applicationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: List of application IDs to update
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN]
 *                     description: New status for all selected applications
 *                   reviewNotes:
 *                     type: string
 *                     maxLength: 1000
 *                     description: Notes to add to all applications
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for bulk update
 *     responses:
 *       200:
 *         description: Applications updated successfully
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
 *                   example: "Bulk update completed"
 *                 updated:
 *                   type: integer
 *                   description: Number of applications updated
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       applicationId:
 *                         type: string
 *                         format: uuid
 *                       error:
 *                         type: string
 *                   description: Applications that failed to update
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.patch(
  '/bulk-update',
  requireRole(UserType.ADMIN),
  ApplicationController.validateBulkUpdate,
  applicationController.bulkUpdateApplications
);

// Legacy routes for backwards compatibility

/**
 * @swagger
 * /api/v1/applications/{applicationId}/history:
 *   get:
 *     tags: [Application Management]
 *     summary: Get application history
 *     description: Get the history of changes and status updates for an application. Legacy endpoint for backwards compatibility.
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
 *         description: Application history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       eventId:
 *                         type: string
 *                         format: uuid
 *                       eventType:
 *                         type: string
 *                         enum: [CREATED, UPDATED, SUBMITTED, STATUS_CHANGED, DOCUMENT_ADDED, WITHDRAWN]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       details:
 *                         type: object
 *                         description: Event-specific details
 *                       notes:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /api/v1/applications/{applicationId}/schedule-visit:
 *   post:
 *     tags: [Application Management]
 *     summary: Schedule home visit
 *     description: Schedule a home visit for an approved application. Only rescue staff and admins can schedule visits.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledDate
 *               - scheduledTime
 *             properties:
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *                 description: Date for the home visit
 *               scheduledTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Time for the home visit (HH:MM format)
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Additional notes for the visit
 *               visitType:
 *                 type: string
 *                 enum: [PRE_ADOPTION, POST_ADOPTION, FOLLOW_UP]
 *                 default: PRE_ADOPTION
 *                 description: Type of visit being scheduled
 *     responses:
 *       200:
 *         description: Visit scheduled successfully
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
 *                   example: "Home visit scheduled successfully"
 *                 visit:
 *                   type: object
 *                   properties:
 *                     visitId:
 *                       type: string
 *                       format: uuid
 *                     scheduledDateTime:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       example: "SCHEDULED"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:applicationId/schedule-visit',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.scheduleVisit
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/home-visits:
 *   get:
 *     tags: [Application Management]
 *     summary: Get home visits for application
 *     description: Retrieve all home visits for a specific application
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Home visits retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 visits:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get(
  '/:applicationId/home-visits',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.getHomeVisits
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/home-visits:
 *   post:
 *     tags: [Application Management]
 *     summary: Schedule a home visit
 *     description: Schedule a new home visit for an application
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduled_date
 *               - scheduled_time
 *               - assigned_staff
 *             properties:
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *               scheduled_time:
 *                 type: string
 *               assigned_staff:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Visit scheduled successfully
 */
router.post(
  '/:applicationId/home-visits',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.scheduleHomeVisit
);

/**
 * @swagger
 * /api/v1/applications/{applicationId}/home-visits/{visitId}:
 *   put:
 *     tags: [Application Management]
 *     summary: Update a home visit
 *     description: Update an existing home visit
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema:
 *           type: string
 *         description: Visit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Visit updated successfully
 */
router.put(
  '/:applicationId/home-visits/:visitId',
  requireRole(UserType.RESCUE_STAFF, UserType.ADMIN),
  ApplicationController.validateApplicationId,
  applicationController.updateHomeVisit
);

export default router;
