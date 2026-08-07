import { describe, expect, it, vi } from 'vitest';

import { ModerationV1, type GetModerationMetricsRequest } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { getModerationMetrics } from './metrics-handlers.js';

function makePrincipal(permissions: string[] = ['moderation.reports.view']) {
  return {
    userId: 'mod-1',
    roles: ['admin'],
    permissions,
    rescueId: undefined,
  } as unknown as Parameters<typeof getModerationMetrics>[1];
}

// deps.pool.query is called three times (aggregate, categories, activity);
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
  total: '10',
  pending: '3',
  under_review: '1',
  resolved: '4',
  dismissed: '1',
  escalated: '1',
  critical: '2',
  today: '1',
  this_week: '5',
  this_month: '9',
  avg_resolution_hours: '12.345',
};

const EMPTY_REQ = {} as GetModerationMetricsRequest;

describe('getModerationMetrics', () => {
  it('aggregates report + activity rows into the metrics response', async () => {
    const { deps } = makeDeps([
      [AGG_ROW],
      [
        { category: 'harassment', count: '6' },
        { category: 'spam', count: '4' },
      ],
      [{ moderator_id: 'mod-1', actions_count: '7', resolved_count: '3' }],
    ]);

    const res = await getModerationMetrics(deps, makePrincipal(), EMPTY_REQ);

    expect(res.totalReports).toBe(10);
    expect(res.pendingReports).toBe(3);
    expect(res.resolvedReports).toBe(4);
    expect(res.criticalReports).toBe(2);
    // Rounded to two decimals.
    expect(res.averageResolutionTime).toBe(12.35);
    expect(res.reportsThisMonth).toBe(9);
    expect(res.topCategories).toEqual([
      { category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT, count: 6 },
      { category: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM, count: 4 },
    ]);
    expect(res.moderatorActivity).toEqual([
      { moderatorId: 'mod-1', actionsCount: 7, resolvedCount: 3 },
    ]);
  });

  it('treats a null average resolution time as 0 and empty breakdowns as []', async () => {
    const { deps } = makeDeps([
      [{ ...AGG_ROW, resolved: '0', avg_resolution_hours: null }],
      [],
      [],
    ]);

    const res = await getModerationMetrics(deps, makePrincipal(), EMPTY_REQ);

    expect(res.averageResolutionTime).toBe(0);
    expect(res.topCategories).toEqual([]);
    expect(res.moderatorActivity).toEqual([]);
  });

  it('rejects a principal without the reports-view permission', async () => {
    const { deps, query } = makeDeps([]);

    await expect(getModerationMetrics(deps, makePrincipal([]), EMPTY_REQ)).rejects.toBeInstanceOf(
      HandlerError
    );
    expect(query).not.toHaveBeenCalled();
  });
});
