import { Response } from 'express';
import SupportTicketService from '../services/supportTicket.service';
import { TicketCategory, TicketPriority, TicketStatus } from '../models/SupportTicket';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';
import User from '../models/User';

// Type for pagination options
type PaginationOptions = {
  page?: number;
  limit?: number;
};

/**
 * Fields on SupportTicket that contain staff-only internal state and must
 * NEVER be returned to the reporting user (the ticket's owner). These include
 * internal triage notes, assigned-agent identity, escalation metadata and
 * service-level operational timers. Reporters can see the public conversation
 * and their own submitted data only.
 */
const REPORTER_FORBIDDEN_TICKET_FIELDS = [
  'internalNotes',
  'assignedTo',
  'AssignedAgent',
  'escalatedTo',
  'escalationReason',
  'escalatedAt',
  'metadata',
  'dueDate',
  'estimatedResolutionTime',
  'actualResolutionTime',
] as const;

type RawTicket = Record<string, unknown> & {
  toJSON?: () => Record<string, unknown>;
  Responses?: Array<Record<string, unknown> & { isInternal?: boolean }>;
  responses?: Array<Record<string, unknown> & { isInternal?: boolean }>;
};

/**
 * Strips internal-only fields from a ticket before returning to the reporter
 * and drops any internal-only response messages. Operates on a plain object
 * so callers may pass either a Sequelize instance or a plain object.
 */
const sanitizeTicketForReporter = (ticket: RawTicket): Record<string, unknown> => {
  const plain: Record<string, unknown> =
    typeof ticket.toJSON === 'function' ? ticket.toJSON() : { ...ticket };

  for (const field of REPORTER_FORBIDDEN_TICKET_FIELDS) {
    delete plain[field];
  }

  const responses =
    (plain.Responses as RawTicket['Responses']) ?? (plain.responses as RawTicket['responses']);
  if (Array.isArray(responses)) {
    const publicResponses = responses.filter(r => !r.isInternal);
    if ('Responses' in plain) {
      plain.Responses = publicResponses;
    }
    if ('responses' in plain) {
      plain.responses = publicResponses;
    }
  }

  return plain;
};

export class UserSupportController {
  /**
   * POST /api/v1/support/tickets
   * Create a support ticket for the authenticated user
   */
  static async createMyTicket(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    // Body is validated + coerced by validateBody(CreateTicketSchema) upstream.
    const { subject, description, category, priority } = req.body;

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const ticket = await SupportTicketService.createTicket({
      userId: user.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      subject,
      description,
      category,
      priority: priority || TicketPriority.NORMAL,
    });

    logger.info('User created support ticket', {
      userId,
      ticketId: ticket.ticketId,
      category,
      priority: ticket.priority,
    });

    res.status(201).json({
      success: true,
      data: sanitizeTicketForReporter(ticket as unknown as RawTicket),
    });
  }

  /**
   * GET /api/v1/support/my-tickets
   * Get all tickets for the authenticated user
   */
  static async getMyTickets(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    // Query is validated + coerced by validateQuery(MyTicketsQuerySchema):
    // `page`/`limit` are bounded numbers, `status` (if present) is a
    // comma-separated list of valid TicketStatus values.
    const status = req.query.status as string | undefined;
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    const ticketFilters: {
      userId: string;
      status?: TicketStatus | TicketStatus[];
    } = { userId };

    if (status) {
      const validStatuses = new Set<string>(Object.values(TicketStatus));
      const statusArray = status
        .split(',')
        .map(s => s.trim())
        .filter((s): s is TicketStatus => validStatuses.has(s));
      if (statusArray.length === 1) {
        ticketFilters.status = statusArray[0];
      } else if (statusArray.length > 1) {
        ticketFilters.status = statusArray;
      }
    }

    const pagination: PaginationOptions = { page, limit };

    const result = await SupportTicketService.getUserTickets(userId, ticketFilters, pagination);

    res.json({
      success: true,
      data: result.tickets.map(t => sanitizeTicketForReporter(t as unknown as RawTicket)),
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/v1/support/tickets/:ticketId
   * Get a specific ticket (must belong to authenticated user)
   */
  static async getMyTicket(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const { ticketId } = req.params;

    const ticket = await SupportTicketService.getTicketById(ticketId);

    // Verify ownership
    if (ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this ticket',
      });
    }

    res.json({
      success: true,
      data: sanitizeTicketForReporter(ticket as unknown as RawTicket),
    });
  }

  /**
   * POST /api/v1/support/tickets/:ticketId/reply
   * Add a reply to the user's own ticket
   */
  static async replyToMyTicket(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const { ticketId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Reply content is required',
      });
    }

    // Get ticket and verify ownership
    const ticket = await SupportTicketService.getTicketById(ticketId);
    if (ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to reply to this ticket',
      });
    }

    // Get user details for the response
    const user = await User.findByPk(userId);

    const updatedTicket = await SupportTicketService.addResponse(ticketId, {
      responderId: userId,
      responderType: 'user',
      content,
      isInternal: false, // User replies are always public
    });

    logger.info('User replied to support ticket', {
      userId,
      ticketId,
      responseLength: content.length,
    });

    res.json({
      success: true,
      data: sanitizeTicketForReporter(updatedTicket as unknown as RawTicket),
    });
  }

  /**
   * GET /api/v1/support/tickets/:ticketId/messages
   * Get all messages for a ticket (must own the ticket)
   */
  static async getMyTicketMessages(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const { ticketId } = req.params;

    // Get ticket and verify ownership
    const ticket = await SupportTicketService.getTicketById(ticketId);
    if (ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this ticket',
      });
    }

    // Filter out internal messages (staff notes)
    const allResponses = ticket.Responses || ticket.responses || [];
    const publicResponses = allResponses.filter(r => !r.isInternal);

    res.json({
      success: true,
      data: publicResponses,
    });
  }
}
