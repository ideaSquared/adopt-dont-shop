import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSecret, generateSync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import type { VerifyCredentialsRequest } from '@adopt-dont-shop/proto';

import { type HandlerDeps } from './handlers.js';
import { verifyCredentials } from './verify-credentials.js';
import { encryptTotpSecret } from './totp-crypto.js';

// --- Fixtures --------------------------------------------------------

const ENCRYPTION_KEY = 'a'.repeat(64);

const PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

// Only the columns VerifyCredentials reads — password + the 2FA triplet + the
// denormalised email used for the audit snapshot.
function userRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    email: 'alex@example.com',
    password: '$2b$10$hash',
    two_factor_enabled: false,
    two_factor_secret: null,
    two_factor_last_step: null,
    ...overrides,
  };
}

function makeMocks() {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const natsPublish = vi.fn();
  const nats = {
    publish: natsPublish,
    jetstream: () => ({ publish: natsPublish }),
  };
  const passwordHasher = {
    compare: vi.fn(),
    hash: vi.fn(),
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

const BASE_REQ: VerifyCredentialsRequest = { password: 'hunter2' };

// Decode the single published audit envelope back to its payload.
function auditPayload(natsMock: ReturnType<typeof makeMocks>['natsMock']) {
  expect(natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
  const envelope = JSON.parse(
    new TextDecoder().decode(natsMock.publish.mock.calls[0][1] as Uint8Array)
  );
  return envelope.payload as { action: string; outcome: string; actorUserId?: string };
}

// --- verifyCredentials -----------------------------------------------

describe('verifyCredentials', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects a missing principal — UNAUTHENTICATED', async () => {
    await expect(verifyCredentials(mocks.deps, null, BASE_REQ)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects a missing password — INVALID_ARGUMENT', async () => {
    await expect(
      verifyCredentials(mocks.deps, PRINCIPAL, { ...BASE_REQ, password: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('verifies a correct password on a non-2FA account without minting tokens', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRowFixture()] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);

    const res = await verifyCredentials(mocks.deps, PRINCIPAL, BASE_REQ);

    expect(res).toEqual({ verified: true, twoFactorRequired: false });
    // Step-up must NOT mint a session: no token issuance, no refresh-token row.
    expect(mocks.issuerMock.mint).not.toHaveBeenCalled();
    const allSql = [
      ...mocks.poolMock.query.mock.calls.map(c => String(c[0])),
      ...mocks.clientMock.query.mock.calls.map(c => String(c[0])),
    ];
    expect(allSql.some(sql => /refresh_tokens/i.test(sql))).toBe(false);
    // Audit success rides along.
    expect(auditPayload(mocks.natsMock)).toMatchObject({
      action: 'verify',
      outcome: 'success',
      actorUserId: PRINCIPAL.userId,
    });
  });

  it('does not verify a wrong password, consumes no TOTP, and audits a denial', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRowFixture({ two_factor_enabled: true, two_factor_secret: 'enc' })],
    });
    mocks.hasherMock.compare.mockResolvedValueOnce(false);

    const res = await verifyCredentials(mocks.deps, PRINCIPAL, {
      ...BASE_REQ,
      twoFactorToken: '000000',
    });

    expect(res).toEqual({ verified: false, twoFactorRequired: false });
    // The wrong password short-circuits BEFORE the TOTP check — only the user
    // lookup hit the pool; no replay-guard watermark UPDATE ran.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    expect(auditPayload(mocks.natsMock)).toMatchObject({ action: 'verify', outcome: 'denied' });
  });

  it('verifies a 2FA account with a valid TOTP and advances the replay watermark', async () => {
    const secret = generateSecret();
    const code = generateSync({ secret });
    mocks.poolMock.query
      .mockResolvedValueOnce({
        rows: [
          userRowFixture({
            two_factor_enabled: true,
            two_factor_secret: encryptTotpSecret(ENCRYPTION_KEY, secret),
          }),
        ],
      })
      // Replay-guard UPDATE (two_factor_last_step) fired by verifyAndConsumeTotp.
      .mockResolvedValueOnce({ rows: [] });
    mocks.hasherMock.compare.mockResolvedValueOnce(true);

    const res = await verifyCredentials(mocks.deps, PRINCIPAL, {
      ...BASE_REQ,
      twoFactorToken: code,
    });

    expect(res).toEqual({ verified: true, twoFactorRequired: false });
    // The watermark UPDATE proves the code was consumed (not just matched).
    const ranWatermarkUpdate = mocks.poolMock.query.mock.calls.some(c =>
      /two_factor_last_step/i.test(String(c[0]))
    );
    expect(ranWatermarkUpdate).toBe(true);
    expect(auditPayload(mocks.natsMock)).toMatchObject({ action: 'verify', outcome: 'success' });
  });

  it('does not verify a 2FA account with a wrong TOTP and audits a denial', async () => {
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

    const res = await verifyCredentials(mocks.deps, PRINCIPAL, {
      ...BASE_REQ,
      twoFactorToken: '000000',
    });

    expect(res).toEqual({ verified: false, twoFactorRequired: false });
    expect(auditPayload(mocks.natsMock)).toMatchObject({ action: 'verify', outcome: 'denied' });
  });

  it('signals two_factor_required when the password is correct but no code is supplied', async () => {
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

    const res = await verifyCredentials(mocks.deps, PRINCIPAL, BASE_REQ);

    expect(res).toEqual({ verified: false, twoFactorRequired: true });
    // The "need a code" branch is not a decision yet — nothing is audited.
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});
