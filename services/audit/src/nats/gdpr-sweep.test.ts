// Tests for the GDPR saga sweep (ADS-830).
//
// The sweep runs periodically and:
//   1. Marks sagas older than DEADLINE_MS that still have missing completions
//      as timed_out (sets timed_out_at, logs error with missing services).
//   2. Re-publishes gdpr.erasureRequested for sagas where any service has
//      failed (failed_at set) AND retry_count < MAX_RETRIES, incrementing
//      retry_count and using a distinct msgID so JetStream does not dedupe
//      the retry.
//   3. Never touches completed sagas (completed_at IS NOT NULL).
//
// The sweep operates at the DB + NATS level; we mock both.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { GDPR_ERASURE_REQUESTED, GDPR_SAGA_MAX_RETRIES, runGdprSweep } from './gdpr-sweep.js';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function makeNats(): { js: ReturnType<typeof vi.fn>; nc: NatsConnection } {
  const publishFn = vi.fn().mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1 });
  const js = vi.fn(() => ({ publish: publishFn }));
  const nc = { jetstream: js } as unknown as NatsConnection;
  return { js, nc };
}

// A saga row as the sweep query returns it.
type SagaRow = {
  correlation_id: string;
  user_id: string;
  reason: string | null;
  requested_at: string;
  completions: Record<string, unknown>;
  completed_at: string | null;
  failed_at: string | null;
  timed_out_at: string | null;
  retry_count: number;
};

function makeSagaRow(overrides: Partial<SagaRow> = {}): SagaRow {
  return {
    correlation_id: 'corr-1',
    user_id: 'usr-1',
    reason: null,
    requested_at: '2026-06-11T10:00:00Z',
    completions: {},
    completed_at: null,
    failed_at: null,
    timed_out_at: null,
    retry_count: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Sweep: timeout detection
// ---------------------------------------------------------------------------

describe('runGdprSweep — timeout', () => {
  it('marks a saga as timed_out when it is overdue and has services that never acked', async () => {
    const pool = {
      query: vi.fn(),
    };
    // Saga is 2 hours old, expected services have no completions.
    const row = makeSagaRow({ completions: {} });
    let callCount = 0;
    pool.query.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { rows: [row] }; // SELECT overdue sagas
      return { rows: [] }; // UPDATE / SELECT retries
    });

    const logger = makeLogger();
    const { nc } = makeNats();

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    // Must UPDATE timed_out_at for the saga.
    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    const updateCall = calls.find(
      ([sql]) => sql.includes('timed_out_at') && sql.includes('UPDATE')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain('corr-1');

    // Must log at error level (alertable signal).
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('gdpr'),
      expect.objectContaining({ correlationId: 'corr-1' })
    );
  });

  it('does not touch sagas that have completed normally', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const logger = makeLogger();
    const { nc } = makeNats();

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    // The SELECT for overdue sagas must exclude completed rows.
    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    const selectCall = calls[0];
    expect(selectCall[0]).toContain('completed_at IS NULL');
  });

  it('logs the list of services that never acked as the alertable signal', async () => {
    const row = makeSagaRow({
      completions: {
        auth: { recordsErased: 1, completedAt: '2026-06-11T10:01:00Z' },
        pets: { recordsErased: 2, completedAt: '2026-06-11T10:01:00Z' },
        // 7 more services missing
      },
    });

    const pool = { query: vi.fn() };
    let callCount = 0;
    (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? { rows: [row] } : { rows: [] };
    });

    const logger = makeLogger();
    const { nc } = makeNats();

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        missingServices: expect.arrayContaining([
          'notifications',
          'chat',
          'applications',
          'matching',
          'moderation',
          'cms',
          'rescue',
        ]),
      })
    );
  });

  it('does not return already-timed-out sagas from the timeout SELECT (query guards timed_out_at IS NULL)', async () => {
    // The sweep's SELECT query must include `timed_out_at IS NULL` in the WHERE
    // clause. Already-timed-out rows are never returned by the DB, so the sweep
    // never re-updates them. We verify the SQL shape rather than mocking the row.
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const logger = makeLogger();
    const { nc } = makeNats();

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    // The first SELECT is the timeout/overdue query.
    const timeoutSelect = calls[0];
    expect(timeoutSelect[0]).toContain('timed_out_at IS NULL');
  });
});

// ---------------------------------------------------------------------------
// Sweep: retry publishing
// ---------------------------------------------------------------------------

