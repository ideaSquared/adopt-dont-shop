import { describe, expect, it, vi } from 'vitest';

import {
  ModerationV1,
  type GetSupportTicketRequest,
  type ListSupportTicketsRequest,
  type OpenSupportTicketRequest,
  type RespondToTicketRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  getSupportTicket,
  listSupportTickets,
  openSupportTicket,
  respondToTicket,
} from './ticket-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'staff-1',
    roles: overrides.roles ?? ['admin'],
    permissions: overrides.permissions ?? ['admin.dashboard'],
    rescueId: undefined,
  } as unknown as Parameters<typeof openSupportTicket>[1];
}

function makeDeps(steps: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  for (const step of steps) {
    queryMock.mockResolvedValueOnce(step);
  }
  const pool = { query: queryMock } as unknown as HandlerDeps['pool'];
  const deps: HandlerDeps = { pool, nats: {} } as unknown as HandlerDeps;
  return { deps, query: queryMock };
}

vi.mock('@adopt-dont-shop/events', async () => {
  const actual =
    await vi.importActual<typeof import('@adopt-dont-shop/events')>('@adopt-dont-shop/events');
  return {
    ...actual,
    withTransaction: async (
      deps: { pool: { query: ReturnType<typeof vi.fn> } },
      fn: (scope: {
        client: { query: ReturnType<typeof vi.fn> };
        publish: ReturnType<typeof vi.fn>;
      }) => Promise<unknown>
    ) => {
      const publish = vi.fn();
      const client = { query: deps.pool.query };
      const result = await fn({ client, publish });
      (deps as { _publish?: ReturnType<typeof vi.fn> })._publish = publish;
      return result;
    },
  };
});

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    ticket_id: 'tkt-1',
    user_id: 'usr-1',
    user_email: 'user@example.com',
    user_name: 'Test User',
    assigned_to: null,
    status: 'open',
    priority: 'normal',
    category: 'general_question',
    subject: 'Cannot log in',
    description: 'Locked out.',
    tags: ['login'],
    metadata: {},
    first_response_at: null,
    last_response_at: null,
    resolved_at: null,
    closed_at: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

function responseRow(overrides: Record<string, unknown> = {}) {
  return {
    response_id: 'rsp-1',
    ticket_id: 'tkt-1',
    responder_id: 'staff-1',
    responder_type: 'staff',
    content: 'Try clearing cookies.',
    is_internal: false,
    created_at: new Date('2026-06-01T13:00:00.000Z'),
    ...overrides,
  };
}

const VALID_OPEN: OpenSupportTicketRequest = {
  userEmail: 'user@example.com',
  subject: 'Cannot log in',
  description: 'Locked out.',
  priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
  category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION,
  tags: ['login'],
};

