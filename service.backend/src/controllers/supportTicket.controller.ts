import { Request, Response } from 'express';
import SupportTicketService from '../services/supportTicket.service';
import { TicketStatus, TicketPriority, TicketCategory } from '../models/SupportTicket';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';
import SupportTicket from '../models/SupportTicket';

// Type for serialized ticket data
type SerializedTicket = {
  ticketId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  assignedTo?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  subject: string;
  description: string;
  tags?: string[];
  attachments?: unknown[];
  metadata?: unknown;
  firstResponseAt?: string;
  lastResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  escalationReason?: string;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  internalNotes?: string;
  dueDate?: string;
  estimatedResolutionTime?: number;
  actualResolutionTime?: number;
  createdAt: string;
  updatedAt: string;
  responses?: unknown[];
  Responses?: unknown[];
};

// Helper function to serialize ticket data for API response
const serializeTicket = (ticket: SupportTicket): SerializedTicket => {
  const ticketData = ticket.toJSON ? ticket.toJSON() : ticket;

  // Type conversion needed: Sequelize model instances and raw attributes have different types
  // This is safe because we're extracting known fields from the model
  const result: SerializedTicket = {
    ...(ticketData as unknown as SerializedTicket),
    // Convert Date objects to ISO strings
    createdAt:
      ticketData.createdAt instanceof Date
        ? ticketData.createdAt.toISOString()
        : ticketData.createdAt,
    updatedAt:
      ticketData.updatedAt instanceof Date
        ? ticketData.updatedAt.toISOString()
        : ticketData.updatedAt,
    firstResponseAt:
      ticketData.firstResponseAt instanceof Date
        ? ticketData.firstResponseAt.toISOString()
        : ticketData.firstResponseAt,
    lastResponseAt:
      ticketData.lastResponseAt instanceof Date
        ? ticketData.lastResponseAt.toISOString()
        : ticketData.lastResponseAt,
    resolvedAt:
      ticketData.resolvedAt instanceof Date
        ? ticketData.resolvedAt.toISOString()
        : ticketData.resolvedAt,
    closedAt:
      ticketData.closedAt instanceof Date ? ticketData.closedAt.toISOString() : ticketData.closedAt,
    escalatedAt:
      ticketData.escalatedAt instanceof Date
        ? ticketData.escalatedAt.toISOString()
        : ticketData.escalatedAt,
    dueDate:
      ticketData.dueDate instanceof Date ? ticketData.dueDate.toISOString() : ticketData.dueDate,
  };

  // Map Sequelize alias 'Responses' to lowercase 'responses' for frontend compatibility
  if ('Responses' in ticketData && ticketData.Responses !== undefined) {
    result.responses = ticketData.Responses;
    delete result.Responses;
  }

  return result;
};

