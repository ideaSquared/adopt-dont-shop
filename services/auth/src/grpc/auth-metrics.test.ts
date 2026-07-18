// Tests for auth domain metrics (ADS-803).
//
// Verifies that login, registration, and token-refresh outcomes are correctly
// counted. Each test drives a real handler invocation (with mocked deps) and
// then reads the counter values directly from the metrics registry.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMetricsForTest, getMetricsRegistry } from '@adopt-dont-shop/observability';

import { login, refreshToken, type HandlerDeps, type MintedTokens } from './handlers.js';
import { register } from './account-handlers.js';
import { __resetAuthMetricsForTest } from './auth-metrics.js';

// --- Shared fixtures --------------------------------------------------------

function userRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'usr-test',
    email: 'test@example.com',
    password: '$2b$10$hash',
    first_name: 'Test',
    last_name: 'User',
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
    city: null,
    last_login_at: null,
    locked_until: null,
    login_attempts: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function mintedFixture(): MintedTokens {
  return {
    pair: {
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      accessExpiresAt: '2026-07-01T00:00:00Z',
      refreshExpiresAt: '2026-08-01T00:00:00Z',
    },
    accessJti: 'acc-jti',
    accessExpiresAt: new Date('2026-07-01T00:00:00Z'),
    refreshJti: 'ref-jti',
    refreshExpiresAt: new Date('2026-08-01T00:00:00Z'),
  };
}

function makeMocks() {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const nats = {
    jetstream: () => ({ publish: vi.fn() }),
    publish: vi.fn(),
  };
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
    hasherMock: passwordHasher,
    issuerMock: tokenIssuer,
  };
}

async function readCounter(name: string, labels: Record<string, string>): Promise<number> {
  const registry = getMetricsRegistry();
  const metrics = await registry.getMetricsAsJSON();
  const metric = metrics.find(m => m.name === name);
  if (!metric) return 0;
  const value = (metric.values as Array<{ labels: Record<string, string>; value: number }>).find(
    v => Object.entries(labels).every(([k, lv]) => v.labels[k] === lv)
  );
  return value?.value ?? 0;
}

// --- Login metrics ----------------------------------------------------------

