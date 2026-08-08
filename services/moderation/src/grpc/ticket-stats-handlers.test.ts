import { describe, expect, it, vi } from 'vitest';

import { ModerationV1, type GetSupportTicketStatsRequest } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { getSupportTicketStats } from './ticket-stats-handlers.js';

function makePrincipal(permissions: string[] = ['moderation.tickets.manage']) {
  return {
    userId: 'staff-1',
    roles: ['admin'],
    permissions,
    rescueId: undefined,
  } as unknown as Parameters<typeof getSupportTicketStats>[1];
}

// deps.pool.query is called three times (aggregate, categories, staff);
// queue the rows each returns in order.
function makeDeps(rows: Array<Array<Record<string, unknown>>>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn();
  for (const r of rows) {
    query.mockResolvedValueOnce({ rows: r });
  }
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

const AGG_ROW = {
  total: '20',
  open: '4',
  in_progress: '3',
  waiting_for_user: '2',
  resolved: '6',
  closed: '4',
  escalated: '1',
  overdue: '2',
  unassigned: '5',
  today: '1',
  this_week: '7',
  this_month: '15',
  avg_response_hours: '3.256',
  avg_resolution_hours: '28.5',
  prio_low: '2',
  prio_normal: '10',
  prio_high: '5',
  prio_urgent: '2',
  prio_critical: '1',
};

const EMPTY_REQ = {} as GetSupportTicketStatsRequest;

describe('getSupportTicketStats', () => {
  it('aggregates ticket rows into the stats response', async () => {
    const { deps } = makeDeps([
      [AGG_ROW],
      [
        { category: 'general_question', count: '9' },
        { category: 'technical_issue', count: '6' },
      ],
      [{ staff_id: 'staff-1', assigned_count: '8', resolved_count: '5' }],
    ]);

    const res = await getSupportTicketStats(deps, makePrincipal(), EMPTY_REQ);

    expect(res.total).toBe(20);
    expect(res.open).toBe(4);
    expect(res.inProgress).toBe(3);
    expect(res.waitingForUser).toBe(2);
    expect(res.resolved).toBe(6);
    expect(res.closed).toBe(4);
    expect(res.escalated).toBe(1);
    expect(res.overdue).toBe(2);
    expect(res.unassigned).toBe(5);
    // Rounded to two decimals.
    expect(res.averageResponseTime).toBe(3.26);
    expect(res.averageResolutionTime).toBe(28.5);
    expect(res.ticketsToday).toBe(1);
    expect(res.ticketsThisWeek).toBe(7);
    expect(res.ticketsThisMonth).toBe(15);
    expect(res.byPriority).toEqual({ low: 2, normal: 10, high: 5, urgent: 2, critical: 1 });
    expect(res.byCategory).toEqual([
      {
        category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION,
        count: 9,
      },
      {
        category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
        count: 6,
      },
    ]);
    expect(res.staffActivity).toEqual([{ staffId: 'staff-1', assignedCount: 8, resolvedCount: 5 }]);
  });

  it('leaves satisfactionAverage unset (no survey data collected)', async () => {
    const { deps } = makeDeps([[AGG_ROW], [], []]);
    const res = await getSupportTicketStats(deps, makePrincipal(), EMPTY_REQ);
    expect(res.satisfactionAverage).toBeUndefined();
  });

  it('treats null average times as 0 and empty breakdowns as []', async () => {
    const { deps } = makeDeps([
      [{ ...AGG_ROW, avg_response_hours: null, avg_resolution_hours: null }],
      [],
      [],
    ]);

    const res = await getSupportTicketStats(deps, makePrincipal(), EMPTY_REQ);

    expect(res.averageResponseTime).toBe(0);
    expect(res.averageResolutionTime).toBe(0);
    expect(res.byCategory).toEqual([]);
    expect(res.staffActivity).toEqual([]);
  });

  it('computes overdue via the 48h SLA rule in SQL', async () => {
    const { deps, query } = makeDeps([[AGG_ROW], [], []]);
    await getSupportTicketStats(deps, makePrincipal(), EMPTY_REQ);
    const aggSql = query.mock.calls[0][0] as string;
    expect(aggSql).toContain("interval '48 hours'");
    expect(aggSql).toContain("status IN ('open', 'in_progress')");
  });

  it('rejects a principal without the tickets-manage permission', async () => {
    const { deps, query } = makeDeps([]);

    await expect(getSupportTicketStats(deps, makePrincipal([]), EMPTY_REQ)).rejects.toBeInstanceOf(
      HandlerError
    );
    expect(query).not.toHaveBeenCalled();
  });
});