// Type for pagination options
type PaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export class SupportTicketController {
  /**
   * GET /api/v1/admin/support/tickets
   * Get all support tickets with filtering and pagination
   */
  static async getTickets(req: Request, res: Response) {
    try {
      const {
        status,
        priority,
        category,
        assignedTo,
        userId,
        search,
        dateFrom,
        dateTo,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      // Build filters with proper type casting
      const filters: {
        status?: TicketStatus | TicketStatus[];
        priority?: TicketPriority | TicketPriority[];
        category?: TicketCategory | TicketCategory[];
        assignedTo?: string;
        userId?: string;
        search?: string;
        dateFrom?: Date;
        dateTo?: Date;
      } = {};

      if (status) {
        const statusArray = typeof status === 'string' ? status.split(',') : (status as string[]);
        filters.status =
          statusArray.length === 1
            ? (statusArray[0] as TicketStatus)
            : (statusArray as TicketStatus[]);
      }
      if (priority) {
        const priorityArray =
          typeof priority === 'string' ? priority.split(',') : (priority as string[]);
        filters.priority =
          priorityArray.length === 1
            ? (priorityArray[0] as TicketPriority)
            : (priorityArray as TicketPriority[]);
      }
      if (category) {
        const categoryArray =
          typeof category === 'string' ? category.split(',') : (category as string[]);
        filters.category =
          categoryArray.length === 1
            ? (categoryArray[0] as TicketCategory)
            : (categoryArray as TicketCategory[]);
      }
      if (assignedTo) filters.assignedTo = assignedTo as string;
      if (userId) filters.userId = userId as string;
      if (search) filters.search = search as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const pagination: PaginationOptions = {};
      if (page) pagination.page = parseInt(page as string, 10);
      if (limit) pagination.limit = parseInt(limit as string, 10);
      if (sortBy) pagination.sortBy = sortBy as string;
      // Validate and cast sortOrder to ensure it's "ASC" | "DESC"
      if (sortOrder) {
        const upperOrder = (sortOrder as string).toUpperCase();
        pagination.sortOrder = upperOrder === 'ASC' || upperOrder === 'DESC' ? upperOrder : 'DESC';
      }

      const result = await SupportTicketService.getTickets(filters, pagination);

      res.json({
        success: true,
        data: result.tickets.map(serializeTicket),
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getTickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch support tickets',
      });
    }
  }

  /**
   * GET /api/v1/admin/support/tickets/:ticketId
   * Get a single support ticket by ID
   */
  static async getTicketById(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;

      const ticket = await SupportTicketService.getTicketById(ticketId);

      res.json({
        success: true,
        data: serializeTicket(ticket),
      });
    } catch (error: unknown) {
      logger.error('Error in getTicketById:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch support ticket',
        });
      }
    }
  }

  /**
   * POST /api/v1/admin/support/tickets
   * Create a new support ticket
   */
  static async createTicket(req: Request, res: Response) {
    try {
      const {
        userId,
        userEmail,
        userName,
        subject,
        description,
        category,
        priority,
        tags,
        metadata,
      } = req.body;

      // Validation
      if (!userEmail || !subject || !description || !category) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userEmail, subject, description, category',
        });
      }

      const ticket = await SupportTicketService.createTicket({
        userId,
        userEmail,
        userName,
        subject,
        description,
        category,
        priority,
        tags,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: serializeTicket(ticket),
      });
    } catch (error) {
      logger.error('Error in createTicket:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create support ticket',
      });
    }
  }

  /**
   * PATCH /api/v1/admin/support/tickets/:ticketId
   * Update a support ticket
   */
  static async updateTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const updates = req.body;

      const ticket = await SupportTicketService.updateTicket(ticketId, updates);

      res.json({
        success: true,
        data: serializeTicket(ticket),
      });
    } catch (error: unknown) {
      logger.error('Error in updateTicket:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update support ticket',
        });
      }
    }
  }

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/assign
   * Assign a ticket to an agent
   */
  static async assignTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { assignedTo } = req.body;

      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          error: 'assignedTo is required',
        });
      }

      const ticket = await SupportTicketService.assignTicket(ticketId, assignedTo);

      res.json({
        success: true,
        data: serializeTicket(ticket),
        message: 'Ticket assigned successfully',
      });
    } catch (error: unknown) {
      logger.error('Error in assignTicket:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to assign ticket',
        });
      }
    }
  }

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/reply
   * Add a response to a ticket
   */
  static async addResponse(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const { content, attachments, isInternal } = req.body;
      const responderId = req.user?.userId;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Response content is required',
        });
      }

      const ticket = await SupportTicketService.addResponse(ticketId, {
        responderId: responderId!,
        responderType: 'staff',
        content,
        attachments,
        isInternal: isInternal || false,
      });

      res.json({
        success: true,
        data: serializeTicket(ticket),
        message: 'Response added successfully',
      });
    } catch (error: unknown) {
      logger.error('Error in addResponse:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add response',
        });
      }
    }
  }

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/escalate
   * Escalate a ticket
   */
  static async escalateTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { escalatedTo, reason } = req.body;

      if (!escalatedTo || !reason) {
        return res.status(400).json({
          success: false,
          error: 'escalatedTo and reason are required',
        });
      }

      const ticket = await SupportTicketService.escalateTicket(ticketId, escalatedTo, reason);

      res.json({
        success: true,
        data: serializeTicket(ticket),
        message: 'Ticket escalated successfully',
      });
    } catch (error: unknown) {
      logger.error('Error in escalateTicket:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to escalate ticket',
        });
      }
    }
  }

  /**
   * GET /api/v1/admin/support/tickets/:ticketId/messages
   * Get all messages/responses for a ticket
   */
  static async getTicketMessages(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;

      const ticket = await SupportTicketService.getTicketById(ticketId);

      res.json({
        success: true,
        data: {
          ticketId: ticket.ticketId,
          messages: ticket.Responses || ticket.responses || [],
        },
      });
    } catch (error: unknown) {
      logger.error('Error in getTicketMessages:', error);
      if (error instanceof Error && error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch ticket messages',
        });
      }
    }
  }

  /**
   * GET /api/v1/admin/support/stats
   * Get support ticket statistics
   */
  static async getTicketStats(req: Request, res: Response) {
    try {
      const stats = await SupportTicketService.getTicketStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getTicketStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticket statistics',
      });
    }
  }

  /**
   * GET /api/v1/admin/support/my-tickets
   * Get tickets assigned to the current agent
   */
  static async getMyTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const agentId = req.user?.userId;
      const { status } = req.query;

      if (!agentId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const tickets = await SupportTicketService.getAgentTickets(
        agentId,
        status as TicketStatus | undefined
      );

      res.json({
        success: true,
        data: tickets.map(serializeTicket),
      });
    } catch (error) {
      logger.error('Error in getMyTickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assigned tickets',
      });
    }
  }
}
