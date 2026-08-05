import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { claimScheduledRun } from './claim.js';

// A Pool double backed by an in-memory set of claimed slots, modelling
// INSERT ... ON CONFLICT DO NOTHING: the first insert of a (job, slot) key
// returns rowCount 1, any later insert of the same key returns rowCount 0.
const makeConn = () => {
  const claimed = new Set<string>();
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const conn = {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      const [jobName, scheduledFor] = params as [string, Date];
      const key = `${jobName}::${scheduledFor.toISOString()}`;
      if (claimed.has(key)) {
        return { rowCount: 0, rows: [] };
      }
      claimed.add(key);
      return { rowCount: 1, rows: [] };
    }),
  };
  return { conn: conn as unknown as Pool, queries };
};

const SLOT = new Date('2026-08-03T00:00:00.000Z');

describe('claimScheduledRun', () => {
  it('wins a fresh slot (rowCount 1 → true)', async () => {
    const { conn } = makeConn();
    const won = await claimScheduledRun(conn, 'weekly-digest', SLOT);
    expect(won).toBe(true);
  });

  it('issues an INSERT ... ON CONFLICT DO NOTHING keyed by job + slot', async () => {
    const { conn, queries } = makeConn();
    await claimScheduledRun(conn, 'weekly-digest', SLOT);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain('INSERT INTO scheduled_job_runs');
    expect(queries[0].sql).toContain('ON CONFLICT (job_name, scheduled_for) DO NOTHING');
    expect(queries[0].params).toEqual(['weekly-digest', SLOT]);
  });

  it('loses to an existing claim for the same slot (rowCount 0 → false)', async () => {
    const { conn } = makeConn();
    await claimScheduledRun(conn, 'weekly-digest', SLOT);
    const second = await claimScheduledRun(conn, 'weekly-digest', SLOT);
    expect(second).toBe(false);
  });

  it('lets exactly one of two concurrent claimants win the same slot', async () => {
    const { conn } = makeConn();
    const results = await Promise.all([
      claimScheduledRun(conn, 'weekly-digest', SLOT),
      claimScheduledRun(conn, 'weekly-digest', SLOT),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('lets both claimants win when the slots differ', async () => {
    const { conn } = makeConn();
    const laterSlot = new Date('2026-08-10T00:00:00.000Z');
    const a = await claimScheduledRun(conn, 'weekly-digest', SLOT);
    const b = await claimScheduledRun(conn, 'weekly-digest', laterSlot);
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