describe('auth_logins_total counter', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    __resetAuthMetricsForTest();
    __resetMetricsForTest();
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('increments success on a valid login', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] }); // user lookup
    mocks.hasherMock.compare.mockResolvedValue(true);
    mocks.issuerMock.mint.mockResolvedValue(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] }); // BEGIN + INSERT + UPDATE + COMMIT
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }) // user_type (loadPrincipal)
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [] }); // permissions

    await login(mocks.deps, null, { email: 'test@example.com', password: 'hunter2' });

    expect(await readCounter('auth_logins_total', { outcome: 'success' })).toBe(1);
    expect(await readCounter('auth_logins_total', { outcome: 'invalid_credentials' })).toBe(0);
  });

  it('increments invalid_credentials when user is not found', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.hasherMock.compare.mockResolvedValue(false);

    await expect(
      login(mocks.deps, null, { email: 'nobody@example.com', password: 'wrong' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(await readCounter('auth_logins_total', { outcome: 'invalid_credentials' })).toBe(1);
    expect(await readCounter('auth_logins_total', { outcome: 'success' })).toBe(0);
  });

  it('increments invalid_credentials on wrong password', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [userRowFixture()] })
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE login_attempts
    mocks.hasherMock.compare.mockResolvedValue(false);

    await expect(
      login(mocks.deps, null, { email: 'test@example.com', password: 'wrong' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(await readCounter('auth_logins_total', { outcome: 'invalid_credentials' })).toBe(1);
  });

  it('increments account_locked when locked_until is in the future and the password is correct', async () => {
    const locked_until = new Date(Date.now() + 60_000);
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture({ locked_until })] });
    // Account state (ADS-966) is only revealed once the password checks out.
    mocks.hasherMock.compare.mockResolvedValue(true);

    await expect(
      login(mocks.deps, null, { email: 'test@example.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    expect(await readCounter('auth_logins_total', { outcome: 'account_locked' })).toBe(1);
  });

  it('increments account_suspended for a suspended account with a correct password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture({ status: 'suspended' })] });
    mocks.hasherMock.compare.mockResolvedValue(true);

    await expect(
      login(mocks.deps, null, { email: 'test@example.com', password: 'pw' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    expect(await readCounter('auth_logins_total', { outcome: 'account_suspended' })).toBe(1);
  });
});

// --- Registration metrics ---------------------------------------------------

describe('auth_registrations_total counter', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    __resetAuthMetricsForTest();
    __resetMetricsForTest();
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('increments success on a new registration', async () => {
    mocks.hasherMock.hash.mockResolvedValue('$2b$hashed');
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // no existing user
    // withTransaction calls BEGIN, INSERT RETURNING, COMMIT on the transactional client
    mocks.clientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [userRowFixture({ user_id: 'usr-new' })] }) // INSERT RETURNING
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await register(mocks.deps, null, {
      email: 'new@example.com',
      password: 'securepassword',
      firstName: 'New',
      lastName: 'User',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    expect(await readCounter('auth_registrations_total', { outcome: 'success' })).toBe(1);
    expect(await readCounter('auth_registrations_total', { outcome: 'duplicate_email' })).toBe(0);
  });

  it('increments duplicate_email when email already exists', async () => {
    mocks.hasherMock.hash.mockResolvedValue('$2b$hashed');
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // existing user

    await register(mocks.deps, null, {
      email: 'existing@example.com',
      password: 'securepassword',
      firstName: 'Existing',
      lastName: 'User',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    expect(await readCounter('auth_registrations_total', { outcome: 'duplicate_email' })).toBe(1);
    expect(await readCounter('auth_registrations_total', { outcome: 'success' })).toBe(0);
  });

  it('increments invalid_input on missing name fields', async () => {
    await expect(
      register(mocks.deps, null, {
        email: 'valid@example.com',
        password: 'securepassword',
        firstName: '',
        lastName: '',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });

    expect(await readCounter('auth_registrations_total', { outcome: 'invalid_input' })).toBe(1);
  });

  it('increments invalid_input on short password', async () => {
    await expect(
      register(mocks.deps, null, {
        email: 'valid@example.com',
        password: 'short',
        firstName: 'A',
        lastName: 'B',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });

    expect(await readCounter('auth_registrations_total', { outcome: 'invalid_input' })).toBe(1);
  });
});

// --- Token refresh metrics --------------------------------------------------

describe('auth_token_refreshes_total counter', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    __resetAuthMetricsForTest();
    __resetMetricsForTest();
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('increments success on a valid token rotation', async () => {
    const claims = { sub: 'usr-test', jti: 'old-jti', iat: 1700000000, exp: 1800000000 };
    mocks.issuerMock.verifyRefresh.mockResolvedValue(claims);
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // denylist check — not denied
      .mockResolvedValueOnce({
        rows: [
          {
            token: 'refresh.jwt',
            user_id: 'usr-test',
            family_id: 'fam-1',
            expires_at: new Date(Date.now() + 86400_000),
            revoked_at: null,
            is_revoked: false,
          },
        ],
      }) // stored refresh row — active
      .mockResolvedValueOnce({ rows: [{ status: 'active', tokens_valid_from: null }] }); // assertActiveUser
    mocks.clientMock.query
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE refresh_tokens (rotation gate)
      .mockResolvedValueOnce({ rows: [] }) // INSERT revoked_tokens
      .mockResolvedValueOnce({ rows: [] }); // INSERT new refresh_tokens
    mocks.issuerMock.mint.mockResolvedValue(mintedFixture());

    await refreshToken(mocks.deps, null, { refreshToken: 'refresh.jwt' });

    expect(await readCounter('auth_token_refreshes_total', { outcome: 'success' })).toBe(1);
    expect(await readCounter('auth_token_refreshes_total', { outcome: 'invalid_token' })).toBe(0);
  });

  it('increments invalid_token when the JWT is malformed/expired', async () => {
    mocks.issuerMock.verifyRefresh.mockRejectedValue(new Error('jwt malformed'));

    await expect(
      refreshToken(mocks.deps, null, { refreshToken: 'bad.token' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(await readCounter('auth_token_refreshes_total', { outcome: 'invalid_token' })).toBe(1);
  });

  it('increments token_revoked when the jti is on the denylist', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValue({
      sub: 'usr-test',
      jti: 'revoked-jti',
      iat: 1700000000,
      exp: 1800000000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ jti: 'revoked-jti' }] }); // denylist hit

    await expect(
      refreshToken(mocks.deps, null, { refreshToken: 'revoked.jwt' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(await readCounter('auth_token_refreshes_total', { outcome: 'token_revoked' })).toBe(1);
  });

  it('increments concurrent_reuse when the rotation gate detects a race', async () => {
    const claims = { sub: 'usr-test', jti: 'jti-1', iat: 1700000000, exp: 1800000000 };
    mocks.issuerMock.verifyRefresh.mockResolvedValue(claims);
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // denylist — not denied
      .mockResolvedValueOnce({
        rows: [
          {
            token: 'refresh.jwt',
            user_id: 'usr-test',
            family_id: 'fam-1',
            expires_at: new Date(Date.now() + 86400_000),
            revoked_at: null,
            is_revoked: false,
          },
        ],
      }) // stored row — still looks active
      .mockResolvedValueOnce({ rows: [{ status: 'active', tokens_valid_from: null }] }); // assertActiveUser
    mocks.issuerMock.mint.mockResolvedValue(mintedFixture());
    // withTransaction: BEGIN, then UPDATE rotation gate returns rowCount 0 (race), then COMMIT
    mocks.clientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE — gate fails (concurrent reuse)
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await expect(
      refreshToken(mocks.deps, null, { refreshToken: 'refresh.jwt' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(await readCounter('auth_token_refreshes_total', { outcome: 'concurrent_reuse' })).toBe(
      1
    );
  });
});
