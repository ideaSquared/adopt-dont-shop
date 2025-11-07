import { Request, Response } from 'express';
import SupportTicketService from '../services/supportTicket.service';
import { TicketStatus, TicketPriority, TicketCategory } from '../models/SupportTicket';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';

// Helper function to serialize ticket data for API response
const serializeTicket = (ticket: any) => {
  const ticketData = ticket.toJSON ? ticket.toJSON() : ticket;

  // Map Sequelize alias 'Responses' to lowercase 'responses' for frontend compatibility
  if (ticketData.Responses) {
    ticketData.responses = ticketData.Responses;
    delete ticketData.Responses;
  }

  return ticketData;
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

      const filters: any = {};
      if (status) {
        filters.status = typeof status === 'string' ? status.split(',') : status;
      }
      if (priority) {
        filters.priority = typeof priority === 'string' ? priority.split(',') : priority;
      }
      if (category) {
        filters.category = typeof category === 'string' ? category.split(',') : category;
      }
      if (assignedTo) filters.assignedTo = assignedTo;
      if (userId) filters.userId = userId;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const pagination: any = {};
      if (page) pagination.page = parseInt(page as string, 10);
      if (limit) pagination.limit = parseInt(limit as string, 10);
      if (sortBy) pagination.sortBy = sortBy;
      if (sortOrder) pagination.sortOrder = (sortOrder as string).toUpperCase();

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
    } catch (error: any) {
      logger.error('Error in getTicketById:', error);
      if (error.message === 'Ticket not found') {
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
    } catch (error: any) {
      logger.error('Error in updateTicket:', error);
      if (error.message === 'Ticket not found') {
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
    } catch (error: any) {
      logger.error('Error in assignTicket:', error);
      if (error.message === 'Ticket not found') {
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
    } catch (error: any) {
      logger.error('Error in addResponse:', error);
      if (error.message === 'Ticket not found') {
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
    } catch (error: any) {
      logger.error('Error in escalateTicket:', error);
      if (error.message === 'Ticket not found') {
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
          messages: ticket.responses || [],
        },
      });
    } catch (error: any) {
      logger.error('Error in getTicketMessages:', error);
      if (error.message === 'Ticket not found') {
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
