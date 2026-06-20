import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import {
  adminListSessions,
  adminRevokeAllUserSessions,
  adminRevokeSession,
  listSessions,
  revokeSession,
} from './session-handlers.js';

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

const SECURITY_ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: ['admin.security.read' as Permission, 'admin.security.manage' as Permission],
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
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
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
    // Two UPDATEs: the refresh-token family, plus the user's access-token
    // revocation watermark.
    expect(realQueries(mocks.clientMock.query)).toEqual(['UPDATE', 'UPDATE']);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.sessionRevoked');
    // UPDATE targets the family, not just the single token.
    const updateCall = mocks.clientMock.query.mock.calls.find(c => {
      const sql = String(c[0]);
      return sql.includes('UPDATE') && sql.includes('refresh_tokens');
    });
    expect(updateCall?.[1]).toEqual(['fam-1']);
    // Sets BOTH revocation columns so the refresh path (which reads
    // revoked_at) also rejects a revoked session's tokens.
    expect(String(updateCall?.[0])).toMatch(/revoked_at = now\(\)/);
    expect(String(updateCall?.[0])).toMatch(/is_revoked = true/);
    // Stamps the access-token watermark on the user.
    const watermarkCall = mocks.clientMock.query.mock.calls.find(c => {
      const sql = String(c[0]);
      return sql.includes('UPDATE') && sql.includes('auth.users');
    });
    expect(watermarkCall?.[1]).toEqual(['usr-1']);
    expect(String(watermarkCall?.[0])).toMatch(/tokens_valid_from = now\(\)/);
  });
});

const ADMIN_SESSION_ROW = {
  token_id: 'tok-1',
  family_id: 'fam-1',
  user_id: 'usr-2',
  email: 'target@example.com',
  first_name: 'Target',
  last_name: 'User',
  expires_at: new Date('2026-12-31T00:00:00Z'),
  created_at: new Date('2026-06-01T00:00:00Z'),
};

describe('adminListSessions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects without admin.security.read', async () => {
    await expect(adminListSessions(mocks.deps, PRINCIPAL, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('lists sessions across all users with pagination', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [ADMIN_SESSION_ROW] });

    const res = await adminListSessions(mocks.deps, SECURITY_ADMIN, { page: 1, limit: 20 });
    expect(res.total).toBe(1);
    expect(res.sessions).toHaveLength(1);
    expect(res.sessions?.[0]).toMatchObject({
      sessionId: 'tok-1',
      userId: 'usr-2',
      email: 'target@example.com',
      firstName: 'Target',
    });
    // No user_id filter param when omitted.
    expect(mocks.poolMock.query.mock.calls[0][1]).toEqual([]);
  });

  it('filters to a single user when user_id is provided', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [ADMIN_SESSION_ROW] });

    await adminListSessions(mocks.deps, SECURITY_ADMIN, { userId: 'usr-2', page: 1, limit: 20 });
    expect(mocks.poolMock.query.mock.calls[0][1]).toEqual(['usr-2']);
    expect(mocks.poolMock.query.mock.calls[1][1]).toEqual(['usr-2', 20, 0]);
  });
});

describe('adminRevokeSession', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects without admin.security.manage', async () => {
    await expect(
      adminRevokeSession(mocks.deps, PRINCIPAL, { sessionId: 'tok-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns NOT_FOUND for an unknown session id, regardless of owner', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      adminRevokeSession(mocks.deps, SECURITY_ADMIN, { sessionId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("revokes another user's session and publishes auth.sessionRevokedByAdmin", async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ family_id: 'fam-1', user_id: 'usr-2', is_revoked: false }],
    });
    mocks.clientScript([]);

    const res = await adminRevokeSession(mocks.deps, SECURITY_ADMIN, { sessionId: 'tok-1' });
    expect(res.sessionId).toBe('tok-1');
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.sessionRevokedByAdmin');
    const watermarkCall = mocks.clientMock.query.mock.calls.find(c => {
      const sql = String(c[0]);
      return sql.includes('UPDATE') && sql.includes('auth.users');
    });
    expect(watermarkCall?.[1]).toEqual(['usr-2']);
  });
});

describe('adminRevokeAllUserSessions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects without admin.security.manage', async () => {
    await expect(
      adminRevokeAllUserSessions(mocks.deps, PRINCIPAL, { userId: 'usr-2' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns revoked_count 0 and skips the update when there are no active chains', async () => {
    mocks.clientScript([]);
    const res = await adminRevokeAllUserSessions(mocks.deps, SECURITY_ADMIN, { userId: 'usr-2' });
    expect(res.revokedCount).toBe(0);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('revokes every active chain and publishes auth.allSessionsRevokedByAdmin', async () => {
    mocks.clientScript([{ family_id: 'fam-1' }, { family_id: 'fam-2' }]);

    const res = await adminRevokeAllUserSessions(mocks.deps, SECURITY_ADMIN, { userId: 'usr-2' });
    expect(res.revokedCount).toBe(2);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.allSessionsRevokedByAdmin');
  });
});
