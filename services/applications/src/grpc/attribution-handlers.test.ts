import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { countAdoptedAdopters, MIN_COHORT_SIZE } from './attribution-handlers.js';

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
    roles: overrides.roles ?? ['admin'],
    // ANALYTICS_VIEW — the admin-only reporting gate this handler now requires.
    permissions: overrides.permissions ?? ['admin.reports'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof countAdoptedAdopters>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

// A cohort at or above the k-anonymity floor, so the happy path is exercised.
const cohortIds = Array.from({ length: MIN_COHORT_SIZE }, (_, i) => `usr-adopter-${i}`);

const baseReq = {
  adopterIds: cohortIds,
  createdAfter: '2026-07-01T10:00:00.000Z',
  createdBefore: '2026-09-29T10:00:00.000Z',
};

describe('countAdoptedAdopters', () => {
  it('denies a principal holding only applications.read (an adopter)', async () => {
    const { deps } = makeDeps();
    await expect(
      countAdoptedAdopters(
        deps,
        makePrincipal({ roles: ['adopter'], permissions: ['applications.read'] }),
        baseReq
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws PERMISSION_DENIED without any permission', async () => {
    const { deps } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal({ roles: ['adopter'], permissions: [] }), baseReq)
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

  it('rejects a cohort below the k-anonymity floor with INVALID_ARGUMENT', async () => {
    const { deps, query } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal(), {
        ...baseReq,
        adopterIds: cohortIds.slice(0, MIN_COHORT_SIZE - 1),
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a single-id request (the oracle case) with INVALID_ARGUMENT', async () => {
    const { deps, query } = makeDeps();
    await expect(
      countAdoptedAdopters(deps, makePrincipal(), { ...baseReq, adopterIds: ['usr-victim'] })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects when de-duplication drops the cohort below the floor', async () => {
    const { deps, query } = makeDeps();
    // MIN_COHORT_SIZE raw ids that collapse to a single distinct id.
    await expect(
      countAdoptedAdopters(deps, makePrincipal(), {
        ...baseReq,
        adopterIds: Array.from({ length: MIN_COHORT_SIZE }, () => 'usr-victim'),
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('dedupes adopter_ids before querying', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    await countAdoptedAdopters(deps, makePrincipal(), {
      ...baseReq,
      adopterIds: [...cohortIds, ...cohortIds],
    });

    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toEqual(cohortIds);
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

  it('returns the distinct count from the query for a legitimate admin caller', async () => {
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
