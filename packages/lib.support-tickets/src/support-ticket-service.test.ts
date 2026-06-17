import { apiService } from '@adopt-dont-shop/lib.api';
import { SupportTicketService } from './support-ticket-service';
import type { SupportTicket } from './schemas';

vi.mock('@adopt-dont-shop/lib.api');

const mockApi = apiService as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const baseTicket = {
  ticketId: 'ticket_1700000000_abc',
  userEmail: 'user@example.com',
  status: 'open',
  priority: 'normal',
  category: 'general_question',
  subject: 'Help me please',
  description: 'I need some assistance with my account access.',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const expectTicket = (ticket: SupportTicket) => {
  expect(ticket.ticketId).toBe('ticket_1700000000_abc');
  expect(ticket.status).toBe('open');
  // Schema defaults applied
  expect(ticket.tags).toEqual([]);
  expect(ticket.responses).toEqual([]);
  expect(ticket.attachments).toEqual([]);
  expect(ticket.metadata).toEqual({});
};

describe('SupportTicketService', () => {
  let service: SupportTicketService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupportTicketService();
  });

  describe('getTickets', () => {
    const pagination = { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 };

    it('requests the tickets endpoint and parses the response into data + pagination', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [baseTicket], pagination });

      const result = await service.getTickets();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/support/tickets');
      expect(result.pagination).toEqual(pagination);
      expect(result.data).toHaveLength(1);
      expectTicket(result.data[0]);
    });

    it('appends a query string built from provided filters', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [], pagination });

      await service.getTickets({
        status: 'open',
        priority: 'high',
        page: 2,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url.startsWith('/api/v1/admin/support/tickets?')).toBe(true);
      expect(url).toContain('status=open');
      expect(url).toContain('priority=high');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=50');
    });

    it('handles an empty ticket list', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [], pagination });

      const result = await service.getTickets();

      expect(result.data).toEqual([]);
    });

    it('propagates API failures', async () => {
      mockApi.get.mockRejectedValue(new Error('network down'));

      await expect(service.getTickets()).rejects.toThrow('network down');
    });

    it('rejects when the response shape is invalid', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [{ nope: true }], pagination });

      await expect(service.getTickets()).rejects.toThrow();
    });
  });

  describe('getTicketById', () => {
    it('requests a single ticket and parses it', async () => {
      mockApi.get.mockResolvedValue({ data: baseTicket });

      const ticket = await service.getTicketById('ticket_1700000000_abc');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc'
      );
      expectTicket(ticket);
    });

    it('rejects when ticket data is missing required fields', async () => {
      mockApi.get.mockResolvedValue({ data: { ticketId: 'x' } });

      await expect(service.getTicketById('x')).rejects.toThrow();
    });
  });

  describe('getTicketStats', () => {
    const stats = {
      total: 10,
      open: 4,
      inProgress: 1,
      waitingForUser: 0,
      resolved: 3,
      closed: 2,
      escalated: 0,
      overdue: 1,
      unassigned: 2,
      averageResponseTime: 12.5,
      averageResolutionTime: 30,
      satisfactionAverage: null,
      ticketsToday: 1,
      ticketsThisWeek: 5,
      ticketsThisMonth: 10,
      byPriority: { low: 1, normal: 5, high: 2, urgent: 1, critical: 1 },
      byCategory: [{ category: 'general_question', count: 3 }],
    };

    it('requests the stats endpoint and parses the payload', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: stats });

      const result = await service.getTicketStats();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/support/stats');
      expect(result.total).toBe(10);
      expect(result.byPriority.critical).toBe(1);
      expect(result.byCategory[0].category).toBe('general_question');
    });

    it('rejects when stats payload is malformed', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: { total: 'lots' } });

      await expect(service.getTicketStats()).rejects.toThrow();
    });
  });

  describe('getMyTickets', () => {
    it('requests my-tickets without a query string by default', async () => {
      mockApi.get.mockResolvedValue({ data: [baseTicket] });

      const tickets = await service.getMyTickets();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/support/my-tickets');
      expect(tickets).toHaveLength(1);
      expectTicket(tickets[0]);
    });

    it('adds a status query when provided', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await service.getMyTickets('open');

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/support/my-tickets?status=open');
    });

    it('returns an empty array when there are no tickets', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      expect(await service.getMyTickets()).toEqual([]);
    });
  });

  describe('createTicket', () => {
    it('posts the new ticket payload and parses the result', async () => {
      mockApi.post.mockResolvedValue({ data: baseTicket });

      const ticket = await service.createTicket({
        userEmail: 'user@example.com',
        category: 'general_question',
        priority: 'normal',
        subject: 'Help me please',
        description: 'I need some assistance with my account access.',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets',
        expect.objectContaining({ userEmail: 'user@example.com' })
      );
      expectTicket(ticket);
    });

    it('propagates API errors on create', async () => {
      mockApi.post.mockRejectedValue(new Error('server error'));

      await expect(
        service.createTicket({
          userEmail: 'user@example.com',
          category: 'general_question',
          priority: 'normal',
          subject: 'Help me please',
          description: 'I need some assistance with my account access.',
        })
      ).rejects.toThrow('server error');
    });
  });

  describe('updateTicket', () => {
    it('patches the ticket and parses the result', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'in_progress' } });

      const ticket = await service.updateTicket('ticket_1700000000_abc', {
        status: 'in_progress',
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'in_progress' }
      );
      expect(ticket.status).toBe('in_progress');
    });
  });

  describe('assignTicket', () => {
    it('posts to the assign endpoint', async () => {
      mockApi.post.mockResolvedValue({ data: { ...baseTicket, assignedTo: 'staff-1' } });

      const ticket = await service.assignTicket('ticket_1700000000_abc', {
        assignedTo: 'staff-1',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc/assign',
        { assignedTo: 'staff-1' }
      );
      expect(ticket.assignedTo).toBe('staff-1');
    });
  });

  describe('addResponse', () => {
    it('posts a reply to the ticket', async () => {
      mockApi.post.mockResolvedValue({ data: baseTicket });

      await service.addResponse('ticket_1700000000_abc', {
        content: 'Thanks for reaching out',
        isInternal: false,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc/reply',
        { content: 'Thanks for reaching out', isInternal: false }
      );
    });
  });

  describe('escalateTicket', () => {
    it('posts to the escalate endpoint', async () => {
      mockApi.post.mockResolvedValue({ data: { ...baseTicket, status: 'escalated' } });

      const ticket = await service.escalateTicket('ticket_1700000000_abc', {
        escalatedTo: 'manager-1',
        reason: 'Customer is very unhappy and needs senior help',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc/escalate',
        expect.objectContaining({ escalatedTo: 'manager-1' })
      );
      expect(ticket.status).toBe('escalated');
    });
  });

  describe('getTicketMessages', () => {
    it('requests the messages endpoint and parses the ticket', async () => {
      mockApi.get.mockResolvedValue({ data: baseTicket });

      await service.getTicketMessages('ticket_1700000000_abc');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc/messages'
      );
    });
  });

  describe('status helper methods', () => {
    it('closeTicket patches status to closed with notes', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'closed' } });

      await service.closeTicket('ticket_1700000000_abc', 'all done');

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'closed', internalNotes: 'all done' }
      );
    });

    it('resolveTicket patches status to resolved', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'resolved' } });

      await service.resolveTicket('ticket_1700000000_abc');

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'resolved', internalNotes: undefined }
      );
    });

    it('reopenTicket patches status to open', async () => {
      mockApi.patch.mockResolvedValue({ data: baseTicket });

      await service.reopenTicket('ticket_1700000000_abc', 'reopening');

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'open', internalNotes: 'reopening' }
      );
    });

    it('setPriority patches the priority field', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, priority: 'urgent' } });

      const ticket = await service.setPriority('ticket_1700000000_abc', 'urgent');

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { priority: 'urgent' }
      );
      expect(ticket.priority).toBe('urgent');
    });

    it('rateTicket records the rating and feedback in internal notes', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'closed' } });

      await service.rateTicket('ticket_1700000000_abc', { rating: 4, feedback: 'good' });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'closed', internalNotes: 'Satisfaction rating: 4/5 - good' }
      );
    });

    it('rateTicket omits feedback text when no feedback is provided', async () => {
      mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'closed' } });

      await service.rateTicket('ticket_1700000000_abc', { rating: 5 });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/support/tickets/ticket_1700000000_abc',
        { status: 'closed', internalNotes: 'Satisfaction rating: 5/5' }
      );
    });
  });
});
