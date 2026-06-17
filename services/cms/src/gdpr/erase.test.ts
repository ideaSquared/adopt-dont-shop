import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { eraseCms } from './erase.js';

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-42',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T00:00:00Z',
};

function makeClient(rowCounts: number[]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let i = 0;
  const client = {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [], rowCount: rowCounts[i++] ?? 0 };
    }),
  };
  return { client: client as unknown as PoolClient, calls };
}

describe('eraseCms', () => {
  it('anonymises author_id and last_modified_by for the user and totals the rows', async () => {
    const { client, calls } = makeClient([2, 3]);
    const total = await eraseCms(client, PAYLOAD);

    expect(total).toBe(5);
    expect(calls).toHaveLength(2);
    for (const { sql, params } of calls) {
      expect(sql).toContain('SET');
      expect(sql).toContain('NULL');
      expect(params).toEqual(['usr-42']);
    }
    expect(calls[0].sql).toContain('author_id');
    expect(calls[1].sql).toContain('last_modified_by');
  });

  it('uses unqualified table names so the pool search_path selects the schema', async () => {
    const { client, calls } = makeClient([0, 0]);
    await eraseCms(client, PAYLOAD);
    for (const { sql } of calls) {
      expect(sql).toContain('cms_content');
      expect(sql).not.toContain('cms.cms_content');
    }
  });

  it('treats a null rowCount as zero rows affected', async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [], rowCount: null })),
    } as unknown as PoolClient;
    const total = await eraseCms(client, PAYLOAD);
    expect(total).toBe(0);
  });
});
