import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { getStats } from './stats-handlers.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    roles: string[];
    permissions: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof getStats>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

describe('getStats', () => {
  it('throws PERMISSION_DENIED without applications.read', async () => {
    const { deps } = makeDeps();
    await expect(getStats(deps, makePrincipal({ permissions: [] }), {})).rejects.toBeInstanceOf(
      HandlerError
    );
  });

  it('scopes an adopter to their own user id', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await getStats(deps, makePrincipal({ userId: 'usr-7' }), {});

    const params = query.mock.calls[0][1] as unknown[];
    expect(params).toEqual(['usr-7']);
  });

  it('pins rescue staff to their own rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await getStats(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      {}
    );

    const params = query.mock.calls[0][1] as unknown[];
    expect(params).toEqual(['rsc-9']);
  });

  it('lets super_admin narrow by rescue and adopter filter', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await getStats(deps, makePrincipal({ roles: ['super_admin'] }), {
      rescueIdFilter: 'rsc-2',
      adopterIdFilter: 'usr-3',
    });

    const params = query.mock.calls[0][1] as unknown[];
    expect(params).toEqual(['rsc-2', 'usr-3']);
  });

  it('returns zero-filled counts when no rows exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await getStats(deps, makePrincipal(), {});

    expect(res).toEqual({
      total: 0,
      draft: 0,
      submitted: 0,
      underReview: 0,
      homeVisitScheduled: 0,
      homeVisitCompleted: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      adopted: 0,
    });
  });

  it('maps grouped counts onto the per-status response and sums the total', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({
      rows: [
        { status: 'submitted', count: '4' },
        { status: 'under_review', count: '2' },
        { status: 'approved', count: '1' },
      ],
    });

    const res = await getStats(deps, makePrincipal(), {});

    expect(res.total).toBe(7);
    expect(res.submitted).toBe(4);
    expect(res.underReview).toBe(2);
    expect(res.approved).toBe(1);
    expect(res.rejected).toBe(0);
    expect(res.draft).toBe(0);
  });
});
