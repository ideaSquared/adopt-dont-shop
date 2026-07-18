import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSecret, generateSync } from 'otplib';

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
import { encryptTotpSecret } from './totp-crypto.js';

// --- Fixtures --------------------------------------------------------

const ENCRYPTION_KEY = 'a'.repeat(64);

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
    two_factor_secret: null,
    two_factor_last_step: null,
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
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = {
    publish: natsPublish,
    jetstream: () => ({ publish: natsPublish }),
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
    encryptionKey: ENCRYPTION_KEY,
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

  it('publishes a denied auth.actionTaken for an unknown email, with no actorUserId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'denied',
      actorEmailSnapshot: BASE_LOGIN_REQ.email,
      ipAddress: BASE_LOGIN_REQ.ipAddress,
      userAgent: BASE_LOGIN_REQ.userAgent,
    });
    expect(envelope.payload.actorUserId).toBeUndefined();
  });

  it('performs a password comparison even when the email is unknown (no enumeration timing leak)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    // The hasher must be exercised so a missing account costs the same
    // wall-clock time as a wrong password against a real account.
    expect(mocks.hasherMock.compare).toHaveBeenCalledTimes(1);
    expect(mocks.hasherMock.compare).toHaveBeenCalledWith(
      BASE_LOGIN_REQ.password,
      expect.any(String)
    );
  });

  // --- Account-state disclosure (ADS-966) -----------------------------
  //
  // Locked/suspended/deactivated state must only be revealed AFTER the
  // submitted password is verified correct. A wrong password against any
  // of these accounts must be indistinguishable from a wrong password
  // against a normal or unknown account.

  it('returns PERMISSION_DENIED when account is locked AND the password is correct', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ locked_until: new Date(Date.now() + 60_000) })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      message: 'account is temporarily locked',
    });

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'denied',
      actorUserId: 'usr-adopter',
      actorEmailSnapshot: BASE_LOGIN_REQ.email,
    });
  });

  it('returns PERMISSION_DENIED when account is suspended AND the password is correct', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ status: 'suspended' })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      message: 'account is suspended',
    });

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'denied',
      actorUserId: 'usr-adopter',
      actorEmailSnapshot: BASE_LOGIN_REQ.email,
    });
  });

  it('returns UNAUTHENTICATED "invalid credentials" (not PERMISSION_DENIED) when a locked account gets a wrong password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ locked_until: new Date(Date.now() + 60_000) })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'invalid credentials',
    });
  });

  it('returns UNAUTHENTICATED "invalid credentials" (not PERMISSION_DENIED) when a suspended account gets a wrong password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ status: 'suspended' })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'invalid credentials',
    });
  });

  it('returns UNAUTHENTICATED "invalid credentials" (not PERMISSION_DENIED) when a deactivated account gets a wrong password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ status: 'deactivated' })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'invalid credentials',
    });
  });

  it('the four wrong-password branches (unknown/locked/suspended/deactivated) return an identical error', async () => {
    const scenarios: Array<{ name: string; rows: unknown[] }> = [
      { name: 'unknown', rows: [] },
      { name: 'locked', rows: [userRowFixture({ locked_until: new Date(Date.now() + 60_000) })] },
      { name: 'suspended', rows: [userRowFixture({ status: 'suspended' })] },
      { name: 'deactivated', rows: [userRowFixture({ status: 'deactivated' })] },
    ];

    const errors: unknown[] = [];
    for (const scenario of scenarios) {
      const m = makeMocks();
      m.poolMock.query.mockResolvedValueOnce({ rows: scenario.rows });
      m.hasherMock.compare.mockResolvedValueOnce(false);
      m.clientMock.query.mockResolvedValue({ rows: [] });
      try {
        await login(m.deps, null, BASE_LOGIN_REQ);
        throw new Error(`expected login to reject for scenario ${scenario.name}`);
      } catch (err) {
        errors.push(err);
      }
    }

    for (const err of errors) {
      expect(err).toMatchObject({ code: 'UNAUTHENTICATED', message: 'invalid credentials' });
    }
  });

  it('returns UNAUTHENTICATED on wrong password and increments login_attempts', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.clientMock.query.mockResolvedValue({ rows: [] }); // bump, inside withTransaction

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    const bumpCall = mocks.clientMock.query.mock.calls
      .map(c => c[0] as string)
      .find(sql => /login_attempts = login_attempts \+ 1/.test(sql));
    expect(bumpCall).toBeDefined();

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'denied',
      actorUserId: 'usr-adopter',
      actorEmailSnapshot: 'alex@example.com',
    });
  });

  it('applies a progressive, capped soft-lock in the same failed-login UPDATE', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);
    mocks.clientMock.query.mockResolvedValue({ rows: [] }); // bump + lock

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    const [sql, params] = mocks.clientMock.query.mock.calls.find(([s]) =>
      /login_attempts = login_attempts \+ 1/.test(s as string)
    ) as [string, unknown[]];
    // The lock is set atomically in the same UPDATE, only once the count
    // crosses the threshold, and is capped — so a victim cannot be locked
    // out indefinitely by deliberate failed logins.
    expect(sql).toMatch(/locked_until = CASE/s);
    expect(sql).toMatch(/login_attempts \+ 1 >= \$2/s);
    expect(sql).toMatch(/LEAST\(/s);
    expect(params).toEqual(['usr-adopter', 5, 60, 900]);
  });

  it('clears login_attempts AND locked_until on a successful login', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    await login(mocks.deps, null, BASE_LOGIN_REQ);

    const resetCall = mocks.clientMock.query.mock.calls
      .map(c => c[0] as string)
      .find(s => /login_attempts = 0/.test(s));
    expect(resetCall).toBeDefined();
    expect(resetCall).toMatch(/locked_until = NULL/);
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

    // BEGIN → INSERT → UPDATE → COMMIT → NATS_PUBLISH (userLoggedIn) →
    // NATS_PUBLISH (actionTaken) — both staged events publish after commit.
    expect(callOrder).toEqual([
      'BEGIN',
      'INSERT',
      'UPDATE',
      'COMMIT',
      'NATS_PUBLISH',
      'NATS_PUBLISH',
    ]);
  });

  it('persists a SHA-256 hash of the refresh token, never the raw value (ADS-884)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    await login(mocks.deps, null, BASE_LOGIN_REQ);

    const insertCall = mocks.clientMock.query.mock.calls.find(c =>
      (c[0] as string).includes('INSERT INTO auth.refresh_tokens')
    );
    expect(insertCall).toBeDefined();
    const [sql, params] = insertCall as [string, unknown[]];
    expect(sql).toMatch(/token_hash/);
    expect(sql).not.toMatch(/\btoken\b(?!_hash)/);
    expect(params).not.toContain('refresh.jwt.token');
    // SHA-256("refresh.jwt.token") in hex.
    expect(params).toContain('4aae24fd4386389145fbd132ee4c5946e5ec5688261796cab855a58cc94ee74b');
  });

  it('publishes a successful auth.actionTaken alongside auth.userLoggedIn', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    await login(mocks.deps, null, BASE_LOGIN_REQ);

    const actionTakenCall = mocks.natsMock.publish.mock.calls.find(
      c => c[0] === 'auth.actionTaken'
    );
    expect(actionTakenCall).toBeDefined();
    const envelope = JSON.parse(new TextDecoder().decode(actionTakenCall![1] as Uint8Array));
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'success',
      actorUserId: 'usr-adopter',
      actorEmailSnapshot: 'alex@example.com',
      ipAddress: BASE_LOGIN_REQ.ipAddress,
      userAgent: BASE_LOGIN_REQ.userAgent,
    });
  });

  // --- Two-factor enforcement ----------------------------------------

  it('asks for the second factor (no tokens) when 2FA is on and no code is given', async () => {
    const secret = generateSecret();
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, secret),
        }),
      ],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);

    const res = await login(mocks.deps, null, BASE_LOGIN_REQ);

    expect(res.twoFactorRequired).toBe(true);
    expect(res.tokens).toBeUndefined();
    expect(res.user).toBeUndefined();
    // No token was minted — the login is not complete yet.
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('rejects a wrong 2FA code with UNAUTHENTICATED', async () => {
    const secret = generateSecret();
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, secret),
        }),
      ],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);

    await expect(
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, twoFactorToken: '000000' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({ action: 'login', outcome: 'denied' });
  });

  it('completes the login when a valid 2FA code is supplied', async () => {
    const secret = generateSecret();
    const code = generateSync({ secret });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, secret),
        }),
      ],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      // Replay-guard UPDATE (two_factor_last_step) fired by verifyAndConsumeTotp.
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const res = await login(mocks.deps, null, { ...BASE_LOGIN_REQ, twoFactorToken: code });

    expect(res.twoFactorRequired).toBe(false);
    expect(res.tokens?.accessToken).toBe('access.jwt.token');
    expect(mocks.issuerMock.mint).toHaveBeenCalledTimes(1);
  });

  it('rejects a replayed 2FA code on a second login attempt (ADS-914c)', async () => {
    // Pin the clock so the code's time step and the "already accepted"
    // step below can't drift apart at a 30s window boundary (flake guard).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const code = generateSync({ secret });
      const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
      const timeStep = Math.floor(Date.now() / 1000 / 30);

      mocks.poolMock.query.mockResolvedValueOnce({
        rows: [
          userRowFixture({
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            // Simulate the code having already been accepted at the current
            // time step (e.g. by an attacker who captured it first).
            two_factor_last_step: timeStep,
          }),
        ],
      });
      mocks.hasherMock.compare.mockResolvedValueOnce(true);

      await expect(
        login(mocks.deps, null, { ...BASE_LOGIN_REQ, twoFactorToken: code })
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // --- Backup/recovery codes (ADS-914b) -------------------------------

  it('completes the login with a valid backup code and consumes only that code (single-use)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, generateSecret()),
          backup_codes: ['hash-a', 'hash-b'],
        }),
      ],
    });
    mocks.hasherMock.compare
      .mockResolvedValueOnce(true) // password check
      .mockResolvedValueOnce(false) // backup code vs hash-a — no match
      .mockResolvedValueOnce(true); // backup code vs hash-b — match
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      // Atomic conditional array_remove UPDATE — RETURNING the remaining hashes.
      .mockResolvedValueOnce({ rows: [{ remaining: ['hash-a'] }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const res = await login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'ZZZZ-ZZZZ' });

    expect(res.twoFactorRequired).toBe(false);
    expect(res.tokens?.accessToken).toBe('access.jwt.token');
    expect(res.backupCodesExhausted).toBe(false);
    const updateCall = mocks.poolMock.query.mock.calls.find(c =>
      (c[0] as string).includes('array_remove')
    );
    // The matched hash ("hash-b") is passed as the conditional predicate — not the remaining list.
    expect(updateCall?.[1]).toEqual(['usr-adopter', 'hash-b']);
  });

  it('signals backupCodesExhausted when the LAST backup code is consumed', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, generateSecret()),
          backup_codes: ['hash-only'],
        }),
      ],
    });
    mocks.hasherMock.compare
      .mockResolvedValueOnce(true) // password check
      .mockResolvedValueOnce(true); // backup code vs hash-only — match
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      // RETURNING shows empty remaining array — all codes spent.
      .mockResolvedValueOnce({ rows: [{ remaining: [] }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const res = await login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'AAAA-BBBB' });

    expect(res.backupCodesExhausted).toBe(true);
  });

  it('rejects when the DB UPDATE predicate fails — concurrent login already consumed the code (ADS-975)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, generateSecret()),
          backup_codes: ['hash-only'],
        }),
      ],
    });
    mocks.hasherMock.compare
      .mockResolvedValueOnce(true) // password check
      .mockResolvedValueOnce(true); // backup code matches client-side
    // The DB UPDATE finds the hash already removed (rowCount 0) — concurrent login won the race.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'AAAA-BBBB' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('concurrent logins with the same backup code: exactly one succeeds, the other is rejected (ADS-975)', async () => {
    const twoFactorSecret = encryptTotpSecret(ENCRYPTION_KEY, generateSecret());
    const userRow = userRowFixture({
      two_factor_enabled: true,
      two_factor_secret: twoFactorSecret,
      backup_codes: ['hash-only'],
    });

    // Both logins SELECT the same stale user row (before either UPDATE commits).
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [userRow] })
      .mockResolvedValueOnce({ rows: [userRow] });

    mocks.hasherMock.compare
      .mockResolvedValueOnce(true) // login A: password check
      .mockResolvedValueOnce(true) // login B: password check
      .mockResolvedValueOnce(true) // login A: backup code vs hash-only — match
      .mockResolvedValueOnce(true); // login B: backup code vs hash-only — match (stale read)

    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ remaining: [] }], rowCount: 1 }) // A wins the DB race
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // B loses — hash already removed
      // loadPrincipal for the successful login only
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const [resA, resB] = await Promise.allSettled([
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'AAAA-BBBB' }),
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'AAAA-BBBB' }),
    ]);

    const successes = [resA, resB].filter(r => r.status === 'fulfilled');
    const failures = [resA, resB].filter(r => r.status === 'rejected');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect((failures[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(mocks.issuerMock.mint).toHaveBeenCalledTimes(1);
  });

  it('rejects an unrecognised backup code with UNAUTHENTICATED (no token minted)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, generateSecret()),
          backup_codes: ['hash-a'],
        }),
      ],
    });
    mocks.hasherMock.compare
      .mockResolvedValueOnce(true) // password check
      .mockResolvedValueOnce(false); // backup code vs hash-a — no match

    await expect(
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'WRONG-CODE' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('rejects a backup code when none remain', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, generateSecret()),
          backup_codes: [],
        }),
      ],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true); // password check

    await expect(
      login(mocks.deps, null, { ...BASE_LOGIN_REQ, backupCode: 'ANY-CODE' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  // --- Email-verification enforcement --------------------------------

  // ADS-964: a correct password on an unverified account must be treated
  // identically to a wrong password so the response cannot act as a
  // password-check oracle. The fix increments login_attempts (same DB path
  // as the wrong-password branch) and returns the same UNAUTHENTICATED error.

  it('rejects with UNAUTHENTICATED (not emailVerificationRequired) on correct password + unverified account', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ email_verified: false })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'invalid credentials',
    });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('increments login_attempts on correct password + unverified account (same as wrong password)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ email_verified: false })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    const bumpCall = mocks.clientMock.query.mock.calls
      .map(c => c[0] as string)
      .find(sql => /login_attempts = login_attempts \+ 1/.test(sql));
    expect(bumpCall).toBeDefined();
  });

  it('publishes a denied audit event on correct password + unverified account', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ email_verified: false })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      action: 'login',
      outcome: 'denied',
      actorUserId: 'usr-adopter',
      actorEmailSnapshot: 'alex@example.com',
    });
  });

  it('gates email verification BEFORE the second factor — still returns UNAUTHENTICATED', async () => {
    // An unverified account with 2FA on hits the unverified gate first.
    // We never reach the TOTP check, and the response is UNAUTHENTICATED —
    // not twoFactorRequired — so the attacker cannot learn whether 2FA is
    // enabled on an unverified account whose password they just guessed.
    const secret = generateSecret();
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        userRowFixture({
          email_verified: false,
          two_factor_enabled: true,
          two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, secret),
        }),
      ],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.clientMock.query.mockResolvedValue({ rows: [] });

    await expect(login(mocks.deps, null, BASE_LOGIN_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('completes the login (flag false) when the email is verified', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ email_verified: true })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const res = await login(mocks.deps, null, BASE_LOGIN_REQ);

    expect(res.emailVerificationRequired).toBe(false);
    expect(res.tokens?.accessToken).toBe('access.jwt.token');
    expect(mocks.issuerMock.mint).toHaveBeenCalledTimes(1);
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

  it('the refresh-row UPDATE flips both revoked_at AND is_revoked so the session list updates', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'jti-1',
      iat: 0,
      exp: Math.floor(Date.now() / 1000) + 1000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // not denylisted

    const sqls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      sqls.push(sql);
      return { rows: [] };
    });

    await logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: 'token' });
    const update = sqls.find(s => s.includes('UPDATE auth.refresh_tokens'));
    expect(update).toMatch(/is_revoked = true/);
  });

  it('looks up the revoked row by token_hash, never the raw refresh token (ADS-884)', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'jti-1',
      iat: 0,
      exp: Math.floor(Date.now() / 1000) + 1000,
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // not denylisted

    const calls: Array<{ sql: string; params: unknown[] }> = [];
    mocks.clientMock.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: [] };
    });

    await logout(mocks.deps, ADOPTER_PRINCIPAL, { refreshToken: 'my-refresh-token' });

    const update = calls.find(c => c.sql.includes('UPDATE auth.refresh_tokens'));
    expect(update?.sql).toMatch(/token_hash = \$1/);
    expect(update?.params).not.toContain('my-refresh-token');
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
      .mockResolvedValueOnce({
        rows: [
          { token: 'tok', revoked_at: new Date(), is_revoked: true, family_id: 'fam-revoked' },
        ],
      });
    mocks.clientMock.query.mockResolvedValue({ rows: [], rowCount: 1 });
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('UNAUTHENTICATED when the stored row was revoked via RevokeSession (is_revoked=true, revoked_at=null)', async () => {
    // RevokeSession sets is_revoked but the refresh/logout path historically
    // only stamped revoked_at. The refresh check must honour is_revoked, or a
    // revoked session keeps minting fresh tokens.
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'u',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [{ token: 'tok', user_id: 'u', revoked_at: null, is_revoked: true, family_id: 'f' }],
      });
    mocks.clientMock.query.mockResolvedValue({ rows: [], rowCount: 1 });
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    // Family revocation transaction runs but no new tokens are minted.
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('UNAUTHENTICATED when the user has been deactivated — refresh cannot extend access', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          { token: 'tok', user_id: 'usr-1', revoked_at: null, is_revoked: false, family_id: 'f' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ status: 'deactivated' }] }); // status guard rejects
    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    // No rotation transaction, no new tokens minted.
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('rotation inherits the old row family_id and flips is_revoked atomically', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          {
            token: 'tok',
            user_id: 'usr-1',
            revoked_at: null,
            is_revoked: false,
            family_id: 'fam-7',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }); // status guard
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const calls: Array<{ verb: string; sql: string; params: unknown[] }> = [];
    mocks.clientMock.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      calls.push({ verb: sql.trim().split(/\s+/)[0], sql, params });
      return { rows: [], rowCount: 1 };
    });

    await refreshToken(mocks.deps, null, { refreshToken: 'tok' });

    const revoke = calls.find(c => c.verb === 'UPDATE');
    expect(revoke?.sql).toMatch(/is_revoked = true/);
    expect(revoke?.sql).toMatch(/revoked_at IS NULL AND is_revoked = false/);
    const insertNew = calls.find(c => c.verb === 'INSERT' && c.sql.includes('refresh_tokens'));
    // The new head row carries the SAME family so RevokeSession kills the chain.
    expect(insertNew?.params).toContain('fam-7');
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
      .mockResolvedValueOnce({ rows: [{ token: 'tok', user_id: 'usr-1', revoked_at: null }] })
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }); // status guard
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const calls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      calls.push(sql.trim().split(/\s+/)[0]);
      // The conditional revoke UPDATE must report a row was flipped so the
      // rotation proceeds.
      return { rows: [], rowCount: 1 };
    });
    mocks.natsMock.publish.mockImplementation(() => {
      calls.push('NATS_PUBLISH');
    });

    const res = await refreshToken(mocks.deps, null, { refreshToken: 'tok' });
    expect(res.tokens.accessToken).toBe('access.jwt.token');
    // BEGIN → UPDATE old refresh → INSERT denylist → INSERT new refresh → COMMIT → NATS_PUBLISH
    expect(calls).toEqual(['BEGIN', 'UPDATE', 'INSERT', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });

  it('looks up and rotates by token_hash, never the raw refresh token (ADS-884)', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [{ token_hash: 'stored-hash', user_id: 'usr-1', revoked_at: null }],
      })
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }); // status guard
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const calls: Array<{ sql: string; params: unknown[] }> = [];
    mocks.clientMock.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: [], rowCount: 1 };
    });

    await refreshToken(mocks.deps, null, { refreshToken: 'tok' });

    const selectSql = mocks.poolMock.query.mock.calls[1][0] as string;
    expect(selectSql).toMatch(/WHERE token_hash = \$1/);

    const revoke = calls.find(c => c.sql.trim().startsWith('UPDATE'));
    expect(revoke?.sql).toMatch(/WHERE token_hash = \$1/);
    expect(revoke?.params).not.toContain('tok');
    const insertNew = calls.find(
      c => c.sql.trim().startsWith('INSERT') && c.sql.includes('refresh_tokens')
    );
    expect(insertNew?.sql).toMatch(/token_hash/);
    expect(insertNew?.params).not.toContain('access.jwt.token');
    expect(insertNew?.params).not.toContain('refresh.jwt.token');
  });

  it('rejects a concurrent reuse: when the atomic revoke flips no rows it does not mint a second family', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    // Both pre-transaction checks pass (the row LOOKED active at read time),
    // modelling the loser of a rotation race.
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          {
            token: 'tok',
            user_id: 'usr-1',
            revoked_at: null,
            is_revoked: false,
            family_id: 'fam-race',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }); // status guard
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const sqls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      const verb = sql.trim().split(/\s+/)[0];
      sqls.push(verb);
      // The conditional revoke flips 0 rows — another request already rotated.
      if (verb === 'UPDATE') {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    // No new refresh row is inserted.
    expect(sqls).not.toContain('INSERT');
    // auth.tokenReuseDetected is published after the transaction commits (ADS-913).
    expect(mocks.natsMock.publish).toHaveBeenCalledWith(
      'auth.tokenReuseDetected',
      expect.any(Uint8Array),
      expect.any(Object)
    );
  });

  // --- ADS-913: token-family revocation on reuse detection ---------------

  it('ADS-913: revokes whole family and stamps tokens_valid_from when pre-rotated token presented (path 1)', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-attacker-victim',
      jti: 'old-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    // Token was already rotated (attacker used it first)
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          {
            token_hash: 'h',
            user_id: 'usr-attacker-victim',
            revoked_at: new Date(),
            is_revoked: true,
            family_id: 'fam-stolen',
          },
        ],
      });

    const clientCalls: Array<{ sql: string; params: unknown[] }> = [];
    mocks.clientMock.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      clientCalls.push({ sql, params });
      return { rows: [], rowCount: 1 };
    });

    await expect(
      refreshToken(mocks.deps, null, { refreshToken: 'stolen-tok' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    // Family-wide revoke UPDATE fires
    const familyRevoke = clientCalls.find(
      c => c.sql.includes('family_id') && c.sql.includes('is_revoked = false')
    );
    expect(familyRevoke).toBeDefined();
    expect(familyRevoke?.params).toContain('fam-stolen');

    // tokens_valid_from watermark stamped on the user
    const watermark = clientCalls.find(c => c.sql.includes('tokens_valid_from'));
    expect(watermark).toBeDefined();
    expect(watermark?.params).toContain('usr-attacker-victim');

    // No new tokens minted
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
  });

  it('ADS-913: publishes auth.tokenReuseDetected when pre-rotated token presented (path 1)', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-victim',
      jti: 'stolen-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          {
            token_hash: 'h',
            user_id: 'usr-victim',
            revoked_at: new Date(),
            is_revoked: true,
            family_id: 'fam-reuse-event',
          },
        ],
      });
    mocks.clientMock.query.mockResolvedValue({ rows: [], rowCount: 1 });

    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    expect(mocks.natsMock.publish).toHaveBeenCalledWith(
      'auth.tokenReuseDetected',
      expect.any(Uint8Array),
      expect.any(Object)
    );
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      userId: 'usr-victim',
      familyId: 'fam-reuse-event',
      jti: 'stolen-jti',
    });
  });

  it('ADS-913: revokes family and stamps tokens_valid_from on concurrent reuse (path 2)', async () => {
    mocks.issuerMock.verifyRefresh.mockResolvedValueOnce({
      sub: 'usr-conc',
      jti: 'conc-jti',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({
        rows: [
          {
            token: 'tok',
            user_id: 'usr-conc',
            revoked_at: null,
            is_revoked: false,
            family_id: 'fam-conc-steal',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }); // status guard
    mocks.issuerMock.mint.mockResolvedValueOnce(mintedFixture());

    const clientCalls: Array<{ sql: string; params: unknown[] }> = [];
    mocks.clientMock.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const verb = sql.trim().split(/\s+/)[0];
      clientCalls.push({ sql, params });
      // First UPDATE is the rotation gate; return 0 rows to trigger concurrent-reuse path.
      const updateCount = clientCalls.filter(c => c.sql.trim().startsWith('UPDATE')).length;
      if (verb === 'UPDATE' && updateCount === 1) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(refreshToken(mocks.deps, null, { refreshToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    // Family revoke fired for the concurrent-reuse path
    const familyRevoke = clientCalls.find(
      c => c.sql.includes('family_id') && c.sql.includes('is_revoked = false')
    );
    expect(familyRevoke?.params).toContain('fam-conc-steal');

    // tokens_valid_from stamped
    const watermark = clientCalls.find(c => c.sql.includes('tokens_valid_from'));
    expect(watermark?.params).toContain('usr-conc');

    // No new refresh row
    expect(clientCalls.map(c => c.sql.trim().split(/\s+/)[0])).not.toContain('INSERT');
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
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }) // status guard
      .mockResolvedValueOnce({ rows: [{ user_type: 'rescue_staff' }] }) // primary role
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }, { name: 'pets.update' }] });

    const res = await validateToken(mocks.deps, null, { accessToken: 'tok' });
    expect(res.principal.userId).toBe('usr-1');
    expect(res.principal.roles).toEqual([AuthV1.UserRole.USER_ROLE_RESCUE_STAFF]);
    expect(res.principal.permissions).toEqual(['pets.read', 'pets.update']);
    expect(res.expiresAt).toBe(new Date(9_000_000_000 * 1000).toISOString());
  });

  it('UNAUTHENTICATED when the user is suspended (no stale access window)', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [{ status: 'suspended' }] }); // status guard rejects
    await expect(validateToken(mocks.deps, null, { accessToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('UNAUTHENTICATED when the user row is gone (deleted)', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [] }); // status guard finds no live row
    await expect(validateToken(mocks.deps, null, { accessToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('UNAUTHENTICATED when the token predates the revocation watermark', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'j',
      iat: 1_000, // issued at second 1000
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      // watermark is AFTER the token's iat → token revoked
      .mockResolvedValueOnce({
        rows: [{ status: 'active', tokens_valid_from: new Date(2_000_000) }],
      });
    await expect(validateToken(mocks.deps, null, { accessToken: 'tok' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('does not populate rescueId in the returned AuthPrincipal (gateway resolves it via rescue service)', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-staff',
      jti: 'j',
      iat: 0,
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] }) // status guard
      .mockResolvedValueOnce({ rows: [{ user_type: 'rescue_staff' }] }) // primary role
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] }); // permissions

    const res = await validateToken(mocks.deps, null, { accessToken: 'tok' });
    expect(res.principal.rescueId).toBeUndefined();
  });

  it('accepts a token issued at/after the revocation watermark', async () => {
    mocks.issuerMock.verifyAccess.mockResolvedValueOnce({
      sub: 'usr-1',
      jti: 'j',
      iat: 5_000, // issued at second 5000
      exp: 9_000_000_000,
    });
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // not denylisted
      // watermark (2000s) is before the token's iat (5000s) → still valid
      .mockResolvedValueOnce({
        rows: [{ status: 'active', tokens_valid_from: new Date(2_000_000) }],
      })
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }) // primary role
      .mockResolvedValueOnce({ rows: [] }) // extra roles
      .mockResolvedValueOnce({ rows: [] }); // permissions
    const res = await validateToken(mocks.deps, null, { accessToken: 'tok' });
    expect(res.principal.userId).toBe('usr-1');
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
