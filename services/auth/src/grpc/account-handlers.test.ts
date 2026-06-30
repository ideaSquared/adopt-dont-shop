import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import {
  changePassword,
  forgotPassword,
  provisionInvitedUser,
  redeemInvitation,
  register,
  resendVerification,
  resetPassword,
  updateAccount,
  verifyEmail,
} from './account-handlers.js';
import { HandlerError, type HandlerDeps } from './handlers.js';

function userRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'usr-1',
    email: 'a@example.com',
    password: '$2b$10$existing-hash',
    first_name: 'Alex',
    last_name: 'Jenkinson',
    email_verified: false,
    phone_verified: false,
    two_factor_enabled: false,
    status: 'pending_verification',
    user_type: 'adopter',
    profile_image_url: null,
    bio: null,
    timezone: 'UTC',
    language: 'en',
    country: 'GB',
    city: 'London',
    last_login_at: null,
    locked_until: null,
    login_attempts: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// Make client.query swallow BEGIN/COMMIT/ROLLBACK so the test only
// scripts returns for the "real" queries the handler issues.
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
  const client = {
    query: c.fn,
    release: vi.fn(),
  };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [] });
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const passwordHasher = { compare: vi.fn(), hash: vi.fn() };
  const tokenIssuer = { mint: vi.fn(), verifyAccess: vi.fn(), verifyRefresh: vi.fn() };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher,
    tokenIssuer,
  };
  return {
    deps,
    poolMock: pool,
    clientMock: client,
    clientScript: c.script,
    hasherMock: passwordHasher,
    issuerMock: tokenIssuer,
    natsMock: nats,
  };
}

// Filter out BEGIN/COMMIT/ROLLBACK calls so test assertions about the
// "first real query" aren't off-by-one.
function realQueries(mock: { mock: { calls: unknown[][] } }): unknown[][] {
  return mock.mock.calls.filter(c => {
    const sql = String(c[0]);
    return sql !== 'BEGIN' && sql !== 'COMMIT' && sql !== 'ROLLBACK';
  });
}

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

const REGISTER_REQ = {
  email: 'new@example.com',
  password: 'hunter22',
  firstName: 'Jo',
  lastName: 'Bloggs',
  termsAccepted: true,
  privacyPolicyAccepted: true,
} as Parameters<typeof register>[2];

