import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { countAdoptedAdopters } from './attribution-handlers.js';

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
    roles: overrides.roles ?? ['rescue_staff'],
    permissions: overrides.permissions ?? ['applications.read'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof countAdoptedAdopters>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

const baseReq = {
  adopterIds: ['usr-adopter-1', 'usr-adopter-2'],
  createdAfter: '2026-07-01T10:00:00.000Z',
  createdBefore: '2026-09-29T10:00:00.000Z',
};

describe('countAdoptedAdopters', () => {
  it('throws PERMISSION_DENIED without applications.read', async () => {
    const { deps } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal({ permissions: [] }), baseReq)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when created_after is missing', async () => {
    const { deps } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal(), { ...baseReq, createdAfter: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT when created_before is missing', async () => {
    const { deps } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal(), { ...baseReq, createdBefore: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns zero without querying when adopter_ids is empty', async () => {
    const { deps, query } = makeDeps();
    const res = await countAdoptedAdopters(deps, makePrincipal(), { ...baseReq, adopterIds: [] });
    expect(res).toEqual({ count: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it('dedupes adopter_ids before querying', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    await countAdoptedAdopters(deps, makePrincipal(), {
      ...baseReq,
      adopterIds: ['usr-1', 'usr-1', 'usr-2'],
    });

    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toEqual(['usr-1', 'usr-2']);
  });

  it('scopes to APPROVED/ADOPTED status, the candidate ids, and the created_at window', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '2' }] });

    await countAdoptedAdopters(deps, makePrincipal(), baseReq);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("status IN ('approved', 'adopted')");
    expect(sql).toContain('user_id = ANY($1)');
    expect(sql).toContain('created_at >= $2');
    expect(sql).toContain('created_at <= $3');
    expect(sql).toContain('COUNT(DISTINCT user_id)');
    expect(params).toEqual([baseReq.adopterIds, baseReq.createdAfter, baseReq.createdBefore]);
  });

  it('returns the distinct count from the query', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await countAdoptedAdopters(deps, makePrincipal(), baseReq);

    expect(res).toEqual({ count: 3 });
  });

  it('returns zero when no adopters in the candidate set have qualifying applications', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await countAdoptedAdopters(deps, makePrincipal(), baseReq);

    expect(res).toEqual({ count: 0 });
  });

  it('allows super_admin regardless of rescueId', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await expect(
      countAdoptedAdopters(
        deps,
        makePrincipal({ roles: ['super_admin'], permissions: [] }),
        baseReq
      )
    ).resolves.toEqual({ count: 0 });
  });
});
