import { Router } from 'express';
import * as emailController from '../controllers/email.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Email Template Management (Admin only)

/**
 * @swagger
 * /api/v1/email/templates:
 *   get:
 *     tags: [Email Management]
 *     summary: Get all email templates
 *     description: Retrieve all email templates for administration. Only admins can access this endpoint.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [WELCOME, APPLICATION_RECEIVED, APPLICATION_APPROVED, APPLICATION_REJECTED, REMINDER, NEWSLETTER]
 *         description: Filter templates by type
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       templateId:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [WELCOME, APPLICATION_RECEIVED, APPLICATION_APPROVED, APPLICATION_REJECTED, REMINDER, NEWSLETTER]
 *                       subject:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/templates',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplates
);
/**
 * @swagger
 * /api/v1/email/templates:
 *   post:
 *     tags: [Email Management]
 *     summary: Create new email template
 *     description: Create a new email template. Only admins can create templates.
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
 *               - name
 *               - type
 *               - subject
 *               - htmlContent
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Template name
 *               type:
 *                 type: string
 *                 enum: [WELCOME, APPLICATION_RECEIVED, APPLICATION_APPROVED, APPLICATION_REJECTED, REMINDER, NEWSLETTER]
 *                 description: Template type
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *                 description: Email subject line
 *               htmlContent:
 *                 type: string
 *                 description: HTML content with template variables
 *               textContent:
 *                 type: string
 *                 description: Plain text version
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Available template variables
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether template is active
 *     responses:
 *       201:
 *         description: Template created successfully
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
 *                   example: "Template created successfully"
 *                 templateId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/templates',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.createTemplate
);
/**
 * @swagger
 * /api/v1/email/templates/{templateId}:
 *   get:
 *     tags: [Email Management]
 *     summary: Get email template by ID
 *     description: Retrieve a specific email template by ID. Only admins can access this endpoint.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 template:
 *                   type: object
 *                   properties:
 *                     templateId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     htmlContent:
 *                       type: string
 *                     textContent:
 *                       type: string
 *                     variables:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isActive:
 *                       type: boolean
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
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplate
);
/**
 * @swagger
 * /api/v1/email/templates/{templateId}:
 *   put:
 *     tags: [Email Management]
 *     summary: Update email template
 *     description: Update an existing email template. Only admins can update templates.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *               htmlContent:
 *                 type: string
 *               textContent:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Template updated successfully
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
 *                   example: "Template updated successfully"
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
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.updateTemplate
);
/**
 * @swagger
 * /api/v1/email/templates/{templateId}:
 *   delete:
 *     tags: [Email Management]
 *     summary: Delete email template
 *     description: Delete an email template. Only admins can delete templates.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
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
 *                   example: "Template deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.deleteTemplate
);

// Template Preview and Testing (Admin only)
/**
 * @swagger
 * /api/v1/email/templates/{templateId}/preview:
 *   post:
 *     tags: [Email Management]
 *     summary: Preview email template
 *     description: Generate a preview of an email template with sample data. Only admins can preview templates.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               variables:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Template variables for preview
 *                 example:
 *                   firstName: "John"
 *                   petName: "Buddy"
 *                   rescueName: "Golden Hearts Rescue"
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 preview:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     htmlContent:
 *                       type: string
 *                     textContent:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/templates/:templateId/preview',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.previewTemplate
);
/**
 * @swagger
 * /api/v1/email/templates/{templateId}/test:
 *   post:
 *     tags: [Email Management]
 *     summary: Send test email
 *     description: Send a test email using a template to verify it works correctly. Only admins can send test emails.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testEmail
 *             properties:
 *               testEmail:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test to
 *               variables:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Template variables for test
 *                 example:
 *                   firstName: "Test User"
 *                   petName: "Test Pet"
 *     responses:
 *       200:
 *         description: Test email sent successfully
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
 *                   example: "Test email sent successfully"
 *                 messageId:
 *                   type: string
 *                   description: Email service message ID
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
  '/templates/:templateId/test',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.sendTestEmail
);

// Email Sending (Admin and System only)
/**
 * @swagger
 * /api/v1/email/send:
 *   post:
 *     tags: [Email Management]
 *     summary: Send individual email
 *     description: Send a single email using a template or custom content. Available to admins and rescue staff.
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
 *               - to
 *               - subject
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               templateId:
 *                 type: string
 *                 format: uuid
 *                 description: Template ID to use (optional if providing custom content)
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *                 description: Email subject
 *               htmlContent:
 *                 type: string
 *                 description: HTML content (required if no templateId)
 *               textContent:
 *                 type: string
 *                 description: Plain text content
 *               variables:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Template variables
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH]
 *                 default: NORMAL
 *                 description: Email priority
 *     responses:
 *       200:
 *         description: Email sent successfully
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
 *                   example: "Email sent successfully"
 *                 messageId:
 *                   type: string
 *                 queueId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/send',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'RESCUE_STAFF']),
  emailController.sendEmail
);
/**
 * @swagger
 * /api/v1/email/send/bulk:
 *   post:
 *     tags: [Email Management]
 *     summary: Send bulk emails
 *     description: Send emails to multiple recipients using a template. Only admins can send bulk emails.
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
 *               - templateId
 *               - recipients
 *             properties:
 *               templateId:
 *                 type: string
 *                 format: uuid
 *                 description: Template ID to use
 *               recipients:
 *                 type: array
 *                 maxItems: 1000
 *                 items:
 *                   type: object
 *                   required:
 *                     - email
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     variables:
 *                       type: object
 *                       additionalProperties: true
 *                 description: List of recipients with personalized variables
 *               scheduleFor:
 *                 type: string
 *                 format: date-time
 *                 description: Optional scheduled send time
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH]
 *                 default: NORMAL
 *     responses:
 *       200:
 *         description: Bulk email queued successfully
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
 *                   example: "Bulk email queued successfully"
 *                 batchId:
 *                   type: string
 *                   format: uuid
 *                 recipientCount:
 *                   type: integer
 *                 estimatedSendTime:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/send/bulk',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.sendBulkEmail
);

// Queue Management (Admin only)
/**
 * @swagger
 * /api/v1/email/queue:
 *   get:
 *     tags: [Email Management]
 *     summary: Get email queue status
 *     description: Retrieve the current status of the email queue, including pending, processing, and failed emails. Only admins can access this endpoint.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, SENT, FAILED, RETRY]
 *         description: Filter by queue status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of queue items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of queue items to skip
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 queue:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total items in queue
 *                     pending:
 *                       type: integer
 *                       description: Items waiting to be processed
 *                     processing:
 *                       type: integer
 *                       description: Items currently being processed
 *                     sent:
 *                       type: integer
 *                       description: Successfully sent items
 *                     failed:
 *                       type: integer
 *                       description: Failed items
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           queueId:
 *                             type: string
 *                             format: uuid
 *                           status:
 *                             type: string
 *                             enum: [PENDING, PROCESSING, SENT, FAILED, RETRY]
 *                           to:
 *                             type: string
 *                             format: email
 *                           subject:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [LOW, NORMAL, HIGH]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           scheduledFor:
 *                             type: string
 *                             format: date-time
 *                           attempts:
 *                             type: integer
 *                           lastError:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/queue',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getQueueStatus
);
/**
 * @swagger
 * /api/v1/email/queue/process:
 *   post:
 *     tags: [Email Management]
 *     summary: Process email queue
 *     description: Manually trigger processing of pending emails in the queue. Only admins can trigger queue processing.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH]
 *                 description: Only process emails with this priority
 *               maxItems:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 500
 *                 default: 100
 *                 description: Maximum number of emails to process
 *     responses:
 *       200:
 *         description: Queue processing initiated
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
 *                   example: "Queue processing initiated"
 *                 processedCount:
 *                   type: integer
 *                   description: Number of emails processed
 *                 estimatedCompletion:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/queue/process',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.processQueue
);
/**
 * @swagger
 * /api/v1/email/queue/retry:
 *   post:
 *     tags: [Email Management]
 *     summary: Retry failed emails
 *     description: Retry sending failed emails in the queue. Only admins can retry failed emails.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queueIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Specific queue IDs to retry (optional - if not provided, retries all failed)
 *               maxRetries:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: Maximum retry attempts per email
 *     responses:
 *       200:
 *         description: Retry initiated for failed emails
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
 *                   example: "Retry initiated for failed emails"
 *                 retryCount:
 *                   type: integer
 *                   description: Number of emails queued for retry
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/queue/retry',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.retryFailedEmails
);

// Analytics (Admin only)
/**
 * @swagger
 * /api/v1/email/analytics:
 *   get:
 *     tags: [Email Management]
 *     summary: Get email analytics overview
 *     description: Retrieve comprehensive email analytics including delivery rates, open rates, click rates, and bounce rates. Only admins can access analytics.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period (ISO 8601 format)
 *       - in: query
 *         name: templateId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter analytics by specific template
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, template, recipient_domain]
 *           default: day
 *         description: Group analytics data by time period or category
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSent:
 *                           type: integer
 *                           description: Total emails sent
 *                         deliveryRate:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Delivery rate percentage
 *                         openRate:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Open rate percentage
 *                         clickRate:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Click-through rate percentage
 *                         bounceRate:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Bounce rate percentage
 *                         complaintRate:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Complaint rate percentage
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             description: Time period or category
 *                           sent:
 *                             type: integer
 *                           delivered:
 *                             type: integer
 *                           opened:
 *                             type: integer
 *                           clicked:
 *                             type: integer
 *                           bounced:
 *                             type: integer
 *                           complained:
 *                             type: integer
 *                     topTemplates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           templateId:
 *                             type: string
 *                             format: uuid
 *                           templateName:
 *                             type: string
 *                           sent:
 *                             type: integer
 *                           openRate:
 *                             type: number
 *                             format: float
 *                           clickRate:
 *                             type: number
 *                             format: float
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getEmailAnalytics
);
/**
 * @swagger
 * /api/v1/email/analytics/{templateId}:
 *   get:
 *     tags: [Email Management]
 *     summary: Get template-specific analytics
 *     description: Retrieve detailed analytics for a specific email template including performance metrics and recipient engagement. Only admins can access template analytics.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *       - in: query
 *         name: includeRecipients
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed recipient engagement data
 *     responses:
 *       200:
 *         description: Template analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     template:
 *                       type: object
 *                       properties:
 *                         templateId:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                     performance:
 *                       type: object
 *                       properties:
 *                         totalSent:
 *                           type: integer
 *                         deliveryRate:
 *                           type: number
 *                           format: float
 *                         openRate:
 *                           type: number
 *                           format: float
 *                         clickRate:
 *                           type: number
 *                           format: float
 *                         bounceRate:
 *                           type: number
 *                           format: float
 *                         avgTimeToOpen:
 *                           type: integer
 *                           description: Average time to open in minutes
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           sent:
 *                             type: integer
 *                           opened:
 *                             type: integer
 *                           clicked:
 *                             type: integer
 *                     recipients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                             format: email
 *                           status:
 *                             type: string
 *                             enum: [sent, delivered, opened, clicked, bounced, complained]
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                           openedAt:
 *                             type: string
 *                             format: date-time
 *                           clickedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/analytics/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplateAnalytics
);

// User Email Preferences (User can access their own, Admin can access any)

/**
 * @swagger
 * /api/v1/email/preferences/{userId}:
 *   get:
 *     tags: [Email Management]
 *     summary: Get user email preferences
 *     description: Retrieve email notification preferences for a specific user. Users can access their own preferences, admins can access any user's preferences.
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
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     emailNotifications:
 *                       type: boolean
 *                     applicationUpdates:
 *                       type: boolean
 *                     rescueUpdates:
 *                       type: boolean
 *                     newsletters:
 *                       type: boolean
 *                     marketingEmails:
 *                       type: boolean
 *                     frequency:
 *                       type: string
 *                       enum: [IMMEDIATE, DAILY, WEEKLY]
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/preferences/{userId}:
 *   get:
 *     tags: [Email Management]
 *     summary: GET /api/v1/preferences/{userId}
 *     description: Handle GET request for /api/v1/preferences/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/preferences/{userId} successful
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
router.get('/preferences/:userId', authenticateToken, emailController.getUserPreferences);

/**
 * @swagger
 * /api/v1/email/preferences/{userId}:
 *   put:
 *     tags: [Email Management]
 *     summary: Update user email preferences
 *     description: Update email notification preferences for a specific user. Users can update their own preferences, admins can update any user's preferences.
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
 *               emailNotifications:
 *                 type: boolean
 *                 description: Enable/disable all email notifications
 *               applicationUpdates:
 *                 type: boolean
 *                 description: Receive application status updates
 *               rescueUpdates:
 *                 type: boolean
 *                 description: Receive rescue organization updates
 *               newsletters:
 *                 type: boolean
 *                 description: Receive newsletters
 *               marketingEmails:
 *                 type: boolean
 *                 description: Receive marketing emails
 *               frequency:
 *                 type: string
 *                 enum: [IMMEDIATE, DAILY, WEEKLY]
 *                 description: Email frequency preference
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
 *                   example: "Email preferences updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/preferences/:userId', authenticateToken, emailController.updateUserPreferences);

// Public Unsubscribe (No authentication required)

/**
 * @swagger
 * /api/v1/email/unsubscribe/{token}:
 *   get:
 *     tags: [Email Management]
 *     summary: Unsubscribe user from emails
 *     description: Unsubscribe a user from email notifications using a secure token. This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Unsubscribe token
 *     responses:
 *       200:
 *         description: User unsubscribed successfully
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
 *                   example: "You have been successfully unsubscribed from all emails"
 *           text/html:
 *             schema:
 *               type: string
 *               description: HTML unsubscribe confirmation page
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid or expired unsubscribe token"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/unsubscribe/:token', emailController.unsubscribeUser);

// Webhooks (No authentication required - handled by provider verification)

/**
 * @swagger
 * /api/v1/email/webhook/delivery:
 *   post:
 *     tags: [Email Management]
 *     summary: Handle email delivery webhook
 *     description: Webhook endpoint for email service providers to report delivery status, bounces, and complaints. This is a public endpoint with provider-specific verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload varies by email service provider
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [delivered, bounced, complained, opened, clicked]
 *                 description: Type of email event
 *               messageId:
 *                 type: string
 *                 description: Original message identifier
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Event timestamp
 *               reason:
 *                 type: string
 *                 description: Additional details for bounces/complaints
 *     responses:
 *       200:
 *         description: Webhook processed successfully
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
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid webhook payload"
 *       401:
 *         description: Webhook verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Webhook verification failed"
 */
router.post('/webhook/delivery', emailController.handleDeliveryWebhook);

export default router;
