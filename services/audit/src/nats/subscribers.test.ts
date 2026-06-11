import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { persistAuditEvent } from './subscribers.js';
import type { AuditEventPayload } from './event-types.js';

function makePool(): { pool: Pool; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rowCount: 1 });
  return {
    pool: { query } as unknown as Pool,
    query,
  };
}

function basePayload(overrides: Partial<AuditEventPayload> = {}): AuditEventPayload {
  return {
    eventId: '11111111-1111-1111-1111-111111111111',
    service: 'service.auth',
    subject: 'auth.userLoggedIn',
    aggregateType: 'user',
    aggregateId: '22222222-2222-2222-2222-222222222222',
    actorUserId: '33333333-3333-3333-3333-333333333333',
    actorEmailSnapshot: 'user@example.com',
    action: 'login',
    outcome: 'success',
    occurredAt: '2026-06-01T12:00:00.000Z',
    payload: { source: 'web' },
    ipAddress: '1.2.3.4',
    userAgent: 'Mozilla/5.0',
    ...overrides,
  };
}

describe('persistAuditEvent', () => {
  it('issues an INSERT with all payload fields in the expected positions', async () => {
    const { pool, query } = makePool();
    await persistAuditEvent(pool, basePayload(), 'auth.actionTaken');

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO audit_events');
    expect(sql).toContain('ON CONFLICT (event_id) DO NOTHING');
    expect(params).toEqual([
      '11111111-1111-1111-1111-111111111111',
      'service.auth',
      'auth.userLoggedIn',
      'user',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      'user@example.com',
      'login',
      'success',
      '2026-06-01T12:00:00.000Z',
      '{"source":"web"}',
      '1.2.3.4',
      'Mozilla/5.0',
    ]);
  });

  it('falls back to the NATS subject when payload.subject is missing', async () => {
    const { pool, query } = makePool();
    await persistAuditEvent(
      pool,
      basePayload({ subject: '' as unknown as string }),
      'auth.actionTaken'
    );

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[2]).toBe('auth.actionTaken');
  });

  it('writes NULL for missing optional actor / context fields (system event)', async () => {
    const { pool, query } = makePool();
    await persistAuditEvent(
      pool,
      basePayload({
        actorUserId: undefined,
        actorEmailSnapshot: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      }),
      'auth.actionTaken'
    );

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[5]).toBeNull(); // actor_user_id
    expect(params[6]).toBeNull(); // actor_email_snapshot
    expect(params[11]).toBeNull(); // ip_address
    expect(params[12]).toBeNull(); // user_agent
  });

  it('serialises an absent payload as "{}" so the NOT NULL column has a value', async () => {
    const { pool, query } = makePool();
    await persistAuditEvent(pool, basePayload({ payload: undefined }), 'auth.actionTaken');

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[10]).toBe('{}');
  });

  it('serialises complex payloads through JSON.stringify', async () => {
    const { pool, query } = makePool();
    await persistAuditEvent(
      pool,
      basePayload({ payload: { nested: { array: [1, 2, 3] } } }),
      'auth.actionTaken'
    );

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[10]).toBe('{"nested":{"array":[1,2,3]}}');
  });

  describe('payload redaction', () => {
    it('redacts a top-level password key before persisting', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({ payload: { userId: 'u-1', password: 'hunter2' } }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as Record<string, unknown>;
      expect(persisted['password']).toBe('[REDACTED]');
      expect(persisted['userId']).toBe('u-1');
    });

    it('redacts accessToken and refreshToken at the top level', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({ payload: { accessToken: 'eyJ...', refreshToken: 'rt_xyz' } }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as Record<string, unknown>;
      expect(persisted['accessToken']).toBe('[REDACTED]');
      expect(persisted['refreshToken']).toBe('[REDACTED]');
    });

    it('redacts otp and secret keys', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({ payload: { otp: '123456', secret: 'mysecret' } }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as Record<string, unknown>;
      expect(persisted['otp']).toBe('[REDACTED]');
      expect(persisted['secret']).toBe('[REDACTED]');
    });

    it('redacts sensitive keys nested at depth 2', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({
          payload: {
            request: {
              userId: 'u-1',
              password: 'pw',
              authorization: 'Bearer eyJ...',
            },
          },
        }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as {
        request: Record<string, unknown>;
      };
      expect(persisted.request['password']).toBe('[REDACTED]');
      expect(persisted.request['authorization']).toBe('[REDACTED]');
      expect(persisted.request['userId']).toBe('u-1');
    });

    it('redacts sensitive keys nested at depth 3', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({
          payload: {
            a: { b: { c: { accessToken: 'deep_token' } } },
          },
        }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as {
        a: { b: { c: Record<string, unknown> } };
      };
      expect(persisted.a.b.c['accessToken']).toBe('[REDACTED]');
    });

    it('redacts sensitive keys inside arrays within the payload', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({
          payload: {
            items: [
              { name: 'alice', password: 'pw1' },
              { name: 'bob', refreshToken: 'rt_2' },
            ],
          },
        }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as {
        items: Array<Record<string, unknown>>;
      };
      expect(persisted.items[0]['password']).toBe('[REDACTED]');
      expect(persisted.items[1]['refreshToken']).toBe('[REDACTED]');
      expect(persisted.items[0]['name']).toBe('alice');
    });

    it('does not alter non-sensitive fields in a mixed payload', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(
        pool,
        basePayload({
          payload: {
            source: 'web',
            ip: '1.2.3.4',
            password: 'bad_idea',
          },
        }),
        'auth.actionTaken'
      );

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      const persisted = JSON.parse(params[10] as string) as Record<string, unknown>;
      expect(persisted['source']).toBe('web');
      expect(persisted['ip']).toBe('1.2.3.4');
      expect(persisted['password']).toBe('[REDACTED]');
    });

    it('persists an absent payload as "{}" after redaction', async () => {
      const { pool, query } = makePool();
      await persistAuditEvent(pool, basePayload({ payload: undefined }), 'auth.actionTaken');

      const [, params] = query.mock.calls[0] as [string, unknown[]];
      expect(params[10]).toBe('{}');
    });
  });

  it('treats a redelivered event as idempotent (ON CONFLICT DO NOTHING)', async () => {
    // The mock doesn't actually enforce the constraint, but the SQL
    // clause is what guarantees idempotency in production. This test
    // pins the contract.
    const { pool, query } = makePool();
    const payload = basePayload();
    await persistAuditEvent(pool, payload, 'auth.actionTaken');
    await persistAuditEvent(pool, payload, 'auth.actionTaken');

    expect(query).toHaveBeenCalledTimes(2);
    const sql = (query.mock.calls[0] as [string, unknown[]])[0];
    expect(sql).toContain('ON CONFLICT (event_id) DO NOTHING');
  });
});
