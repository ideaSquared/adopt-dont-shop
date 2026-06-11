import { apiService } from '@adopt-dont-shop/lib.api';
import {
  TicketsResponseSchema,
  SupportTicketSchema,
  TicketStatsSchema,
  type SupportTicket,
  type TicketFilters,
  type CreateTicketRequest,
  type UpdateTicketRequest,
  type AssignTicketRequest,
  type AddResponseRequest,
  type EscalateTicketRequest,
  type RateTicketRequest,
  type TicketsResponse,
  type TicketStats,
} from './schemas';
import { buildQueryString } from './utils';

/**
 * Support Ticket Service - API client for support ticket endpoints
 */
export class SupportTicketService {
  private readonly baseUrl = '/api/v1/admin/support';

  /**
   * Get list of support tickets with optional filtering
   */
  async getTickets(filters?: TicketFilters): Promise<TicketsResponse> {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    const response = await apiService.get<{
      success: boolean;
      data: unknown[];
      pagination: unknown;
    }>(`${this.baseUrl}/tickets${queryString}`);
    return TicketsResponseSchema.parse({ data: response.data, pagination: response.pagination });
  }

  /**
   * Get a single ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket> {
    const response = await apiService.get<{ data: unknown }>(`${this.baseUrl}/tickets/${ticketId}`);
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Get support ticket statistics
   */
  async getTicketStats(): Promise<TicketStats> {
    const response = await apiService.get<{ success: boolean; data: unknown }>(
      `${this.baseUrl}/stats`
    );
    return TicketStatsSchema.parse(response.data);
  }

  /**
   * Get tickets assigned to current user
   */
  async getMyTickets(status?: string): Promise<SupportTicket[]> {
    const queryString = status ? `?status=${status}` : '';
    const response = await apiService.get<{ data: unknown[] }>(
      `${this.baseUrl}/my-tickets${queryString}`
    );
    return response.data.map((ticket: unknown) => SupportTicketSchema.parse(ticket));
  }

  /**
   * Create a new support ticket
   */
  async createTicket(data: CreateTicketRequest): Promise<SupportTicket> {
    const response = await apiService.post<{ data: unknown }>(`${this.baseUrl}/tickets`, data);
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Update an existing ticket
   */
  async updateTicket(ticketId: string, data: UpdateTicketRequest): Promise<SupportTicket> {
    const response = await apiService.patch<{ data: unknown }>(
      `${this.baseUrl}/tickets/${ticketId}`,
      data
    );
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Assign ticket to a staff member
   */
  async assignTicket(ticketId: string, data: AssignTicketRequest): Promise<SupportTicket> {
    const response = await apiService.post<{ data: unknown }>(
      `${this.baseUrl}/tickets/${ticketId}/assign`,
      data
    );
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Add a response to a ticket
   */
  async addResponse(ticketId: string, data: AddResponseRequest): Promise<SupportTicket> {
    const response = await apiService.post<{ data: unknown }>(
      `${this.baseUrl}/tickets/${ticketId}/reply`,
      data
    );
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Escalate a ticket
   */
  async escalateTicket(ticketId: string, data: EscalateTicketRequest): Promise<SupportTicket> {
    const response = await apiService.post<{ data: unknown }>(
      `${this.baseUrl}/tickets/${ticketId}/escalate`,
      data
    );
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Get all messages/responses for a ticket
   */
  async getTicketMessages(ticketId: string): Promise<SupportTicket> {
    const response = await apiService.get<{ data: unknown }>(
      `${this.baseUrl}/tickets/${ticketId}/messages`
    );
    return SupportTicketSchema.parse(response.data);
  }

  /**
   * Close a ticket (helper method)
   */
  async closeTicket(ticketId: string, notes?: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: 'closed',
      internalNotes: notes,
    });
  }

  /**
   * Resolve a ticket (helper method)
   */
  async resolveTicket(ticketId: string, notes?: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: 'resolved',
      internalNotes: notes,
    });
  }

  /**
   * Reopen a ticket (helper method)
   */
  async reopenTicket(ticketId: string, notes?: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: 'open',
      internalNotes: notes,
    });
  }

  /**
   * Set ticket priority (helper method)
   */
  async setPriority(
    ticketId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical'
  ): Promise<SupportTicket> {
    return this.updateTicket(ticketId, { priority });
  }

  /**
   * Rate a ticket (helper method for satisfaction surveys)
   */
  async rateTicket(ticketId: string, data: RateTicketRequest): Promise<SupportTicket> {
    // Note: This might need a specific endpoint on the backend
    // For now, we'll use the update endpoint
    return this.updateTicket(ticketId, {
      status: 'closed',
      internalNotes: `Satisfaction rating: ${data.rating}/5${data.feedback ? ` - ${data.feedback}` : ''}`,
    });
  }
}

// Export singleton instance
export const supportTicketService = new SupportTicketService();
