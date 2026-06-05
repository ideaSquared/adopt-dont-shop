import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { AuthV1, type LoginRequest } from '@adopt-dont-shop/proto';

import {
  assignRole,
  getMe,
  HandlerError,
  login,
  logout,
  refreshToken,
  validateToken,
  type HandlerDeps,
  type MintedTokens,
} from './handlers.js';

// --- Fixtures --------------------------------------------------------

const ADOPTER_PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

const ADMIN_PRINCIPAL: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: ['admin.security.manage' as Permission],
};

const SUPER_ADMIN_PRINCIPAL: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

function userRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'usr-adopter',
    email: 'alex@example.com',
    password: '$2b$10$hash',
    first_name: 'Alex',
    last_name: 'Jenkinson',
    email_verified: true,
    phone_verified: false,
    two_factor_enabled: false,
    status: 'active',
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

function mintedFixture(overrides: Partial<MintedTokens> = {}): MintedTokens {
  return {
    pair: {
      accessToken: 'access.jwt.token',
      refreshToken: 'refresh.jwt.token',
      accessExpiresAt: '2026-06-05T17:30:00Z',
      refreshExpiresAt: '2026-07-05T17:00:00Z',
    },
    accessJti: 'access-jti',
    accessExpiresAt: new Date('2026-06-05T17:30:00Z'),
    refreshJti: 'refresh-jti',
    refreshExpiresAt: new Date('2026-07-05T17:00:00Z'),
    ...overrides,
  };
}

function makeMocks() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const nats = {
    publish: vi.fn(),
  };
  const passwordHasher = {
    compare: vi.fn(),
  };
  const tokenIssuer = {
    mint: vi.fn(),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
  };
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
    natsMock: nats,
    hasherMock: passwordHasher,
    issuerMock: tokenIssuer,
  };
}

const BASE_LOGIN_REQ: LoginRequest = {
  email: 'alex@example.com',
  password: 'hunter2',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
};

// --- login -----------------------------------------------------------

describe('login', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when email is missing — INVALID_ARGUMENT', async () => {
    await expect(login(mocks.deps, null, { ...BASE_LOGIN_REQ, email: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects when password is missing — INVALID_ARGUMENT', async () => {
    await expect(
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, password: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns UNAUTHENTICATED on unknown email', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('returns PERMISSION_DENIED when account is locked', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ locked_until: new Date(Date.now() + 60_000) })],
    });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns PERMISSION_DENIED when account is suspended', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ status: 'suspended' })],
    });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns UNAUTHENTICATED on wrong password and increments login_attempts', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // bump

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    const bumpCall = mocks.poolMock.query.mock.calls[1][0] as string;
    expect(bumpCall).toMatch(/UPDATE auth\.users.*login_attempts = login_attempts \+ 1/s);
  });

  it('mints tokens, persists refresh row inside transaction, publishes auth.userLoggedIn AFTER commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const callOrder: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      const verb = sql.trim().split(/\s+/)[0];
      callOrder.push(verb);
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => {
      callOrder.push('NATS_PUBLISH');
    });

    // After-commit principal load — 2 queries.
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }) // user_type
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] }); // perms

    const res = await login(mocks.deps, null, BASE_LOGIN_REQ);

    expect(res.tokens.accessToken).toBe('access.jwt.token');
    expect(res.user.email).toBe('alex@example.com');
    expect(res.permissions).toContain('pets.read');

    // BEGIN → INSERT → UPDATE → COMMIT → NATS_PUBLISH
    expect(callOrder).toEqual(['BEGIN', 'INSERT', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
  });
});

// --- logout ----------------------------------------------------------

describe('logout', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects empty refresh_token — INVALID_ARGUMENT', async () => {
    await expect(logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: '' })).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT' }
    );
  });

  it('returns {revoked:false} OK when token is malformed/expired (idempotent)', async () => {
    mocks.issuerMock.verifyRefresh.mockRejectedValueOnce(new Error('expired'));
    const res = await logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: 'bad' });
    expect(res.revoked).toBe(false);
  });

  it('returns {revoked:true} without re-publishing when jti is already denylisted', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'jti-1',
      iat: 0,
      exp: Math.floor(Date.now() / 1000) + 1000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ jti: 'jti-1' }] });

    const res = await logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: 'token' });
    expect(res.revoked).toBe(true);
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('inserts denylist row + revokes refresh row + publishes after commit', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'jti-1',
      iat: 0,
      exp: Math.floor(Date.now() / 1000) + 1000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // not denylisted

    const callOrder: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      callOrder.push(sql.trim().split(/\s+/)[0]);
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => {
      callOrder.push('NATS_PUBLISH');
    });

    const res = await logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: 'token' });
    expect(res.revoked).toBe(true);
    expect(callOrder).toEqual(['BEGIN', 'INSERT', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
  });
});

// --- refreshToken ----------------------------------------------------

