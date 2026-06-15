import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';
import type { PoolClient } from 'pg';

import { erasePets } from './erase.js';

const payload: GdprErasureRequestedPayload = {
  userId: 'usr-erase-1',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T12:00:00.000Z',
} as unknown as GdprErasureRequestedPayload;

function makeClient(): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rowCount: 0 });
  return { client: { query } as unknown as PoolClient, query };
}

describe('erasePets', () => {
  it('deletes the user’s favourites by user_id', async () => {
    const { client, query } = makeClient();
    await erasePets(client, payload);

    const favSql = query.mock.calls.find(call => /user_favorites/.test(call[0] as string));
    expect(favSql).toBeDefined();
    const [sql, params] = favSql as [string, unknown[]];
    expect(sql).toMatch(/user_id = \$1/);
    expect(params).toEqual([payload.userId]);
  });

  it('deletes the user’s ratings via reviewer_id, not a non-existent user_id column', async () => {
    const { client, query } = makeClient();
    await erasePets(client, payload);

    const ratingsCall = query.mock.calls.find(call => /ratings/.test(call[0] as string));
    expect(ratingsCall).toBeDefined();
    const [sql, params] = ratingsCall as [string, unknown[]];
    // The ratings table keys the author as `reviewer_id`; there is no
    // `user_id` column, so the old query threw at runtime and aborted
    // the whole erasure.
    expect(sql).toMatch(/reviewer_id = \$1/);
    expect(sql).not.toMatch(/\buser_id\b/);
    expect(params).toEqual([payload.userId]);
  });

  it('returns the total rows touched across both statements', async () => {
    const { client, query } = makeClient();
    query.mockResolvedValueOnce({ rowCount: 2 }); // favourites
    query.mockResolvedValueOnce({ rowCount: 3 }); // ratings

    const total = await erasePets(client, payload);

    expect(total).toBe(5);
  });
});