describe('runGdprSweep — retry', () => {
  it('re-publishes gdpr.erasureRequested for a failed saga under the retry limit', async () => {
    const row = makeSagaRow({
      failed_at: '2026-06-11T10:05:00Z',
      retry_count: 0,
      completions: {
        pets: { recordsErased: 0, error: 'timeout', completedAt: '2026-06-11T10:05:00Z' },
      },
    });

    const pool = { query: vi.fn() };
    let callCount = 0;
    (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { rows: [] }; // overdue / timeout sweep
      if (callCount === 2) return { rows: [row] }; // retry candidates query
      return { rows: [] };
    });

    const logger = makeLogger();
    const publishFn = vi.fn().mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1 });
    const nc = { jetstream: () => ({ publish: publishFn }) } as unknown as NatsConnection;

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    // Must publish exactly one retry for this saga.
    expect(publishFn).toHaveBeenCalledTimes(1);
    expect(publishFn).toHaveBeenCalledWith(
      GDPR_ERASURE_REQUESTED,
      expect.any(Uint8Array),
      expect.objectContaining({
        msgID: expect.stringContaining('corr-1:retry:1'),
      })
    );

    // Must increment retry_count.
    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    const retryUpdate = calls.find(
      ([sql]) => sql.includes('retry_count') && sql.includes('UPDATE')
    );
    expect(retryUpdate).toBeDefined();
  });

  it('uses a distinct msgID per retry attempt so JetStream does not deduplicate retries', async () => {
    // First retry: retry_count becomes 1 → msgID ends in ':retry:1'
    const row = makeSagaRow({
      failed_at: '2026-06-11T10:05:00Z',
      retry_count: 1,
      completions: {
        auth: { recordsErased: 0, error: 'db down', completedAt: '2026-06-11T10:05:00Z' },
      },
    });

    const pool = { query: vi.fn() };
    let callCount = 0;
    (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      if (callCount === 2) return { rows: [row] };
      return { rows: [] };
    });

    const logger = makeLogger();
    const publishFn = vi.fn().mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1 });
    const nc = { jetstream: () => ({ publish: publishFn }) } as unknown as NatsConnection;

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    // retry_count was 1, so this publish is attempt #2 → msgID ':retry:2'
    expect(publishFn).toHaveBeenCalledWith(
      GDPR_ERASURE_REQUESTED,
      expect.any(Uint8Array),
      expect.objectContaining({ msgID: 'corr-1:retry:2' })
    );
  });

  it('does NOT re-publish when retry_count has reached MAX_RETRIES', async () => {
    const maxRetries = GDPR_SAGA_MAX_RETRIES;

    const pool = { query: vi.fn() };
    // The retry query should return no rows when filtering on retry_count < maxRetries.
    // Simulate the DB side: the SELECT for retries returns empty because the DB
    // WHERE clause filters it out (retry_count = maxRetries, which is NOT < maxRetries).
    // We verify the WHERE clause shape carries the right bound as a SQL parameter.
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

    const logger = makeLogger();
    const publishFn = vi.fn().mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1 });
    const nc = { jetstream: () => ({ publish: publishFn }) } as unknown as NatsConnection;

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries,
    });

    // The sweep query for retry candidates must include the retry_count < maxRetries filter.
    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    // Find the retry candidates SELECT (it has 'failed_at IS NOT NULL' in the WHERE).
    const retryCandidateQuery = calls.find(
      ([sql]) => sql.includes('failed_at IS NOT NULL') && sql.includes('retry_count')
    );
    expect(retryCandidateQuery).toBeDefined();
    // The SQL param list must include maxRetries as a bound.
    expect(retryCandidateQuery![1]).toContain(maxRetries);

    // No publishes.
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('the re-published payload carries the original correlationId, userId, and requestedAt', async () => {
    const row = makeSagaRow({
      correlation_id: 'corr-abc',
      user_id: 'usr-xyz',
      reason: 'moving abroad',
      requested_at: '2026-06-11T10:00:00Z',
      failed_at: '2026-06-11T10:05:00Z',
      retry_count: 0,
      completions: {
        auth: { recordsErased: 0, error: 'crash', completedAt: '2026-06-11T10:05:00Z' },
      },
    });

    const pool = { query: vi.fn() };
    let callCount = 0;
    (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      if (callCount === 2) return { rows: [row] };
      return { rows: [] };
    });

    const logger = makeLogger();
    const publishFn = vi.fn().mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1 });
    const nc = { jetstream: () => ({ publish: publishFn }) } as unknown as NatsConnection;

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    expect(publishFn).toHaveBeenCalledTimes(1);
    const [, data] = publishFn.mock.calls[0] as [string, Uint8Array, unknown];
    const envelope = JSON.parse(new TextDecoder().decode(data)) as {
      payload: { correlationId: string; userId: string; requestedAt: string; reason?: string };
    };
    expect(envelope.payload.correlationId).toBe('corr-abc');
    expect(envelope.payload.userId).toBe('usr-xyz');
    expect(envelope.payload.requestedAt).toBe('2026-06-11T10:00:00Z');
    expect(envelope.payload.reason).toBe('moving abroad');
  });

  it('does not re-publish for a saga whose completed_at is set (already done)', async () => {
    // completed sagas should not be returned by the retry query.
    // Verify the WHERE clause excludes them.
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const logger = makeLogger();
    const publishFn = vi.fn();
    const nc = { jetstream: () => ({ publish: publishFn }) } as unknown as NatsConnection;

    await runGdprSweep({
      pool: pool as unknown as Pool,
      nats: nc,
      logger,
      deadlineMs: 30 * 60 * 1000,
      maxRetries: 3,
    });

    const calls = (pool.query as ReturnType<typeof vi.fn>).mock.calls as [string, unknown[]][];
    const retryCandidateQuery = calls.find(([sql]) => sql.includes('retry_count'));
    expect(retryCandidateQuery?.[0]).toContain('completed_at IS NULL');
    expect(publishFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GDPR_SAGA_MAX_RETRIES export
// ---------------------------------------------------------------------------

describe('GDPR_SAGA_MAX_RETRIES', () => {
  it('is 3 by default', () => {
    expect(GDPR_SAGA_MAX_RETRIES).toBe(3);
  });
});
