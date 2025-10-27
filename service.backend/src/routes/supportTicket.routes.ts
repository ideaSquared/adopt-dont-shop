import express from 'express';
import { SupportTicketController } from '../controllers/supportTicket.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'STAFF', 'MODERATOR']));

/**
 * @swagger
 * /api/v1/admin/support/tickets:
 *   get:
 *     tags: [Support Tickets]
 *     summary: Get all support tickets with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated for multiple)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority (comma-separated for multiple)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (comma-separated for multiple)
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned agent ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in subject, description, customer name/email
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
 *         description: Support tickets retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/tickets', generalLimiter, SupportTicketController.getTickets);

/**
 * @swagger
 * /api/v1/admin/support/stats:
 *   get:
 *     tags: [Support Tickets]
 *     summary: Get support ticket statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', generalLimiter, SupportTicketController.getTicketStats);

/**
 * @swagger
 * /api/v1/admin/support/my-tickets:
 *   get:
 *     tags: [Support Tickets]
 *     summary: Get tickets assigned to current agent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Assigned tickets retrieved successfully
 */
router.get('/my-tickets', generalLimiter, SupportTicketController.getMyTickets);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}:
 *   get:
 *     tags: [Support Tickets]
 *     summary: Get a single support ticket by ID
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
 *       404:
 *         description: Ticket not found
 */
router.get('/tickets/:ticketId', generalLimiter, SupportTicketController.getTicketById);

/**
 * @swagger
 * /api/v1/admin/support/tickets:
 *   post:
 *     tags: [Support Tickets]
 *     summary: Create a new support ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerEmail
 *               - subject
 *               - description
 *               - category
 *             properties:
 *               customerId:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerName:
 *                 type: string
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post('/tickets', generalLimiter, SupportTicketController.createTicket);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}:
 *   patch:
 *     tags: [Support Tickets]
 *     summary: Update a support ticket
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
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       404:
 *         description: Ticket not found
 */
router.patch('/tickets/:ticketId', generalLimiter, SupportTicketController.updateTicket);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}/assign:
 *   post:
 *     tags: [Support Tickets]
 *     summary: Assign a ticket to an agent
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
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.post('/tickets/:ticketId/assign', generalLimiter, SupportTicketController.assignTicket);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}/reply:
 *   post:
 *     tags: [Support Tickets]
 *     summary: Add a response to a ticket
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
 *               isInternal:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Response added successfully
 */
router.post('/tickets/:ticketId/reply', generalLimiter, SupportTicketController.addResponse);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}/escalate:
 *   post:
 *     tags: [Support Tickets]
 *     summary: Escalate a ticket
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
 *               - escalatedTo
 *               - reason
 *             properties:
 *               escalatedTo:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket escalated successfully
 */
router.post('/tickets/:ticketId/escalate', generalLimiter, SupportTicketController.escalateTicket);

/**
 * @swagger
 * /api/v1/admin/support/tickets/{ticketId}/messages:
 *   get:
 *     tags: [Support Tickets]
 *     summary: Get all messages for a ticket
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
 */
router.get(
  '/tickets/:ticketId/messages',
  generalLimiter,
  SupportTicketController.getTicketMessages
);

export default router;
