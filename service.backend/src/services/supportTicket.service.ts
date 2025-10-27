import SupportTicket, { TicketStatus, TicketPriority, TicketCategory } from '../models/SupportTicket';
import User from '../models/User';
import { Op } from 'sequelize';
import { logger } from '../utils/logger';

interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory | TicketCategory[];
  assignedTo?: string;
  userId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class SupportTicketService {
  /**
   * Get all support tickets with filtering and pagination
   */
  async getTickets(filters: TicketFilters = {}, pagination: PaginationOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = pagination;

      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (filters.status) {
        where.status = Array.isArray(filters.status) ? { [Op.in]: filters.status } : filters.status;
      }

      if (filters.priority) {
        where.priority = Array.isArray(filters.priority)
          ? { [Op.in]: filters.priority }
          : filters.priority;
      }

      if (filters.category) {
        where.category = Array.isArray(filters.category)
          ? { [Op.in]: filters.category }
          : filters.category;
      }

      if (filters.assignedTo) {
        where.assignedTo = filters.assignedTo;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.search) {
        where[Op.or] = [
          { subject: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } },
          { userEmail: { [Op.iLike]: `%${filters.search}%` } },
          { userName: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt[Op.gte] = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt[Op.lte] = filters.dateTo;
        }
      }

      const { rows: tickets, count } = await SupportTicket.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
            required: false,
          },
          {
            model: User,
            as: 'AssignedAgent',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
      });

      return {
        tickets,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      logger.error('Error fetching support tickets:', error);
      throw error;
    }
  }

  /**
   * Get a single support ticket by ID
   */
  async getTicketById(ticketId: string) {
    try {
      const ticket = await SupportTicket.findByPk(ticketId, {
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber'],
          },
          {
            model: User,
            as: 'AssignedAgent',
            attributes: ['userId', 'firstName', 'lastName', 'email'],
          },
        ],
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return ticket;
    } catch (error) {
      logger.error(`Error fetching ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: {
    userId?: string;
    userEmail: string;
    userName?: string;
    subject: string;
    description: string;
    category: TicketCategory;
    priority?: TicketPriority;
    tags?: string[];
    metadata?: any;
  }) {
    try {
      const ticket = await SupportTicket.create({
        ...ticketData,
        status: TicketStatus.OPEN,
        priority: ticketData.priority || TicketPriority.NORMAL,
        responses: [],
        attachments: [],
        metadata: ticketData.metadata || {},
        tags: ticketData.tags || [],
      } as any);

      logger.info(`Support ticket created: ${ticket.ticketId}`);

      return ticket;
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      throw error;
    }
  }

  /**
   * Update a support ticket
   */
  async updateTicket(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      assignedTo?: string;
      tags?: string[];
      internalNotes?: string;
      dueDate?: Date;
    }
  ) {
    try {
      const ticket = await this.getTicketById(ticketId);

      // Handle status transitions
      if (updates.status) {
        if (updates.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED) {
          ticket.resolvedAt = new Date();
        }
        if (updates.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED) {
          ticket.closedAt = new Date();
        }
        if (updates.status === TicketStatus.ESCALATED && ticket.status !== TicketStatus.ESCALATED) {
          ticket.escalatedAt = new Date();
        }
      }

      await ticket.update(updates);

      logger.info(`Support ticket updated: ${ticketId}`);

      return ticket;
    } catch (error) {
      logger.error(`Error updating ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Assign a ticket to an agent
   */
  async assignTicket(ticketId: string, assignedTo: string) {
    try {
      const ticket = await this.getTicketById(ticketId);

      await ticket.update({ assignedTo });

      logger.info(`Ticket ${ticketId} assigned to ${assignedTo}`);

      return ticket;
    } catch (error) {
      logger.error(`Error assigning ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Add a response to a ticket
   */
  async addResponse(
    ticketId: string,
    response: {
      responderId: string;
      responderType: 'staff' | 'user';
      content: string;
      attachments?: Array<{
        filename: string;
        url: string;
        fileSize: number;
        mimeType: string;
      }>;
      isInternal?: boolean;
    }
  ) {
    try {
      const ticket = await this.getTicketById(ticketId);

      ticket.addResponse({
        responderId: response.responderId,
        responderType: response.responderType,
        content: response.content,
        attachments: response.attachments || [],
        isInternal: response.isInternal || false,
      });

      await ticket.save();

      logger.info(`Response added to ticket ${ticketId}`);

      return ticket;
    } catch (error) {
      logger.error(`Error adding response to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Escalate a ticket
   */
  async escalateTicket(ticketId: string, escalatedTo: string, reason: string) {
    try {
      const ticket = await this.getTicketById(ticketId);

      await ticket.update({
        status: TicketStatus.ESCALATED,
        escalatedTo,
        escalatedAt: new Date(),
        escalationReason: reason,
      });

      logger.info(`Ticket ${ticketId} escalated to ${escalatedTo}`);

      return ticket;
    } catch (error) {
      logger.error(`Error escalating ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats() {
    try {
      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        urgentTickets,
        overdueTickets,
      ] = await Promise.all([
        SupportTicket.count(),
        SupportTicket.count({ where: { status: TicketStatus.OPEN } }),
        SupportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
        SupportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
        SupportTicket.count({ where: { priority: TicketPriority.URGENT } }),
        SupportTicket.count({
          where: {
            dueDate: { [Op.lt]: new Date() },
            status: { [Op.in]: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          },
        }),
      ]);

      // Calculate average resolution time
      const resolvedWithTime = await SupportTicket.findAll({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { [Op.not]: null } as any,
        },
        attributes: ['createdAt', 'resolvedAt'],
        limit: 100, // Last 100 resolved tickets
      });

      let averageResolutionTime = 0;
      if (resolvedWithTime.length > 0) {
        const totalTime = resolvedWithTime.reduce((sum, ticket) => {
          const created = new Date(ticket.createdAt).getTime();
          const resolved = new Date(ticket.resolvedAt!).getTime();
          return sum + (resolved - created);
        }, 0);
        averageResolutionTime = Math.floor(totalTime / resolvedWithTime.length / (1000 * 60 * 60)); // Hours
      }

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        urgentTickets,
        overdueTickets,
        averageResolutionTime, // in hours
      };
    } catch (error) {
      logger.error('Error fetching ticket statistics:', error);
      throw error;
    }
  }

  /**
   * Get tickets assigned to a specific agent
   */
  async getAgentTickets(agentId: string, status?: TicketStatus) {
    try {
      const where: any = { assignedTo: agentId };
      if (status) {
        where.status = status;
      }

      const tickets = await SupportTicket.findAll({
        where,
        order: [['priority', 'DESC'], ['createdAt', 'ASC']],
      });

      return tickets;
    } catch (error) {
      logger.error(`Error fetching tickets for agent ${agentId}:`, error);
      throw error;
    }
  }


  /**
   * Get all tickets for a specific user
   */
  async getUserTickets(userId: string, filters: TicketFilters = {}, pagination: PaginationOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = pagination;

      const offset = (page - 1) * limit;

      // Build where clause - always filter by userId
      const where: any = { userId };

      if (filters.status) {
        where.status = Array.isArray(filters.status) ? { [Op.in]: filters.status } : filters.status;
      }

      if (filters.priority) {
        where.priority = Array.isArray(filters.priority)
          ? { [Op.in]: filters.priority }
          : filters.priority;
      }

      if (filters.category) {
        where.category = Array.isArray(filters.category)
          ? { [Op.in]: filters.category }
          : filters.category;
      }

      const { rows: tickets, count } = await SupportTicket.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
      });

      return {
        tickets,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching tickets for user ${userId}:`, error);
      throw error;
    }
  }
}

export default new SupportTicketService();