describe('refreshToken', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('UNAUTHENTICATED on invalid refresh JWT', async () => {
    mocks.issuerMock.verifyRefresh.mockRejectedValueOnce(new Error('bad sig'));
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'bad' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('UNAUTHENTICATED when the jti is denylisted', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'u',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ jti: 'j' }] });
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('UNAUTHENTICATED when the stored refresh row is already revoked', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'u',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [{ token: 'tok', revoked_at: new Date() }] });
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rotates tokens and publishes auth.tokenRefreshed', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [{ token: 'tok', user_id: 'usr-1', revoked_at: null }] });
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const calls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      calls.push(sql.trim().split(/\s+/)[0]);
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => {
      calls.push('NATS_PUBLISH');
    });

    const res = await refreshToken(mocks.deps, null, { refreshToken: 'tok' });
    expect(res.tokens.accessToken).toBe('access.jwt.token');
    // BEGIN → UPDATE old refresh → INSERT denylist → INSERT new refresh → COMMIT → NATS_PUBLISH
    expect(calls).toEqual(['BEGIN', 'UPDATE', 'INSERT', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });
});

// --- validateToken ---------------------------------------------------

describe('validateToken', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('UNAUTHENTICATED on invalid JWT (no DB touch)', async () => {
    mocks.issuerMock.verifyAccess.mockRejectedValueOnce(new Error('bad sig'));
    await expect(validateToken(mocks.deps, null, { accessToken: 'bad' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('UNAUTHENTICATED when the jti is denylisted', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'u',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ jti: 'j' }] });
    await expect(validateToken(mocks.deps, null, { accessToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('returns the hydrated principal on a valid token', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [{ user_type: 'rescue_staff' }] }) // primary role
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }, { name: 'pets.update' }] });

    const res = await validateToken(mocks.deps, null, { accessToken: 'tok' });
    expect(res.principal.userId).toBe('usr-1');
    expect(res.principal.roles).toEqual([AuthV1.UserRole.USER_ROLE_RESCUE_STAFF]);
    expect(res.principal.permissions).toEqual(['pets.read', 'pets.update']);
    expect(res.expiresAt).toBe(new Date(9_000_000_000 * 1000).toISOString());
  });
});

// --- getMe -----------------------------------------------------------

describe('getMe', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('NOT_FOUND when the user row is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getMe(mocks.deps, ADOPTER_PRINCIPAL, {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns the user + roles + permissions', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [userRowFixture()] })
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'notifications.read' }] });

    const res = await getMe(mocks.deps, ADOPTER_PRINCIPAL, {});
    expect(res.user.email).toBe('alex@example.com');
    expect(res.roles).toContain(AuthV1.UserRole.USER_ROLE_ADOPTER);
    expect(res.permissions).toContain('notifications.read');
  });
});

// --- assignRole ------------------------------------------------------

describe('assignRole', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('INVALID_ARGUMENT when target_user_id is missing', async () => {
    await expect(
      assignRole(mocks.deps, ADMIN_PRINCIPAL, {
        targetUserId: '',
        role: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('INVALID_ARGUMENT when role is UNSPECIFIED', async () => {
    await expect(
      assignRole(mocks.deps, ADMIN_PRINCIPAL, {
        targetUserId: 'usr-1',
        role: AuthV1.UserRole.USER_ROLE_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED when caller lacks admin.security.manage', async () => {
    await expect(
      assignRole(mocks.deps, ADOPTER_PRINCIPAL, {
        targetUserId: 'usr-1',
        role: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('super_admin bypasses the admin.security.manage check', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] }) // target exists
      .mockResolvedValueOnce({ rows: [{ role_id: 'role-1' }] }); // role exists
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    // After-commit role list
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'rescue_staff' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await assignRole(mocks.deps, SUPER_ADMIN_PRINCIPAL, {
      targetUserId: 'usr-1',
      role: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
    });
    expect(res.roles).toContain(AuthV1.UserRole.USER_ROLE_RESCUE_STAFF);
  });

  it('NOT_FOUND when the target user does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      assignRole(mocks.deps, ADMIN_PRINCIPAL, {
        targetUserId: 'ghost',
        role: AuthV1.UserRole.USER_ROLE_ADOPTER,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('upserts user_roles and publishes auth.roleAssigned after commit', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] })
      .mockResolvedValueOnce({ rows: [{ role_id: 'role-1' }] });

    const callOrder: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      callOrder.push(sql.trim().split(/\s+/)[0]);
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => {
      callOrder.push('NATS_PUBLISH');
    });

    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'rescue_staff' }] })
      .mockResolvedValueOnce({ rows: [] });

    await assignRole(mocks.deps, ADMIN_PRINCIPAL, {
      targetUserId: 'usr-1',
      role: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
      reason: 'onboarding',
    });

    expect(callOrder).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });
});

describe('HandlerError', () => {
  it('carries the code on the instance', () => {
    const err = new HandlerError('NOT_FOUND', 'missing');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('missing');
  });
});
