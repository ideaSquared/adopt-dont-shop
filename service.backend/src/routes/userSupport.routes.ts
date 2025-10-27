import express from 'express';
import { UserSupportController } from '../controllers/userSupport.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types/rbac';
import { generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// Apply authentication to all routes (any authenticated user)
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/support/tickets:
 *   post:
 *     tags: [User Support]
 *     summary: Create a support ticket for yourself
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *               - category
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Ticket subject
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               category:
 *                 type: string
 *                 enum: [technical_issue, account_problem, adoption_inquiry, payment_issue, feature_request, report_bug, general_question, compliance_concern, data_request, other]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent, critical]
 *                 default: normal
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/tickets',
  requirePermission(PERMISSIONS.SUPPORT_TICKET_MANAGE_OWN),
  generalLimiter,
  UserSupportController.createMyTicket
);

/**
 * @swagger
 * /api/v1/support/my-tickets:
 *   get:
 *     tags: [User Support]
 *     summary: Get all your support tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my-tickets',
  requirePermission(PERMISSIONS.SUPPORT_TICKET_MANAGE_OWN),
  generalLimiter,
  UserSupportController.getMyTickets
);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}:
 *   get:
 *     tags: [User Support]
 *     summary: Get a specific ticket (must be yours)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *       403:
 *         description: Not your ticket
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/tickets/:ticketId',
  requirePermission(PERMISSIONS.SUPPORT_TICKET_MANAGE_OWN),
  generalLimiter,
  UserSupportController.getMyTicket
);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/reply:
 *   post:
 *     tags: [User Support]
 *     summary: Reply to your ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Reply content
 *     responses:
 *       200:
 *         description: Reply added successfully
 *       403:
 *         description: Not your ticket
 *       404:
 *         description: Ticket not found
 */
router.post(
  '/tickets/:ticketId/reply',
  requirePermission(PERMISSIONS.SUPPORT_TICKET_MANAGE_OWN),
  generalLimiter,
  UserSupportController.replyToMyTicket
);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/messages:
 *   get:
 *     tags: [User Support]
 *     summary: Get all messages for your ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       403:
 *         description: Not your ticket
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/tickets/:ticketId/messages',
  requirePermission(PERMISSIONS.SUPPORT_TICKET_MANAGE_OWN),
  generalLimiter,
  UserSupportController.getMyTicketMessages
);

export default router;
