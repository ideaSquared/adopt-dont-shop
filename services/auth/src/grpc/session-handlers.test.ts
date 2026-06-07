import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import { listSessions, revokeSession } from './session-handlers.js';

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

function makeClientQuery(): { fn: ReturnType<typeof vi.fn>; script: (rows: unknown[]) => void } {
  const script: Array<{ rows: unknown[] }> = [];
  const fn = vi.fn().mockImplementation(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    return script.shift() ?? { rows: [] };
  });
  return { fn, script: rows => script.push({ rows }) };
}

function makeMocks() {
  const c = makeClientQuery();
  const client = { query: c.fn, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [] });
  const nats = { publish: vi.fn() };
  return {
    deps: {
      pool: pool as unknown as Pool,
      nats: nats as unknown as NatsConnection,
    },
    poolMock: pool,
    clientMock: client,
    clientScript: c.script,
    natsMock: nats,
  };
}

function realQueries(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls
    .filter(c => {
      const sql = String(c[0]);
      return sql !== 'BEGIN' && sql !== 'COMMIT' && sql !== 'ROLLBACK';
    })
    .map(c => String(c[0]).trim().split(/\s+/)[0].toUpperCase());
}

const SESSION_ROW = {
  token_id: 'tok-1',
  user_id: 'usr-1',
  family_id: 'fam-1',
  is_revoked: false,
  expires_at: new Date('2026-12-31T00:00:00Z'),
  replaced_by_token_id: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
};

describe('listSessions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns one entry per active family — self-scoped', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [SESSION_ROW, { ...SESSION_ROW, token_id: 'tok-2', family_id: 'fam-2' }],
    });

    const res = await listSessions(mocks.deps, PRINCIPAL, {});
    expect(res.sessions).toHaveLength(2);
    expect(res.sessions?.[0].sessionId).toBe('tok-1');
    expect(res.sessions?.[0].familyId).toBe('fam-1');
    expect(res.sessions?.[0].expiresAt).toBe('2026-12-31T00:00:00.000Z');
    expect(res.sessions?.[1].familyId).toBe('fam-2');
    // Query was always parameterized on principal.userId.
    expect(mocks.poolMock.query.mock.calls[0][1]).toEqual([PRINCIPAL.userId]);
  });

  it('returns an empty list when the principal has no active sessions', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    const res = await listSessions(mocks.deps, PRINCIPAL, {});
    expect(res.sessions).toEqual([]);
  });
});

describe('revokeSession', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects when session_id is missing', async () => {
    await expect(revokeSession(mocks.deps, PRINCIPAL, { sessionId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('returns NOT_FOUND when session does not exist for this user', async () => {
    // ownership check returns empty
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      revokeSession(mocks.deps, PRINCIPAL, { sessionId: 'tok-other' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is idempotent on already-revoked sessions — no NATS publish, returns id', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ family_id: 'fam-1', is_revoked: true }],
    });
    const res = await revokeSession(mocks.deps, PRINCIPAL, { sessionId: 'tok-1' });
    expect(res.sessionId).toBe('tok-1');
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('revokes the entire family + publishes auth.sessionRevoked after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ family_id: 'fam-1', is_revoked: false }],
    });
    // Inside withTransaction: one UPDATE.
    mocks.clientScript([]);

    const res = await revokeSession(mocks.deps, PRINCIPAL, { sessionId: 'tok-1' });
    expect(res.sessionId).toBe('tok-1');
    expect(realQueries(mocks.clientMock.query)).toEqual(['UPDATE']);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.sessionRevoked');
    // UPDATE targets the family, not just the single token.
    const updateCall = mocks.clientMock.query.mock.calls.find(c => {
      const sql = String(c[0]);
      return sql.includes('UPDATE') && sql.includes('refresh_tokens');
    });
    expect(updateCall?.[1]).toEqual(['fam-1']);
  });
});
