import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSecret, generateSync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import { normalizeBackupCode } from './backup-codes.js';
import type { HandlerDeps } from './handlers.js';
import { decryptTotpSecret, encryptTotpSecret } from './totp-crypto.js';
import {
  disableTwoFactor,
  enableTwoFactor,
  regenerateBackupCodes,
  setupTwoFactor,
} from './two-factor-handlers.js';

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const ENCRYPTION_KEY = 'a'.repeat(64);

function makeMocks() {
  const pool = { query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const passwordHasher = {
    hash: (value: string) => Promise.resolve(`hashed:${value}`),
    compare: (value: string, hash: string) => Promise.resolve(hash === `hashed:${value}`),
  };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    passwordHasher,
    tokenIssuer: {
      mint: vi.fn(),
      verifyAccess: vi.fn(),
      verifyRefresh: vi.fn(),
    },
    encryptionKey: ENCRYPTION_KEY,
  };
  return { deps, poolMock: pool };
}

describe('setupTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns a secret + otpauth URL and persists an encrypted pending secret', async () => {
    mocks.poolMock.query
      // SELECT
      .mockResolvedValueOnce({ rows: [{ email: 'a@b.com', two_factor_enabled: false }] })
      // UPDATE (persist pending secret)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await setupTwoFactor(mocks.deps, PRINCIPAL, {});

    expect(res.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(res.otpauthUrl).toContain('otpauth://totp/');
    expect(generateSync({ secret: res.secret })).toMatch(/^\d{6}$/);

    // Second call is the UPDATE that stores the pending secret.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(2);
    const [updateSql, updateParams] = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toMatch(/two_factor_secret_pending/);
    expect(updateSql).toMatch(/two_factor_pending_expires_at/);
    // The stored value is encrypted — NOT the plaintext secret.
    expect(updateParams[0]).not.toBe(res.secret);
    expect(decryptTotpSecret(ENCRYPTION_KEY, updateParams[0] as string)).toBe(res.secret);
  });

  it('rejects when 2FA is already enabled', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ email: 'a@b.com', two_factor_enabled: true }],
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

  function makePendingRow(secret: string, expiredMinutesAgo?: number) {
    const encrypted = encryptTotpSecret(ENCRYPTION_KEY, secret);
    const expires = new Date(
      Date.now() + (expiredMinutesAgo !== undefined ? -expiredMinutesAgo : 9) * 60_000
    );
    return {
      two_factor_enabled: false,
      two_factor_secret_pending: encrypted,
      two_factor_pending_expires_at: expires,
    };
  }

  it('enables 2FA when the token verifies against the server-stored pending secret', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolMock.query
      // SELECT pending secret
      .mockResolvedValueOnce({ rows: [makePendingRow(secret)], rowCount: 1 })
      // UPDATE promote pending→active
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(res.enabled).toBe(true);

    const [updateSql] = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toMatch(/two_factor_secret = two_factor_secret_pending/);
    expect(updateSql).toMatch(/two_factor_enabled = true/);
    expect(updateSql).toMatch(/two_factor_secret_pending = NULL/);
  });

  it('ignores req.secret entirely — attacker-supplied secret does not enable 2FA', async () => {
    // Attack scenario from ADS-963: attacker has a token but no server-stored pending secret.
    // They supply their own secret + a valid TOTP for it. Must be rejected.
    const attackerSecret = generateSecret();
    const attackerToken = generateSync({ secret: attackerSecret });

    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          two_factor_enabled: false,
          two_factor_secret_pending: null,
          two_factor_pending_expires_at: null,
        },
      ],
      rowCount: 1,
    });

    await expect(
      enableTwoFactor(mocks.deps, PRINCIPAL, { secret: attackerSecret, token: attackerToken })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringMatching(/setup.*required|setup first/i),
    });

    // No UPDATE must have run.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('rejects when no prior setupTwoFactor ran (no pending secret in DB)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          two_factor_enabled: false,
          two_factor_secret_pending: null,
          two_factor_pending_expires_at: null,
        },
      ],
      rowCount: 1,
    });
    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token: '123456' })).rejects.toMatchObject(
      {
        code: 'INVALID_ARGUMENT',
        message: expect.stringMatching(/setup.*required|setup first/i),
      }
    );
  });

  it('rejects an expired pending secret', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [makePendingRow(secret, 1)], // expired 1 minute ago
      rowCount: 1,
    });

    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringMatching(/expired/i),
    });
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid TOTP code without writing', async () => {
    const secret = generateSecret();

    mocks.poolMock.query.mockResolvedValueOnce({ rows: [makePendingRow(secret)], rowCount: 1 });

    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token: '000000' })).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT' }
    );
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('surfaces a no-op UPDATE (already enabled race) as 400', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [makePendingRow(secret)], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE matched 0 rows

    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('returns 10 unique backup codes and stores only their hashes (ADS-914b)', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [makePendingRow(secret)], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(res.backupCodes).toHaveLength(10);
    expect(new Set(res.backupCodes).size).toBe(10);
    for (const code of res.backupCodes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
    }

    const [, updateParams] = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    const storedHashes = updateParams[0] as string[];
    expect(storedHashes).toHaveLength(10);
    for (const [i, code] of res.backupCodes.entries()) {
      expect(storedHashes[i]).not.toBe(code);
      expect(storedHashes[i]).toBe(`hashed:${normalizeBackupCode(code)}`);
    }
  });

  it('rejects when 2FA is already enabled', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          two_factor_enabled: true,
          two_factor_secret_pending: null,
          two_factor_pending_expires_at: null,
        },
      ],
      rowCount: 1,
    });
    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token: '123456' })).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT', message: expect.stringMatching(/already enabled/) }
    );
  });

  it('requires authentication', async () => {
    await expect(enableTwoFactor(mocks.deps, null, { token: '123456' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

describe('disableTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('clears the secret, flag, and pending columns when the code verifies', async () => {
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
    expect(sql).toMatch(/two_factor_secret_pending = NULL/);
    expect(sql).toMatch(/two_factor_pending_expires_at = NULL/);
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

describe('regenerateBackupCodes', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('mints a fresh set of 10 codes and overwrites the stored hashes', async () => {
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
      // Replay-guard UPDATE fired by verifyAndConsumeTotp.
      .mockResolvedValueOnce({ rows: [] })
      // The backup_codes overwrite.
      .mockResolvedValueOnce({ rows: [] });

    const res = await regenerateBackupCodes(mocks.deps, PRINCIPAL, { token });

    expect(res.backupCodes).toHaveLength(10);
    const [sql, params] = mocks.poolMock.query.mock.calls[2] as [string, unknown[]];
    expect(sql).toMatch(/backup_codes = \$2/);
    const storedHashes = params[1] as string[];
    expect(storedHashes).toHaveLength(10);
    for (const [i, code] of res.backupCodes.entries()) {
      expect(storedHashes[i]).not.toBe(code);
    }
  });

  it('rejects when 2FA is not enabled', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ two_factor_enabled: false, two_factor_secret: null, two_factor_last_step: null }],
    });
    await expect(
      regenerateBackupCodes(mocks.deps, PRINCIPAL, { token: '123456' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a wrong code without regenerating', async () => {
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
      regenerateBackupCodes(mocks.deps, PRINCIPAL, { token: '000000' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // Only the SELECT ran — no replay-guard update, no regeneration.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('requires authentication', async () => {
    await expect(
      regenerateBackupCodes(mocks.deps, null, { token: '123456' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