describe('openSupportTicket', () => {
  it('does NOT require admin (any authenticated user can open a ticket)', async () => {
    const { deps } = makeDeps([{ rows: [ticketRow()] }]);
    const res = await openSupportTicket(deps, makePrincipal({ permissions: [] }), VALID_OPEN);
    expect(res.ticket.ticketId).toBe('tkt-1');
  });

  it.each([
    ['userEmail', { ...VALID_OPEN, userEmail: '' }],
    ['subject', { ...VALID_OPEN, subject: '' }],
    ['description', { ...VALID_OPEN, description: '' }],
    [
      'priority',
      {
        ...VALID_OPEN,
        priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
      },
    ],
    [
      'category',
      {
        ...VALID_OPEN,
        category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED,
      },
    ],
  ])('throws INVALID_ARGUMENT on missing %s', async (_field, req) => {
    const { deps } = makeDeps([]);
    await expect(
      openSupportTicket(deps, makePrincipal(), req as OpenSupportTicketRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('falls back to principal.userId when request user_id is absent', async () => {
    const { deps, query } = makeDeps([{ rows: [ticketRow()] }]);
    await openSupportTicket(deps, makePrincipal({ userId: 'usr-9' }), VALID_OPEN);
    // user_id param at index 1 (0-based).
    expect(query.mock.calls[0][1][1]).toBe('usr-9');
  });

  it('publishes moderation.ticketOpened', async () => {
    const { deps } = makeDeps([{ rows: [ticketRow()] }]);
    await openSupportTicket(deps, makePrincipal(), VALID_OPEN);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.ticketOpened' });
  });
});

describe('getSupportTicket', () => {
  it('throws PERMISSION_DENIED without admin.dashboard', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getSupportTicket(deps, makePrincipal({ permissions: [] }), {
        ticketId: 'tkt-1',
      } as GetSupportTicketRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws NOT_FOUND on a missing ticket', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      getSupportTicket(deps, makePrincipal(), { ticketId: 'gone' } as GetSupportTicketRequest)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the ticket without responses by default', async () => {
    const { deps, query } = makeDeps([{ rows: [ticketRow()] }]);
    const res = await getSupportTicket(deps, makePrincipal(), {
      ticketId: 'tkt-1',
    } as GetSupportTicketRequest);
    expect(res.ticket.ticketId).toBe('tkt-1');
    expect(res.responses).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('hydrates the response thread when include_responses is true', async () => {
    const { deps, query } = makeDeps([{ rows: [ticketRow()] }, { rows: [responseRow()] }]);
    const res = await getSupportTicket(deps, makePrincipal(), {
      ticketId: 'tkt-1',
      includeResponses: true,
    });
    expect(res.responses).toHaveLength(1);
    expect(query).toHaveBeenCalledTimes(2);
    // The thread query excludes soft-deleted responses.
    expect(query.mock.calls[1][0]).toContain('deleted_at IS NULL');
  });
});

describe('listSupportTickets', () => {
  it('throws PERMISSION_DENIED without admin.dashboard', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listSupportTickets(deps, makePrincipal({ permissions: [] }), {} as ListSupportTicketsRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('applies status / priority / category / assigned_to / user filters', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listSupportTickets(deps, makePrincipal(), {
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_HIGH,
      category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
      assignedTo: 'staff-1',
      userId: 'usr-1',
    } as ListSupportTicketsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('status = $1');
    expect(sql).toContain('priority = $2');
    expect(sql).toContain('category = $3');
    expect(sql).toContain('assigned_to = $4');
    expect(sql).toContain('user_id = $5');
  });

  it('treats empty assignedTo as IS NULL filter', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listSupportTickets(deps, makePrincipal(), {
      assignedTo: '',
    } as ListSupportTicketsRequest);
    expect(query.mock.calls[0][0]).toContain('assigned_to IS NULL');
  });

  it('emits nextCursor when more rows than limit', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      ticketRow({ ticket_id: `t-${i}`, created_at: new Date(2026, 5, 1, 12, 0, 0, i) })
    );
    const { deps } = makeDeps([{ rows: eleven }]);
    const res = await listSupportTickets(deps, makePrincipal(), {
      limit: 10,
    } as ListSupportTicketsRequest);
    expect(res.tickets).toHaveLength(10);
    expect(res.nextCursor).toBeDefined();
  });
});

describe('respondToTicket', () => {
  it('throws INVALID_ARGUMENT on missing content', async () => {
    const { deps } = makeDeps([]);
    await expect(
      respondToTicket(deps, makePrincipal(), {
        ticketId: 'tkt-1',
        content: '',
      } as RespondToTicketRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND on a missing ticket', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      respondToTicket(deps, makePrincipal(), { ticketId: 'gone', content: 'hi' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('inserts a staff response + bumps timestamps + publishes ticketResponded', async () => {
    const { deps, query } = makeDeps([
      { rows: [{ ticket_id: 'tkt-1' }] }, // SELECT FOR UPDATE
      { rows: [responseRow()] }, // INSERT response
      { rows: [] }, // UPDATE ticket timestamps
    ]);
    const res = await respondToTicket(deps, makePrincipal(), {
      ticketId: 'tkt-1',
      content: 'Try clearing cookies.',
    });
    expect(res.response.responseId).toBe('rsp-1');
    // The UPDATE keeps first_response_at via COALESCE.
    expect(query.mock.calls[2][0]).toContain('COALESCE(first_response_at, NOW())');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.ticketResponded' });
  });

  it('marks an internal staff response', async () => {
    const { deps, query } = makeDeps([
      { rows: [{ ticket_id: 'tkt-1' }] },
      { rows: [responseRow({ is_internal: true })] },
      { rows: [] },
    ]);
    const res = await respondToTicket(deps, makePrincipal(), {
      ticketId: 'tkt-1',
      content: 'Internal note',
      isInternal: true,
    });
    expect(res.response.isInternal).toBe(true);
    // is_internal param at index 4 (0-based) on the INSERT.
    expect(query.mock.calls[1][1][4]).toBe(true);
  });
});
