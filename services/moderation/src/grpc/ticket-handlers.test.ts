import { describe, expect, it, vi } from 'vitest';

import {
  ModerationV1,
  type AssignSupportTicketRequest,
  type GetSupportTicketRequest,
  type ListSupportTicketsRequest,
  type OpenSupportTicketRequest,
  type RespondToTicketRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  assignSupportTicket,
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
    permissions: overrides.permissions ?? ['moderation.tickets.manage'],
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
  it('returns NOT_FOUND when a non-admin reads someone else’s ticket (no enumeration)', async () => {
    const { deps } = makeDeps([{ rows: [ticketRow({ user_id: 'usr-other' })] }]);
    await expect(
      getSupportTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        ticketId: 'tkt-1',
      } as GetSupportTicketRequest)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('allows the ticket owner to read their own ticket without moderation.tickets.manage', async () => {
    const { deps } = makeDeps([{ rows: [ticketRow({ user_id: 'usr-1' })] }]);
    const res = await getSupportTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      ticketId: 'tkt-1',
    } as GetSupportTicketRequest);
    expect(res.ticket.ticketId).toBe('tkt-1');
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

  it('hides internal (moderator-only) responses from a non-admin ticket owner', async () => {
    // Owner reads their own ticket with no admin.dashboard permission.
    const { deps, query } = makeDeps([
      { rows: [ticketRow({ user_id: 'usr-1' })] },
      { rows: [responseRow()] },
    ]);
    await getSupportTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      ticketId: 'tkt-1',
      includeResponses: true,
    });
    // The responses query must filter out internal notes for non-admins.
    expect(query.mock.calls[1][0]).toMatch(/is_internal = false/);
  });

  it('returns internal responses to an admin reader', async () => {
    const { deps, query } = makeDeps([{ rows: [ticketRow()] }, { rows: [responseRow()] }]);
    await getSupportTicket(deps, makePrincipal(), {
      ticketId: 'tkt-1',
      includeResponses: true,
    });
    // Admins see everything — no internal filter applied.
    expect(query.mock.calls[1][0]).not.toMatch(/is_internal = false/);
  });
});

describe('listSupportTickets', () => {
  it('non-admins are self-scoped: WHERE user_id = principal.userId is forced', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listSupportTickets(
      deps,
      makePrincipal({ userId: 'usr-1', permissions: [] }),
      {} as ListSupportTicketsRequest
    );
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toMatch(/user_id = \$1/);
    expect(query.mock.calls[0][1][0]).toBe('usr-1');
  });

  it('rejects a non-admin trying to filter by another user_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listSupportTickets(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        userId: 'usr-other',
      } as ListSupportTicketsRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
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
    // INSERT params: [responseId, ticketId, responderId, responderType,
    // content, isInternal] — is_internal is index 5 (0-based).
    expect(query.mock.calls[1][1][5]).toBe(true);
  });

  it('non-admin owner can reply; responder_type is forced to "user"', async () => {
    const { deps, query } = makeDeps([
      { rows: [{ ticket_id: 'tkt-1', user_id: 'usr-1' }] },
      { rows: [responseRow({ responder_type: 'user' })] },
      { rows: [] },
    ]);
    await respondToTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      ticketId: 'tkt-1',
      content: 'Reply from owner',
    });
    // responder_type at INSERT param index 3.
    expect(query.mock.calls[1][1][3]).toBe('user');
  });

  it('non-admin trying to post an internal note → PERMISSION_DENIED', async () => {
    const { deps } = makeDeps([]);
    await expect(
      respondToTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        ticketId: 'tkt-1',
        content: 'sneaky',
        isInternal: true,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('non-admin replying to someone else’s ticket → NOT_FOUND', async () => {
    const { deps } = makeDeps([{ rows: [{ ticket_id: 'tkt-1', user_id: 'usr-other' }] }]);
    await expect(
      respondToTicket(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        ticketId: 'tkt-1',
        content: 'not mine',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('assignSupportTicket', () => {
  const VALID_ASSIGN: AssignSupportTicketRequest = { ticketId: 'tkt-1', assignedTo: 'staff-2' };

  it('requires moderation.tickets.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      assignSupportTicket(deps, makePrincipal({ permissions: [] }), VALID_ASSIGN)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws INVALID_ARGUMENT when assignedTo is missing', async () => {
    const { deps } = makeDeps([]);
    await expect(
      assignSupportTicket(deps, makePrincipal(), { ticketId: 'tkt-1', assignedTo: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND on a missing ticket', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(assignSupportTicket(deps, makePrincipal(), VALID_ASSIGN)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('sets the assignee and returns the updated ticket', async () => {
    const { deps, query } = makeDeps([
      { rows: [{ ticket_id: 'tkt-1' }] },
      { rows: [ticketRow({ assigned_to: 'staff-2', status: 'in_progress' })] },
    ]);
    const res = await assignSupportTicket(deps, makePrincipal(), VALID_ASSIGN);
    expect(res.ticket?.assignedTo).toBe('staff-2');
    // UPDATE call carries the new assignee + ticket id.
    expect(query.mock.calls[1][1]).toEqual(['staff-2', 'tkt-1']);
  });
});
