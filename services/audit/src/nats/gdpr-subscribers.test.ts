import type { Pool } from 'pg';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { recordCompletion, recordRequest, EXPECTED_SERVICES } from './gdpr-subscribers.js';

function makePool() {
  return {
    query: vi.fn(async () => ({ rows: [], rowCount: 1 })),
  } as unknown as Pool;
}

function makeLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  } as unknown as Logger;
}

function capturedCalls(pool: Pool): Array<[string, unknown[]]> {
  return (pool.query as ReturnType<typeof vi.fn>).mock.calls.map(call => {
    const [sql, params] = call as [string, unknown[]];
    return [sql, params];
  });
}

const REQUEST_PAYLOAD = {
  userId: 'usr-1',
  correlationId: 'corr-1',
  requestedAt: '2026-06-09T12:00:00Z',
  reason: 'leaving',
};

const COMPLETION_PAYLOAD = {
  userId: 'usr-1',
  correlationId: 'corr-1',
  service: 'auth',
  recordsErased: 7,
  completedAt: '2026-06-09T12:01:00Z',
};

describe('recordRequest', () => {
  it('INSERTs and back-fills reason/requested_at on conflict (ADS-776)', async () => {
    const pool = makePool();
    await recordRequest(pool, REQUEST_PAYLOAD);
    const [[sql, params]] = capturedCalls(pool);
    expect(sql).toContain('INSERT INTO audit.gdpr_erasure_requests');
    expect(sql).toContain('ON CONFLICT (correlation_id) DO UPDATE');
    // A completion-first skeleton row has reason = NULL and requested_at =
    // the completion timestamp; the real request must back-fill both.
    expect(sql).toMatch(
      /reason\s*=\s*COALESCE\(audit\.gdpr_erasure_requests\.reason,\s*EXCLUDED\.reason\)/
    );
    expect(sql).toMatch(
      /requested_at\s*=\s*LEAST\(audit\.gdpr_erasure_requests\.requested_at,\s*EXCLUDED\.requested_at\)/
    );
    expect(sql).toMatch(
      /user_id\s*=\s*COALESCE\(audit\.gdpr_erasure_requests\.user_id,\s*EXCLUDED\.user_id\)/
    );
    // Must NOT silently drop the replayed values any more.
    expect(sql).not.toContain('DO NOTHING');
    expect(params).toEqual(['corr-1', 'usr-1', 'leaving', '2026-06-09T12:00:00Z']);
  });

  it('never touches completions, completed_at, or failed_at (a late request must not clobber saga progress)', async () => {
    const pool = makePool();
    await recordRequest(pool, REQUEST_PAYLOAD);
    const [[sql]] = capturedCalls(pool);
    expect(sql).not.toContain('completions');
    expect(sql).not.toContain('completed_at');
    expect(sql).not.toContain('failed_at');
  });
});

describe('out-of-order delivery (ADS-776)', () => {
  it('completion-first then request issues the same statements as the in-order path, so both orderings converge on the same row', async () => {
    const logger = makeLogger();

    const inOrderPool = makePool();
    await recordRequest(inOrderPool, REQUEST_PAYLOAD);
    await recordCompletion(inOrderPool, COMPLETION_PAYLOAD, logger);

    const outOfOrderPool = makePool();
    await recordCompletion(outOfOrderPool, COMPLETION_PAYLOAD, logger);
    await recordRequest(outOfOrderPool, REQUEST_PAYLOAD);

    const inOrder = capturedCalls(inOrderPool);
    const outOfOrder = capturedCalls(outOfOrderPool);

    // Same two statements, just reordered. Because each statement's
    // conflict clause only fills gaps (COALESCE/LEAST/||-merge) and never
    // overwrites the other's columns, statement-set equality means the
    // final row state is order-independent.
    expect(outOfOrder).toHaveLength(2);
    expect(outOfOrder).toEqual(expect.arrayContaining(inOrder));
    expect(inOrder).toEqual(expect.arrayContaining(outOfOrder));

    // The late-arriving request still carries the real reason and
    // requested_at — and its COALESCE/LEAST clauses apply them over the
    // skeleton's NULL reason / completion-timestamp requested_at.
    const requestCall = outOfOrder.find(([sql]) => !sql.includes('completions'));
    expect(requestCall).toBeDefined();
    const [requestSql, requestParams] = requestCall ?? ['', []];
    expect(requestSql).toContain('COALESCE(audit.gdpr_erasure_requests.reason, EXCLUDED.reason)');
    expect(requestSql).toContain(
      'LEAST(audit.gdpr_erasure_requests.requested_at, EXCLUDED.requested_at)'
    );
    expect(requestParams[2]).toBe('leaving');
    expect(requestParams[3]).toBe('2026-06-09T12:00:00Z');
  });
});

