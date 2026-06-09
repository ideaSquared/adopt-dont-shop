import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { recordCompletion, recordRequest, EXPECTED_SERVICES } from './gdpr-subscribers.js';

function makePool() {
  return {
    query: vi.fn(async () => ({ rows: [], rowCount: 1 })),
  } as unknown as Pool;
}

describe('recordRequest', () => {
  it('INSERTs with ON CONFLICT DO NOTHING (idempotent on correlation_id)', async () => {
    const pool = makePool();
    await recordRequest(pool, {
      userId: 'usr-1',
      correlationId: 'corr-1',
      requestedAt: '2026-06-09T12:00:00Z',
      reason: 'leaving',
    });
    const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('INSERT INTO audit.gdpr_erasure_requests');
    expect(sql).toContain('ON CONFLICT (correlation_id) DO NOTHING');
    expect(params).toEqual(['corr-1', 'usr-1', 'leaving', '2026-06-09T12:00:00Z']);
  });
});

describe('recordCompletion', () => {
  it('merges the completion into the JSONB blob and threads EXPECTED_SERVICES into the SQL', async () => {
    const pool = makePool();
    await recordCompletion(pool, {
      userId: 'usr-1',
      correlationId: 'corr-1',
      service: 'auth',
      recordsErased: 7,
      completedAt: '2026-06-09T12:01:00Z',
    });
    const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('ON CONFLICT (correlation_id) DO UPDATE');
    expect(sql).toContain('jsonb_object_keys');
    // The threshold for completed_at comes from EXPECTED_SERVICES.length.
    expect(params[5]).toBe(EXPECTED_SERVICES.length);
    // The completion entry shape.
    const entry = JSON.parse(params[4] as string) as Record<string, unknown>;
    expect(entry).toMatchObject({
      recordsErased: 7,
      completedAt: '2026-06-09T12:01:00Z',
    });
    expect(entry.error).toBeUndefined();
  });

  it('records error field when the failure path lands', async () => {
    const pool = makePool();
    await recordCompletion(pool, {
      userId: 'usr-1',
      correlationId: 'corr-1',
      service: 'pets',
      recordsErased: 0,
      completedAt: '2026-06-09T12:01:00Z',
      error: 'pool timeout',
    });
    const params = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    const entry = JSON.parse(params[4] as string) as Record<string, unknown>;
    expect(entry.error).toBe('pool timeout');
  });
});

describe('EXPECTED_SERVICES', () => {
  it('lists the 9 services that should ack every erasure', () => {
    expect(EXPECTED_SERVICES).toEqual([
      'auth',
      'notifications',
      'pets',
      'chat',
      'applications',
      'matching',
      'moderation',
      'cms',
      'rescue',
    ]);
  });
});
