import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiService } from '@adopt-dont-shop/lib.api';
import {
  useTickets,
  useTicketDetail,
  useTicketStats,
  useMyTickets,
  useTicketMutations,
} from './hooks';
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

const pagination = { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTickets', () => {
  it('loads tickets on mount and exposes the parsed response', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [baseTicket], pagination });

    const { result } = renderHook(() => useTickets());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination).toEqual(pagination);
  });

  it('captures errors when fetching fails', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(new Error('boom'));
    expect(result.current.data).toBeNull();
  });

  it('refetches on demand', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [], pagination });

    const { result } = renderHook(() => useTickets({ status: 'open' } as never));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});

describe('useTicketDetail', () => {
  it('fetches a ticket by id', async () => {
    mockApi.get.mockResolvedValue({ data: baseTicket });

    const { result } = renderHook(() => useTicketDetail('ticket_1700000000_abc'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.ticketId).toBe('ticket_1700000000_abc');
  });

  it('does not fetch when the id is empty', async () => {
    const { result } = renderHook(() => useTicketDetail(''));

    // No request is made; loading stays true since fetch short-circuits.
    await waitFor(() => expect(mockApi.get).not.toHaveBeenCalled());
    expect(result.current.data).toBeNull();
  });

  it('records errors', async () => {
    mockApi.get.mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useTicketDetail('missing'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(new Error('not found'));
  });
});

describe('useTicketStats', () => {
  const stats = {
    total: 1,
    open: 1,
    inProgress: 0,
    waitingForUser: 0,
    resolved: 0,
    closed: 0,
    escalated: 0,
    overdue: 0,
    unassigned: 0,
    averageResponseTime: 0,
    averageResolutionTime: 0,
    satisfactionAverage: null,
    ticketsToday: 0,
    ticketsThisWeek: 0,
    ticketsThisMonth: 1,
    byPriority: { low: 0, normal: 1, high: 0, urgent: 0, critical: 0 },
    byCategory: [],
  };

  it('loads stats on mount', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useTicketStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.total).toBe(1);
  });

  it('records errors when stats fail', async () => {
    mockApi.get.mockRejectedValue(new Error('stats down'));

    const { result } = renderHook(() => useTicketStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(new Error('stats down'));
  });
});

describe('useMyTickets', () => {
  it('loads the current user tickets', async () => {
    mockApi.get.mockResolvedValue({ data: [baseTicket] });

    const { result } = renderHook(() => useMyTickets('open'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/support/my-tickets?status=open');
  });

  it('records errors', async () => {
    mockApi.get.mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useMyTickets());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(new Error('nope'));
  });
});

describe('useTicketMutations', () => {
  it('createTicket returns the created ticket and toggles loading', async () => {
    mockApi.post.mockResolvedValue({ data: baseTicket });

    const { result } = renderHook(() => useTicketMutations());

    let created: SupportTicket | undefined;
    await act(async () => {
      created = await result.current.createTicket({
        userEmail: 'user@example.com',
        category: 'general_question',
        priority: 'normal',
        subject: 'Help me please',
        description: 'I need some assistance with my account access.',
      });
    });

    expect(created?.ticketId).toBe('ticket_1700000000_abc');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('createTicket rethrows and stores the error on failure', async () => {
    mockApi.post.mockRejectedValue(new Error('create failed'));

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await expect(
        result.current.createTicket({
          userEmail: 'user@example.com',
          category: 'general_question',
          priority: 'normal',
          subject: 'Help me please',
          description: 'I need some assistance with my account access.',
        })
      ).rejects.toThrow('create failed');
    });

    expect(result.current.error).toEqual(new Error('create failed'));
  });

  it('updateTicket delegates to the service', async () => {
    mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'in_progress' } });

    const { result } = renderHook(() => useTicketMutations());

    let updated: SupportTicket | undefined;
    await act(async () => {
      updated = await result.current.updateTicket('ticket_1700000000_abc', {
        status: 'in_progress',
      });
    });

    expect(updated?.status).toBe('in_progress');
  });

  it('assignTicket delegates to the service', async () => {
    mockApi.post.mockResolvedValue({ data: { ...baseTicket, assignedTo: 'staff-1' } });

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await result.current.assignTicket('ticket_1700000000_abc', { assignedTo: 'staff-1' });
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc/assign',
      { assignedTo: 'staff-1' }
    );
  });

  it('addResponse delegates to the service', async () => {
    mockApi.post.mockResolvedValue({ data: baseTicket });

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await result.current.addResponse('ticket_1700000000_abc', {
        content: 'hi',
        isInternal: false,
      });
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc/reply',
      { content: 'hi', isInternal: false }
    );
  });

  it('escalateTicket delegates to the service', async () => {
    mockApi.post.mockResolvedValue({ data: { ...baseTicket, status: 'escalated' } });

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await result.current.escalateTicket('ticket_1700000000_abc', {
        escalatedTo: 'manager-1',
        reason: 'Needs senior attention urgently please',
      });
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc/escalate',
      expect.objectContaining({ escalatedTo: 'manager-1' })
    );
  });

  it('closeTicket, resolveTicket and reopenTicket patch the status', async () => {
    mockApi.patch.mockResolvedValue({ data: { ...baseTicket, status: 'closed' } });

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await result.current.closeTicket('ticket_1700000000_abc', 'done');
      await result.current.resolveTicket('ticket_1700000000_abc');
      await result.current.reopenTicket('ticket_1700000000_abc');
    });

    expect(mockApi.patch).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc',
      { status: 'closed', internalNotes: 'done' }
    );
    expect(mockApi.patch).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc',
      { status: 'resolved', internalNotes: undefined }
    );
    expect(mockApi.patch).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc',
      { status: 'open', internalNotes: undefined }
    );
  });

  it('setPriority and rateTicket patch the ticket', async () => {
    mockApi.patch.mockResolvedValue({ data: { ...baseTicket, priority: 'urgent' } });

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await result.current.setPriority('ticket_1700000000_abc', 'urgent');
      await result.current.rateTicket('ticket_1700000000_abc', { rating: 5 });
    });

    expect(mockApi.patch).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc',
      { priority: 'urgent' }
    );
    expect(mockApi.patch).toHaveBeenCalledWith(
      '/api/v1/admin/support/tickets/ticket_1700000000_abc',
      { status: 'closed', internalNotes: 'Satisfaction rating: 5/5' }
    );
  });

  it('rethrows errors from helper mutations', async () => {
    mockApi.patch.mockRejectedValue(new Error('patch failed'));

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await expect(result.current.closeTicket('ticket_1700000000_abc')).rejects.toThrow(
        'patch failed'
      );
    });
    expect(result.current.error).toEqual(new Error('patch failed'));
  });

  it('rethrows errors from setPriority and rateTicket', async () => {
    mockApi.patch.mockRejectedValue(new Error('priority failed'));

    const { result } = renderHook(() => useTicketMutations());

    await act(async () => {
      await expect(result.current.setPriority('ticket_1700000000_abc', 'high')).rejects.toThrow(
        'priority failed'
      );
      await expect(
        result.current.rateTicket('ticket_1700000000_abc', { rating: 3 })
      ).rejects.toThrow('priority failed');
    });
    expect(result.current.error).toEqual(new Error('priority failed'));
  });
});
