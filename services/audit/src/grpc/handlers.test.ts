import { describe, expect, it, vi } from 'vitest';

import { AuditV1, type AuditQueryRequest } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { encodeCursor } from './cursor.js';
import { getByTarget, getGdprErasureRequest, query } from './handlers.js';

function makePrincipal(overrides: Partial<{ userId: string; permissions: string[] }> = {}) {
  return {
    userId: overrides.userId ?? 'admin-1',
    roles: ['admin'],
    permissions: overrides.permissions ?? ['admin.audit_logs'],
    rescueId: undefined,
  } as unknown as Parameters<typeof query>[1];
}

type FakeRow = {
  event_id: string;
  service: string;
  subject: string;
  aggregate_type: string;
  aggregate_id: string;
  actor_user_id: string | null;
  actor_email_snapshot: string | null;
  action: string;
  outcome: string;
  occurred_at: Date;
  recorded_at: Date;
  payload: unknown;
  ip_address: string | null;
  user_agent: string | null;
};

function makeRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    event_id: '11111111-1111-1111-1111-111111111111',
    service: 'service.auth',
    subject: 'auth.userLoggedIn',
    aggregate_type: 'user',
    aggregate_id: '22222222-2222-2222-2222-222222222222',
    actor_user_id: '33333333-3333-3333-3333-333333333333',
    actor_email_snapshot: 'user@example.com',
    action: 'login',
    outcome: 'success',
    occurred_at: new Date('2026-06-01T12:00:00.000Z'),
    recorded_at: new Date('2026-06-01T12:00:00.500Z'),
    payload: { source: 'web' },
    ip_address: '1.2.3.4',
    user_agent: 'Mozilla/5.0',
    ...overrides,
  };
}

function makeDeps(rows: FakeRow[]): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const queryMock = vi.fn(() => Promise.resolve({ rows }));
  return {
    deps: { pool: { query: queryMock }, nats: {} } as unknown as HandlerDeps,
    query: queryMock,
  };
}

