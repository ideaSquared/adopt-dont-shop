import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { eraseModeration } from './erase.js';

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-erase',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T00:00:00Z',
};

function makeClient(rowCounts: number[]): {
  client: PoolClient;
  calls: Array<{ text: string; values: unknown[] }>;
} {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  let i = 0;
  const query = vi.fn(async (text: string, values: unknown[]) => {
    calls.push({ text, values });
    const rowCount = rowCounts[i] ?? 0;
    i += 1;
    return { rowCount, rows: [] };
  });
  return { client: { query } as unknown as PoolClient, calls };
}

describe('eraseModeration', () => {
  it('anonymises reports filed by the user and deletes their support tickets', async () => {
    const { client, calls } = makeClient([2, 1]);
    const total = await eraseModeration(client, PAYLOAD);

    expect(calls).toHaveLength(2);
    expect(calls.every(c => c.values[0] === 'usr-erase')).toBe(true);
    expect(calls.some(c => c.text.includes('reports'))).toBe(true);
    expect(calls.some(c => c.text.includes('support_tickets'))).toBe(true);
    // Sum of the row counts is reported back to the saga.
    expect(total).toBe(3);
  });

  it('anonymises the reporter to NULL (keeping the row) and redacts the description', async () => {
    const { client, calls } = makeClient([1, 0]);
    await eraseModeration(client, PAYLOAD);

    const reportCall = calls.find(c => c.text.includes('reports'));
    expect(reportCall).toBeDefined();
    // The row is kept so the reported party's moderation history survives:
    // reporter_id is NULLed (requires the column be nullable — migration 010),
    // not the row deleted.
    expect(reportCall?.text).toMatch(/reporter_id\s*=\s*NULL/i);
    expect(reportCall?.text).not.toMatch(/DELETE\s+FROM\s+moderation\.reports/i);
    expect(reportCall?.text).toContain("'[erased]'");
  });

  it('returns 0 when the user has no data in this schema (idempotent re-run)', async () => {
    const { client } = makeClient([0, 0]);
    const total = await eraseModeration(client, PAYLOAD);
    expect(total).toBe(0);
  });
});
