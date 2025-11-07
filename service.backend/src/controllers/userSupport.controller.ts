import { Response } from 'express';
import SupportTicketService from '../services/supportTicket.service';
import { TicketCategory, TicketPriority } from '../models/SupportTicket';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/api';
import User from '../models/User';

export class UserSupportController {
  /**
   * POST /api/v1/support/tickets
   * Create a support ticket for the authenticated user
   */
  static async createMyTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { subject, description, category, priority } = req.body;

      // Validation
      if (!subject || !description || !category) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: subject, description, category',
        });
      }

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
        data: ticket,
      });
    } catch (error) {
      logger.error('Error in createMyTicket:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create support ticket',
      });
    }
  }

  /**
   * GET /api/v1/support/my-tickets
   * Get all tickets for the authenticated user
   */
  static async getMyTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { status, page, limit } = req.query;

      const filters: any = { userId };
      if (status) {
        filters.status = typeof status === 'string' ? status.split(',') : status;
      }

      const pagination: any = {};
      if (page) pagination.page = parseInt(page as string, 10);
      if (limit) pagination.limit = parseInt(limit as string, 10);

      const result = await SupportTicketService.getUserTickets(userId, filters, pagination);

      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getMyTickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch your support tickets',
      });
    }
  }

  /**
   * GET /api/v1/support/tickets/:ticketId
   * Get a specific ticket (must belong to authenticated user)
   */
  static async getMyTicket(req: AuthenticatedRequest, res: Response) {
    try {
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
        data: ticket,
      });
    } catch (error: any) {
      logger.error('Error in getMyTicket:', error);
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
   * POST /api/v1/support/tickets/:ticketId/reply
   * Add a reply to the user's own ticket
   */
  static async replyToMyTicket(req: AuthenticatedRequest, res: Response) {
    try {
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
        data: updatedTicket,
      });
    } catch (error: any) {
      logger.error('Error in replyToMyTicket:', error);
      if (error.message === 'Ticket not found') {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to add reply to ticket',
        });
      }
    }
  }

  /**
   * GET /api/v1/support/tickets/:ticketId/messages
   * Get all messages for a ticket (must own the ticket)
   */
  static async getMyTicketMessages(req: AuthenticatedRequest, res: Response) {
    try {
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
      const publicResponses = ticket.responses?.filter((r) => !r.isInternal) || [];

      res.json({
        success: true,
        data: publicResponses,
      });
    } catch (error: any) {
      logger.error('Error in getMyTicketMessages:', error);
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
}
