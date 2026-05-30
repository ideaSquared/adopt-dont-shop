import express from 'express';
import { z } from 'zod';
import { UserSupportController } from '../controllers/userSupport.controller';
import { authenticateToken } from '../middleware/auth';
import { idempotency } from '../middleware/idempotency';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../types/rbac';
import { generalLimiter } from '../middleware/rate-limiter';
import { validateBody, validateQuery } from '../middleware/zod-validate';
import { TicketCategory, TicketPriority, TicketStatus } from '../models/SupportTicket';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';

// ADS-784: previously-unvalidated user-support inputs. Caps protect against
// oversized free-text and out-of-range pagination, and enum-validate the
// category/priority/status against the SupportTicket model enums so bad input
// is a clean 422 rather than a service-layer surprise.
const CreateTicketSchema = z.object({
  subject: z.string().trim().min(1, 'subject is required').max(200),
  description: z.string().trim().min(1, 'description is required').max(5000),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority).optional(),
});

const ReplyTicketSchema = z.object({
  content: z.string().trim().min(1, 'content is required').max(5000),
});

const VALID_TICKET_STATUSES = new Set<string>(Object.values(TicketStatus));

const MyTicketsQuerySchema = z.object({
  // Comma-separated list of statuses; each must be a valid TicketStatus.
  status: z
    .string()
    .optional()
    .refine(
      value =>
        value === undefined || value.split(',').every(s => VALID_TICKET_STATUSES.has(s.trim())),
      { message: 'status must be a comma-separated list of valid ticket statuses' }
    ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

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
  idempotency,
  validateBody(CreateTicketSchema),
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
  validateQuery(MyTicketsQuerySchema),
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
  idempotency,
  validateBody(ReplyTicketSchema),
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
