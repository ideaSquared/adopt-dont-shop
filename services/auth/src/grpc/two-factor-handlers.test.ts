import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSecret, generateSync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { decryptTotpSecret, encryptTotpSecret } from './totp-crypto.js';
import { disableTwoFactor, enableTwoFactor, setupTwoFactor } from './two-factor-handlers.js';

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const ENCRYPTION_KEY = 'a'.repeat(64);

function makeMocks() {
  const pool = { query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    encryptionKey: ENCRYPTION_KEY,
  };
  return { deps, poolMock: pool };
}

describe('setupTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns a secret + otpauth URL for a user without 2FA', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ email: 'a@b.com', two_factor_enabled: false, two_factor_secret: null }],
    });
    const res = await setupTwoFactor(mocks.deps, PRINCIPAL, {});
    expect(res.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(res.otpauthUrl).toContain('otpauth://totp/');
    // A code generated from the returned secret is a valid 6-digit TOTP.
    expect(generateSync({ secret: res.secret })).toMatch(/^\d{6}$/);
  });

  it('rejects when 2FA is already enabled (400 already enabled)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ email: 'a@b.com', two_factor_enabled: true, two_factor_secret: 'X' }],
    });
    await expect(setupTwoFactor(mocks.deps, PRINCIPAL, {})).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringMatching(/already enabled/),
    });
  });

  it('requires authentication', async () => {
    await expect(setupTwoFactor(mocks.deps, null, {})).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

describe('enableTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('persists the ENCRYPTED secret + flips the flag when the code verifies', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await enableTwoFactor(mocks.deps, PRINCIPAL, { secret, token });
    expect(res.enabled).toBe(true);
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/two_factor_enabled = true/);
    expect(sql).toMatch(/two_factor_enabled = false/); // the guard
    // The secret is encrypted at rest (ADS-914a) — never write the plaintext.
    expect(params[0]).not.toBe(secret);
    expect(decryptTotpSecret(ENCRYPTION_KEY, params[0] as string)).toBe(secret);
  });

  it('rejects an invalid code without writing', async () => {
    const secret = generateSecret();
    await expect(
      enableTwoFactor(mocks.deps, PRINCIPAL, { secret, token: '000000' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('surfaces a no-op UPDATE (already enabled) as 400', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { secret, token })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});

describe('disableTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('clears the secret + flag when the code verifies', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: null,
          },
        ],
      })
      // Replay-guard UPDATE (two_factor_last_step) fired by verifyAndConsumeTotp.
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await disableTwoFactor(mocks.deps, PRINCIPAL, { token });
    expect(res.disabled).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[2] as [string];
    expect(sql).toMatch(/two_factor_secret = NULL/);
  });

  it('rejects when 2FA is not enabled', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ two_factor_enabled: false, two_factor_secret: null, two_factor_last_step: null }],
    });
    await expect(
      disableTwoFactor(mocks.deps, PRINCIPAL, { token: '123456' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a wrong code (does not clear the secret)', async () => {
    const secret = generateSecret();
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          two_factor_enabled: true,
          two_factor_secret: encryptedSecret,
          two_factor_last_step: null,
        },
      ],
    });
    await expect(
      disableTwoFactor(mocks.deps, PRINCIPAL, { token: '000000' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // Only the SELECT ran — no replay-guard update, no clearing UPDATE.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('rejects a replayed code that was already accepted (ADS-914c)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const token = generateSync({ secret });
      const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
      const timeStep = Math.floor(Date.now() / 1000 / 30);
      mocks.poolMock.query.mockResolvedValueOnce({
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: timeStep,
          },
        ],
      });
      await expect(disableTwoFactor(mocks.deps, PRINCIPAL, { token })).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });
      expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