describe('query', () => {
  it('throws PERMISSION_DENIED when principal lacks admin.audit_logs', async () => {
    const { deps } = makeDeps([]);
    await expect(
      query(deps, makePrincipal({ permissions: ['pets.read'] }), { limit: 10 } as AuditQueryRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('returns events with no filters, defaulting limit', async () => {
    const { deps, query: qmock } = makeDeps([makeRow()]);
    const res = await query(deps, makePrincipal(), {} as AuditQueryRequest);
    expect(res.events).toHaveLength(1);
    expect(res.events[0].eventId).toBe('11111111-1111-1111-1111-111111111111');
    // No filters → only the LIMIT+1 placeholder
    expect(qmock.mock.calls[0][1]).toHaveLength(1);
    expect(qmock.mock.calls[0][1][0]).toBe(51);
  });

  it('clamps limit above MAX_LIMIT to 200', async () => {
    const { deps, query: qmock } = makeDeps([]);
    await query(deps, makePrincipal(), { limit: 9999 } as AuditQueryRequest);
    expect(qmock.mock.calls[0][1][0]).toBe(201);
  });

  it('floor-clamps negative / non-finite limit to default 50', async () => {
    const { deps, query: qmock } = makeDeps([]);
    await query(deps, makePrincipal(), { limit: -5 } as AuditQueryRequest);
    expect(qmock.mock.calls[0][1][0]).toBe(51);
  });

  it('applies all filters', async () => {
    const { deps, query: qmock } = makeDeps([]);
    await query(deps, makePrincipal(), {
      service: 'service.auth',
      subject: 'auth.userLoggedIn',
      actorUserId: 'usr-1',
      outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED,
      occurredAtFrom: '2026-06-01T00:00:00Z',
      occurredAtTo: '2026-06-02T00:00:00Z',
      limit: 25,
    } as AuditQueryRequest);
    const sql = qmock.mock.calls[0][0] as string;
    expect(sql).toContain('service = $1');
    expect(sql).toContain('subject = $2');
    expect(sql).toContain('actor_user_id = $3');
    expect(sql).toContain('outcome = $4');
    expect(sql).toContain('occurred_at >= $5');
    expect(sql).toContain('occurred_at < $6');
    expect(qmock.mock.calls[0][1]).toEqual([
      'service.auth',
      'auth.userLoggedIn',
      'usr-1',
      'denied',
      '2026-06-01T00:00:00Z',
      '2026-06-02T00:00:00Z',
      26,
    ]);
  });

  it('decodes and applies a cursor', async () => {
    const { deps, query: qmock } = makeDeps([]);
    const cursor = encodeCursor({
      occurredAt: '2026-06-01T11:00:00.000Z',
      eventId: '99999999-9999-9999-9999-999999999999',
    });
    await query(deps, makePrincipal(), { cursor, limit: 10 } as AuditQueryRequest);
    const sql = qmock.mock.calls[0][0] as string;
    expect(sql).toContain('occurred_at <');
    expect(sql).toContain('event_id <');
  });

  it('throws INVALID_ARGUMENT on a malformed cursor', async () => {
    const { deps } = makeDeps([]);
    await expect(
      query(deps, makePrincipal(), { cursor: '!!!', limit: 10 } as AuditQueryRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('emits a nextCursor only when there are more rows', async () => {
    const noMore = await query(makeDeps([makeRow()]).deps, makePrincipal(), {
      limit: 10,
    } as AuditQueryRequest);
    expect(noMore.nextCursor).toBeUndefined();

    const eleven = Array.from({ length: 11 }, (_, i) =>
      makeRow({ event_id: `${i}`, occurred_at: new Date(2026, 0, 1, 12, 0, 0, i) })
    );
    const more = await query(makeDeps(eleven).deps, makePrincipal(), {
      limit: 10,
    } as AuditQueryRequest);
    expect(more.events).toHaveLength(10);
    expect(more.nextCursor).toBeDefined();
  });
});

describe('getByTarget', () => {
  it('throws PERMISSION_DENIED when principal lacks admin.audit_logs', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getByTarget(deps, makePrincipal({ permissions: [] }), {
        aggregateType: 'user',
        aggregateId: 'usr-1',
        limit: 10,
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT on missing aggregate_type', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getByTarget(deps, makePrincipal(), { aggregateType: '', aggregateId: 'x', limit: 10 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on missing aggregate_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getByTarget(deps, makePrincipal(), { aggregateType: 'user', aggregateId: '', limit: 10 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('queries with the (aggregate_type, aggregate_id) compound idx', async () => {
    const { deps, query: qmock } = makeDeps([makeRow({ aggregate_id: 'app-1' })]);
    const res = await getByTarget(deps, makePrincipal(), {
      aggregateType: 'application',
      aggregateId: 'app-1',
      limit: 50,
    });
    expect(res.events).toHaveLength(1);
    expect(qmock.mock.calls[0][1][0]).toBe('application');
    expect(qmock.mock.calls[0][1][1]).toBe('app-1');
  });

  it('threads a cursor through and emits nextCursor when more rows present', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      makeRow({ event_id: `${i}`, occurred_at: new Date(2026, 0, 1, 12, 0, 0, i) })
    );
    const res = await getByTarget(makeDeps(eleven).deps, makePrincipal(), {
      aggregateType: 'pet',
      aggregateId: 'pet-1',
      limit: 10,
    });
    expect(res.events).toHaveLength(10);
    expect(res.nextCursor).toBeDefined();
  });
});

// --- getGdprErasureRequest -------------------------------------------

function makeGdprRow(overrides: Record<string, unknown> = {}) {
  return {
    correlation_id: 'corr-1',
    user_id: 'usr-1',
    reason: 'leaving',
    requested_at: new Date('2026-06-09T12:00:00Z'),
    completions: { auth: { recordsErased: 7, completedAt: '2026-06-09T12:01:00Z' } },
    completed_at: null,
    timed_out_at: null,
    retry_count: 0,
    created_at: new Date('2026-06-09T12:00:00Z'),
    updated_at: new Date('2026-06-09T12:01:00Z'),
    ...overrides,
  };
}

describe('getGdprErasureRequest', () => {
  it('returns NOT_FOUND when the row is missing', async () => {
    const queryMock = vi.fn(() => Promise.resolve({ rows: [] }));
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    await expect(
      getGdprErasureRequest(deps, makePrincipal(), { correlationId: 'corr-x' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the row to an admin', async () => {
    const queryMock = vi.fn(() => Promise.resolve({ rows: [makeGdprRow()] }));
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    const res = await getGdprErasureRequest(
      deps,
      makePrincipal({ permissions: ['admin.gdpr.read'] }),
      { correlationId: 'corr-1' }
    );
    expect(res.request?.correlationId).toBe('corr-1');
    expect(res.request?.completionsJson).toContain('"auth"');
  });

  it('returns the row to the requesting user (self-ownership)', async () => {
    const queryMock = vi.fn(() => Promise.resolve({ rows: [makeGdprRow()] }));
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    const res = await getGdprErasureRequest(
      deps,
      makePrincipal({ userId: 'usr-1', permissions: [] }),
      { correlationId: 'corr-1' }
    );
    expect(res.request?.userId).toBe('usr-1');
  });

  it('returns NOT_FOUND (not PERMISSION_DENIED) to a non-admin non-owner so the id existence is not leaked', async () => {
    const queryMock = vi.fn(() => Promise.resolve({ rows: [makeGdprRow()] }));
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    // The row exists (user_id 'usr-1') but the caller is 'usr-2' without
    // admin.gdpr.read. A PERMISSION_DENIED would confirm the id exists;
    // an absent id returns NOT_FOUND — so a non-admin non-owner must get
    // NOT_FOUND in both cases to avoid the existence oracle.
    await expect(
      getGdprErasureRequest(deps, makePrincipal({ userId: 'usr-2', permissions: [] }), {
        correlationId: 'corr-1',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects empty correlationId with INVALID_ARGUMENT', async () => {
    const queryMock = vi.fn();
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    await expect(
      getGdprErasureRequest(deps, makePrincipal(), { correlationId: '   ' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('exposes timed_out_at and retry_count from the DB row (ADS-830)', async () => {
    const queryMock = vi.fn(() =>
      Promise.resolve({
        rows: [
          makeGdprRow({
            timed_out_at: new Date('2026-06-09T12:31:00Z'),
            retry_count: 2,
          }),
        ],
      })
    );
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    const res = await getGdprErasureRequest(
      deps,
      makePrincipal({ permissions: ['admin.gdpr.read'] }),
      { correlationId: 'corr-1' }
    );
    expect(res.request?.timedOutAt).toBe('2026-06-09T12:31:00.000Z');
    expect(res.request?.retryCount).toBe(2);
  });

  it('returns timedOutAt as undefined and retryCount as 0 when row has no timeout/retries', async () => {
    const queryMock = vi.fn(() =>
      Promise.resolve({ rows: [makeGdprRow({ timed_out_at: null, retry_count: 0 })] })
    );
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    const res = await getGdprErasureRequest(
      deps,
      makePrincipal({ permissions: ['admin.gdpr.read'] }),
      { correlationId: 'corr-1' }
    );
    expect(res.request?.timedOutAt).toBeUndefined();
    expect(res.request?.retryCount).toBe(0);
  });

  it('includes timed_out_at and retry_count in the SELECT query (ADS-830)', async () => {
    const queryMock = vi.fn(() => Promise.resolve({ rows: [makeGdprRow()] }));
    const deps = {
      pool: { query: queryMock },
      nats: {},
    } as unknown as HandlerDeps;
    await getGdprErasureRequest(deps, makePrincipal({ permissions: ['admin.gdpr.read'] }), {
      correlationId: 'corr-1',
    });
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('timed_out_at');
    expect(sql).toContain('retry_count');
  });
});