describe('recordCompletion', () => {
  it('merges the completion into the JSONB blob and threads EXPECTED_SERVICES into the SQL', async () => {
    const pool = makePool();
    await recordCompletion(pool, COMPLETION_PAYLOAD, makeLogger());
    const [[sql, params]] = capturedCalls(pool);
    expect(sql).toContain('ON CONFLICT (correlation_id) DO UPDATE');
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
    await recordCompletion(
      pool,
      {
        userId: 'usr-1',
        correlationId: 'corr-1',
        service: 'pets',
        recordsErased: 0,
        completedAt: '2026-06-09T12:01:00Z',
        error: 'pool timeout',
      },
      makeLogger()
    );
    const [[, params]] = capturedCalls(pool);
    const entry = JSON.parse(params[4] as string) as Record<string, unknown>;
    expect(entry.error).toBe('pool timeout');
  });

  it('only counts error-free acks towards completed_at (ADS-777)', async () => {
    const pool = makePool();
    await recordCompletion(pool, COMPLETION_PAYLOAD, makeLogger());
    const [[sql]] = capturedCalls(pool);
    // completed_at must be gated on the number of completion entries
    // WITHOUT an `error` field, not the raw key count.
    expect(sql).toMatch(/jsonb_each/);
    expect(sql).toMatch(/NOT\s*\(c\.value \? 'error'\)/);
    expect(sql).not.toContain('jsonb_object_keys');
  });

  it('counts only EXPECTED_SERVICES towards completed_at, not arbitrary error-free keys (no premature completion)', async () => {
    const pool = makePool();
    await recordCompletion(pool, COMPLETION_PAYLOAD, makeLogger());
    const [[sql, params]] = capturedCalls(pool);
    // The error-free count must be restricted to keys that ARE expected
    // services — otherwise a stray completion from a non-expected service
    // (e.g. 'gateway') could inflate the count and flip completed_at before
    // every expected service has acked. The expected-services set is threaded
    // in as a param so the SQL can intersect the blob keys against it.
    expect(params).toContainEqual([...EXPECTED_SERVICES]);
    expect(sql).toMatch(/= ANY\(/);
  });

  it('stamps failed_at (once) when a completion carries an error, on both insert and conflict paths', async () => {
    const pool = makePool();
    await recordCompletion(pool, COMPLETION_PAYLOAD, makeLogger());
    const [[sql]] = capturedCalls(pool);
    expect(sql).toContain('failed_at');
    // Insert path: skeleton row stamps failed_at if the first ack errored.
    expect(sql).toMatch(/CASE WHEN \$5::jsonb \? 'error' THEN now\(\)/);
    // Conflict path: first error wins; later successes never clear it.
    expect(sql).toMatch(/failed_at\s*=\s*COALESCE\(\s*audit\.gdpr_erasure_requests\.failed_at/);
  });

  it('warns the operator when a completion arrives with an error, and stays quiet otherwise', async () => {
    const pool = makePool();
    const logger = makeLogger();

    await recordCompletion(pool, COMPLETION_PAYLOAD, logger);
    expect(logger.warn).not.toHaveBeenCalled();

    await recordCompletion(
      pool,
      { ...COMPLETION_PAYLOAD, service: 'pets', recordsErased: 0, error: 'pool timeout' },
      logger
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('gdpr'),
      expect.objectContaining({
        correlationId: 'corr-1',
        service: 'pets',
        error: 'pool timeout',
      })
    );
  });

  it('a saga where 3 of 9 services ack with errors is flagged failed, not completed (ADS-777)', async () => {
    const pool = makePool();
    const logger = makeLogger();
    const failingServices = new Set(['pets', 'chat', 'cms']);

    for (const service of EXPECTED_SERVICES) {
      await recordCompletion(
        pool,
        {
          userId: 'usr-1',
          correlationId: 'corr-1',
          service,
          recordsErased: failingServices.has(service) ? 0 : 3,
          completedAt: '2026-06-09T12:01:00Z',
          ...(failingServices.has(service) ? { error: 'erase failed' } : {}),
        },
        logger
      );
    }

    const calls = capturedCalls(pool);
    expect(calls).toHaveLength(9);

    // Every statement gates completed_at on the count of error-free
    // entries reaching the full expected-services threshold...
    for (const [sql, params] of calls) {
      expect(sql).toMatch(/NOT\s*\(c\.value \? 'error'\)/);
      expect(params[5]).toBe(EXPECTED_SERVICES.length);
    }

    // ...and only 6 of the 9 merged entries are error-free, so the
    // threshold of 9 is never met — completed_at stays NULL.
    const entries = calls.map(
      ([, params]) => JSON.parse(params[4] as string) as Record<string, unknown>
    );
    const errorFree = entries.filter(entry => entry.error === undefined);
    expect(errorFree).toHaveLength(EXPECTED_SERVICES.length - failingServices.size);
    expect(errorFree.length).toBeLessThan(EXPECTED_SERVICES.length);

    // Each errored ack stamps failed_at (COALESCE keeps the first) and
    // raises a Layer-1 warning for the operator.
    expect(logger.warn).toHaveBeenCalledTimes(failingServices.size);
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