describe('register', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects when email is invalid', async () => {
    await expect(
      register(mocks.deps, null, { ...REGISTER_REQ, email: 'nope' })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects when password is too short', async () => {
    await expect(
      register(mocks.deps, null, { ...REGISTER_REQ, password: 'short' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when terms / privacy not accepted', async () => {
    await expect(
      register(mocks.deps, null, { ...REGISTER_REQ, termsAccepted: false })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      register(mocks.deps, null, { ...REGISTER_REQ, privacyPolicyAccepted: false })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('does NOT leak that an email is already registered (enumeration-safe)', async () => {
    // Existing-email pre-check returns a row.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await register(mocks.deps, null, REGISTER_REQ);

    // Uniform response — no error, no tokens, no user. Identical to a fresh
    // signup, so the caller can't tell the email exists.
    expect(res).toEqual({ permissions: [] });
    // Still hashes (uniform timing) but never inserts or mints tokens.
    expect(mocks.hasherMock.hash).toHaveBeenCalled();
    expect(realQueries(mocks.clientMock.query)).toEqual([]);
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('creates a pending-verification user, publishes, and issues NO tokens', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // uniqueness check — free
    mocks.hasherMock.hash.mockResolvedValueOnce('$2b$12$new-hash');
    const created = userRowFixture({ user_id: 'usr-new', email: 'new@example.com' });
    mocks.clientScript([created]); // INSERT

    const res = await register(mocks.deps, null, REGISTER_REQ);

    // Verification-first: uniform response, no tokens, no auto-login.
    expect(res).toEqual({ permissions: [] });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();

    expect(mocks.hasherMock.hash).toHaveBeenCalledWith('hunter22');
    const insertCall = realQueries(mocks.clientMock.query)[0];
    expect(insertCall[0]).toContain('INSERT INTO auth.users');
    expect(insertCall[0]).toContain("'pending_verification'");
    expect(insertCall[1]).toContain('$2b$12$new-hash');
    // Publishes the verification event so the email is sent.
    expect(mocks.natsMock.publish).toHaveBeenCalled();
  });

  it('returns the uniform response on a unique-violation race (no leak)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // pre-check: free
    // INSERT races a concurrent register → Postgres unique violation.
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    });

    const res = await register(mocks.deps, null, REGISTER_REQ);
    expect(res).toEqual({ permissions: [] });
  });
});

describe('provisionInvitedUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  const PROVISION_REQ = {
    email: 'invitee@example.com',
    password: 'hunter22',
    firstName: 'Jo',
    lastName: 'Bloggs',
  } as Parameters<typeof provisionInvitedUser>[2];

  it('rejects an invalid email', async () => {
    await expect(
      provisionInvitedUser(mocks.deps, null, { ...PROVISION_REQ, email: 'nope' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a short password', async () => {
    await expect(
      provisionInvitedUser(mocks.deps, null, { ...PROVISION_REQ, password: 'short' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects missing names', async () => {
    await expect(
      provisionInvitedUser(mocks.deps, null, { ...PROVISION_REQ, firstName: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('attaches an existing account without creating a new row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ user_id: 'usr-existing', email: 'invitee@example.com' })],
    });

    const res = await provisionInvitedUser(mocks.deps, null, PROVISION_REQ);

    expect(res.created).toBe(false);
    expect(res.user?.userId).toBe('usr-existing');
    // No INSERT — the transaction client was never used.
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.hasherMock.hash).not.toHaveBeenCalled();
  });

  it('creates a verified active rescue_staff user for a new email', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // no existing
    mocks.hasherMock.hash.mockResolvedValue('$2b$10$hashed');
    mocks.clientScript([
      userRowFixture({
        user_id: 'usr-new',
        email: 'invitee@example.com',
        email_verified: true,
        status: 'active',
        user_type: 'rescue_staff',
      }),
    ]);

    const res = await provisionInvitedUser(mocks.deps, null, PROVISION_REQ);

    expect(res.created).toBe(true);
    expect(res.user?.userId).toBe('usr-new');
    expect(res.user?.emailVerified).toBe(true);
    const insertSql = String(realQueries(mocks.clientMock.query)[0][0]);
    expect(insertSql).toContain('INSERT INTO auth.users');
    expect(mocks.natsMock.publish).toHaveBeenCalled();
  });

  it('attaches the raced row on a unique-violation', async () => {
    // No existing on the first check, INSERT races a 23505, then the
    // re-select finds the row the concurrent caller created.
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [userRowFixture({ user_id: 'usr-raced' })] });
    mocks.hasherMock.hash.mockResolvedValue('$2b$10$hashed');
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      throw Object.assign(new Error('duplicate key'), { code: '23505' });
    });

    const res = await provisionInvitedUser(mocks.deps, null, PROVISION_REQ);

    expect(res.created).toBe(false);
    expect(res.user?.userId).toBe('usr-raced');
  });
});

describe('verifyEmail', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects when token is missing', async () => {
    await expect(verifyEmail(mocks.deps, null, { verificationToken: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('flips email_verified + status when the token matches', async () => {
    const updated = userRowFixture({ email_verified: true, status: 'active' });
    mocks.clientScript([updated]);
    const res = await verifyEmail(mocks.deps, null, { verificationToken: 'abc' });
    expect(res.user.emailVerified).toBe(true);
    const queries = realQueries(mocks.clientMock.query);
    const sql = queries[0][0] as string;
    expect(sql).toContain('verification_token_hash = $1');
  });

  it('hashes the verification token before DB lookup — raw token never reaches the query', async () => {
    const rawToken = 'raw-verification-token';
    mocks.clientScript([userRowFixture({ email_verified: true, status: 'active' })]);
    await verifyEmail(mocks.deps, null, { verificationToken: rawToken });
    const queries = realQueries(mocks.clientMock.query);
    const params = queries[0][1] as unknown[];
    expect(params[0]).not.toBe(rawToken);
    expect(params[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws INVALID_ARGUMENT for an unknown/expired token', async () => {
    mocks.clientScript([]);
    await expect(
      verifyEmail(mocks.deps, null, { verificationToken: 'expired' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

describe('resendVerification', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('always returns ok (does not leak existence)', async () => {
    mocks.clientScript([]);
    const res = await resendVerification(mocks.deps, null, { email: 'whoever@example.com' });
    expect(res.ok).toBe(true);
  });
});

describe('forgotPassword', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('always returns ok', async () => {
    mocks.clientScript([]);
    const res = await forgotPassword(mocks.deps, null, { email: 'whoever@example.com' });
    expect(res.ok).toBe(true);
  });

  it('mints a reset token + publishes when the email matches', async () => {
    const u = userRowFixture();
    mocks.clientScript([u]);
    const res = await forgotPassword(mocks.deps, null, { email: 'a@example.com' });
    expect(res.ok).toBe(true);
    const queries = realQueries(mocks.clientMock.query);
    const sql = queries[0][0] as string;
    expect(sql).toContain('SET reset_token_hash');
  });

  it('stores only the hash of the reset token — raw token never written to DB', async () => {
    mocks.clientScript([userRowFixture()]);
    await forgotPassword(mocks.deps, null, { email: 'a@example.com' });
    const queries = realQueries(mocks.clientMock.query);
    const params = queries[0][1] as unknown[];
    expect(params[0]).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('resetPassword', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects short passwords', async () => {
    await expect(
      resetPassword(mocks.deps, null, { resetToken: 'tok', newPassword: 'short' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when token does not match', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([]);
    await expect(
      resetPassword(mocks.deps, null, { resetToken: 'bad', newPassword: 'longenough' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('clears locked_until + login_attempts on success', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([userRowFixture()]);
    const res = await resetPassword(mocks.deps, null, {
      resetToken: 'tok',
      newPassword: 'longenough',
    });
    expect(res.ok).toBe(true);
    const sql = realQueries(mocks.clientMock.query)[0][0] as string;
    expect(sql).toContain('locked_until = NULL');
    expect(sql).toContain('login_attempts = 0');
    // Stamps the access-token revocation watermark.
    expect(sql).toContain('tokens_valid_from = now()');
  });

  it('hashes the reset token before DB lookup — raw token never reaches the query', async () => {
    const rawToken = 'raw-reset-token';
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([userRowFixture()]);
    await resetPassword(mocks.deps, null, { resetToken: rawToken, newPassword: 'longenough' });
    const queries = realQueries(mocks.clientMock.query);
    const params = queries[0][1] as unknown[];
    // $2 is the token parameter in the WHERE clause
    expect(params[1]).not.toBe(rawToken);
    expect(params[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('revokes all of the user’s refresh tokens (sessions) on reset', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([userRowFixture()]);
    await resetPassword(mocks.deps, null, { resetToken: 'tok', newPassword: 'longenough' });
    const revoke = realQueries(mocks.clientMock.query).find(
      q => /auth\.refresh_tokens/.test(String(q[0])) && /is_revoked = true/.test(String(q[0]))
    );
    expect(revoke).toBeDefined();
    expect(revoke?.[1]).toContain('usr-1');
  });
});

describe('redeemInvitation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects a missing token', async () => {
    await expect(
      redeemInvitation(mocks.deps, null, { invitationToken: '', newPassword: 'longenough' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects short passwords', async () => {
    await expect(
      redeemInvitation(mocks.deps, null, { invitationToken: 'tok', newPassword: 'short' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an invalid or expired invitation token', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([]); // invitation UPDATE matches nothing
    await expect(
      redeemInvitation(mocks.deps, null, { invitationToken: 'bad', newPassword: 'longenough' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('sets the password, activates the account, and returns the user on success', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([{ user_id: 'usr-1' }]); // invitation UPDATE
    mocks.clientScript([userRowFixture({ status: 'active', email_verified: true })]); // users UPDATE
    const res = await redeemInvitation(mocks.deps, null, {
      invitationToken: 'tok',
      newPassword: 'longenough',
    });
    expect(res.user?.userId).toBe('usr-1');
    const queries = realQueries(mocks.clientMock.query);
    expect(String(queries[0][0])).toContain('auth.user_invitations');
    expect(String(queries[0][0])).toContain("status = 'accepted'");
    expect(String(queries[1][0])).toContain('auth.users');
    expect(String(queries[1][0])).toContain("status = 'active'");
    expect(String(queries[1][0])).toContain('email_verified = true');
  });

  it('hashes the incoming token before querying — never compares it raw', async () => {
    mocks.hasherMock.hash.mockResolvedValueOnce('hash');
    mocks.clientScript([{ user_id: 'usr-1' }]);
    mocks.clientScript([userRowFixture()]);
    await redeemInvitation(mocks.deps, null, {
      invitationToken: 'raw-token',
      newPassword: 'longenough',
    });
    const queries = realQueries(mocks.clientMock.query);
    const params = queries[0][1] as unknown[];
    expect(params[0]).not.toBe('raw-token');
    expect(params[0]).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('changePassword', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects unauthenticated', async () => {
    await expect(
      changePassword(mocks.deps, null, { currentPassword: 'x', newPassword: 'longenough' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('rejects when current password is wrong', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ password: 'existing-hash' }] });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    await expect(
      changePassword(mocks.deps, PRINCIPAL, {
        currentPassword: 'wrong',
        newPassword: 'longenough',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('hashes + updates when current password matches', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ password: 'existing-hash' }] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.hasherMock.hash.mockResolvedValueOnce('new-hash');
    const res = await changePassword(mocks.deps, PRINCIPAL, {
      currentPassword: 'right',
      newPassword: 'longenough',
    });
    expect(res.ok).toBe(true);
    expect(realQueries(mocks.clientMock.query)[0][1]).toContain('new-hash');
    // Stamps the access-token revocation watermark.
    expect(String(realQueries(mocks.clientMock.query)[0][0])).toContain(
      'tokens_valid_from = now()'
    );
  });

  it('revokes all of the user’s refresh tokens (sessions) on change', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ password: 'existing-hash' }] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.hasherMock.hash.mockResolvedValueOnce('new-hash');
    await changePassword(mocks.deps, PRINCIPAL, {
      currentPassword: 'right',
      newPassword: 'longenough',
    });
    const revoke = realQueries(mocks.clientMock.query).find(
      q => /auth\.refresh_tokens/.test(String(q[0])) && /is_revoked = true/.test(String(q[0]))
    );
    expect(revoke).toBeDefined();
    expect(revoke?.[1]).toContain('usr-1');
  });
});

describe('updateAccount', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects unauthenticated', async () => {
    await expect(updateAccount(mocks.deps, null, {})).rejects.toBeInstanceOf(HandlerError);
  });

  it('returns the current row when nothing is supplied', async () => {
    const u = userRowFixture();
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [u] });
    const res = await updateAccount(mocks.deps, PRINCIPAL, {});
    expect(res.user.userId).toBe(u.user_id);
  });

  it('updates only the supplied fields', async () => {
    const updated = userRowFixture({ first_name: 'Joey', timezone: 'Europe/London' });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [updated] });
    const res = await updateAccount(mocks.deps, PRINCIPAL, {
      firstName: 'Joey',
      timezone: 'Europe/London',
    });
    expect(res.user.firstName).toBe('Joey');
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    expect(sql).toContain('first_name = $1');
    expect(sql).toContain('timezone = $2');
    expect(sql).not.toContain('last_name');
  });
});
