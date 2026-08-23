import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSecret, generateSync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import { normalizeBackupCode } from './backup-codes.js';
import { login, type HandlerDeps } from './handlers.js';
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

// Two-factor handlers now write their state-changing UPDATE through
// withTransaction, so the mock harness needs both a pool (for the plain
// SELECT reads and the replay-guard UPDATE fired by verifyAndConsumeTotp)
// and a transactional client (for BEGIN/COMMIT/event_outbox plus the
// state-changing UPDATE itself) — mirrors consent-handlers.test.ts.
function makeMocks() {
  const clientScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('event_outbox')) {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [], rowCount: 0 }),
  };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const passwordHasher = {
    hash: (value: string) => Promise.resolve(`hashed:${value}`),
    compare: (value: string, hash: string) => Promise.resolve(hash === `hashed:${value}`),
  };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher,
    tokenIssuer: {
      mint: vi.fn(),
      verifyAccess: vi.fn(),
      verifyRefresh: vi.fn(),
    },
    encryptionKey: ENCRYPTION_KEY,
  };
  return {
    deps,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    poolScript,
    clientScript,
  };
}

// Finds the client.query call whose SQL contains `substring` — used to pick
// out the state-changing UPDATE from among BEGIN/COMMIT/event_outbox calls.
function findClientCall(
  mocks: ReturnType<typeof makeMocks>,
  substring: string
): [string, unknown[]] | undefined {
  return mocks.clientMock.query.mock.calls.find(call => String(call[0]).includes(substring)) as
    | [string, unknown[]]
    | undefined;
}

function auditPayload(mocks: ReturnType<typeof makeMocks>): {
  action: string;
  outcome: string;
  actorUserId?: string;
} {
  expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
  expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
  const envelope = JSON.parse(
    new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
  );
  return envelope.payload as { action: string; outcome: string; actorUserId?: string };
}

describe('setupTwoFactor', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns a secret + otpauth URL and persists an encrypted pending secret', async () => {
    mocks.poolScript.push({ rows: [{ email: 'a@b.com', two_factor_enabled: false }] }); // SELECT
    mocks.clientScript.push({ rows: [], rowCount: 1 }); // UPDATE (persist pending secret)

    const res = await setupTwoFactor(mocks.deps, PRINCIPAL, {});

    expect(res.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(res.otpauthUrl).toContain('otpauth://totp/');
    expect(generateSync({ secret: res.secret })).toMatch(/^\d{6}$/);

    const updateCall = findClientCall(mocks, 'two_factor_secret_pending');
    expect(updateCall).toBeDefined();
    const [updateSql, updateParams] = updateCall!;
    expect(updateSql).toMatch(/two_factor_secret_pending/);
    expect(updateSql).toMatch(/two_factor_pending_expires_at/);
    // The stored value is encrypted — NOT the plaintext secret.
    expect(updateParams[0]).not.toBe(res.secret);
    expect(decryptTotpSecret(ENCRYPTION_KEY, updateParams[0] as string)).toBe(res.secret);
  });

  it('publishes an auth.actionTaken audit event on setup', async () => {
    mocks.poolScript.push({ rows: [{ email: 'a@b.com', two_factor_enabled: false }] });
    mocks.clientScript.push({ rows: [], rowCount: 1 });

    await setupTwoFactor(mocks.deps, PRINCIPAL, {});

    expect(auditPayload(mocks)).toMatchObject({
      action: 'twoFactor.setup',
      outcome: 'success',
      actorUserId: PRINCIPAL.userId,
    });
  });

  it('rejects when 2FA is already enabled', async () => {
    mocks.poolScript.push({ rows: [{ email: 'a@b.com', two_factor_enabled: true }] });
    await expect(setupTwoFactor(mocks.deps, PRINCIPAL, {})).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: expect.stringMatching(/already enabled/),
    });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
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

    mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 }); // SELECT pending secret
    mocks.clientScript.push({ rows: [], rowCount: 1 }); // UPDATE promote pending→active

    const res = await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(res.enabled).toBe(true);

    const updateCall = findClientCall(mocks, 'two_factor_secret = two_factor_secret_pending');
    expect(updateCall).toBeDefined();
    const [updateSql] = updateCall!;
    expect(updateSql).toMatch(/two_factor_enabled = true/);
    expect(updateSql).toMatch(/two_factor_secret_pending = NULL/);
  });

  it('publishes an auth.actionTaken audit event on enable', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 });
    mocks.clientScript.push({ rows: [], rowCount: 1 });

    await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(auditPayload(mocks)).toMatchObject({
      action: 'twoFactor.enable',
      outcome: 'success',
      actorUserId: PRINCIPAL.userId,
    });
  });

  it('persists the accepted confirmation step (not NULL) so the code cannot be replayed on Login (ADS-976)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const token = generateSync({ secret });

      mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 });
      mocks.clientScript.push({ rows: [], rowCount: 1 });

      await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

      const updateCall = findClientCall(mocks, 'two_factor_secret = two_factor_secret_pending');
      const [updateSql, updateParams] = updateCall!;
      expect(updateSql).not.toMatch(/two_factor_last_step = NULL/);
      expect(updateSql).toMatch(/two_factor_last_step = \$1/);
      expect(updateParams[0]).toBe(Math.floor(Date.now() / 1000 / 30));
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores req.secret entirely — attacker-supplied secret does not enable 2FA', async () => {
    // Attack scenario from ADS-963: attacker has a token but no server-stored pending secret.
    // They supply their own secret + a valid TOTP for it. Must be rejected.
    const attackerSecret = generateSecret();
    const attackerToken = generateSync({ secret: attackerSecret });

    mocks.poolScript.push({
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

    // No UPDATE must have run, and no audit event was published.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('rejects when no prior setupTwoFactor ran (no pending secret in DB)', async () => {
    mocks.poolScript.push({
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

    mocks.poolScript.push({
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

    mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 });

    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token: '000000' })).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT' }
    );
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('surfaces a no-op UPDATE (already enabled race) as 400', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 });
    mocks.clientScript.push({ rows: [], rowCount: 0 }); // UPDATE matched 0 rows

    await expect(enableTwoFactor(mocks.deps, PRINCIPAL, { token })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    // The race means no state actually changed — no audit event either.
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('returns 10 unique backup codes and stores only their hashes (ADS-914b)', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    mocks.poolScript.push({ rows: [makePendingRow(secret)], rowCount: 1 });
    mocks.clientScript.push({ rows: [], rowCount: 1 });

    const res = await enableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(res.backupCodes).toHaveLength(10);
    expect(new Set(res.backupCodes).size).toBe(10);
    for (const code of res.backupCodes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
    }

    const updateCall = findClientCall(mocks, 'two_factor_secret = two_factor_secret_pending');
    const [, updateParams] = updateCall!;
    const storedHashes = updateParams[1] as string[];
    expect(storedHashes).toHaveLength(10);
    for (const [i, code] of res.backupCodes.entries()) {
      expect(storedHashes[i]).not.toBe(code);
      expect(storedHashes[i]).toBe(`hashed:${normalizeBackupCode(code)}`);
    }
  });

  it('rejects when 2FA is already enabled', async () => {
    mocks.poolScript.push({
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

// ADS-976: reproduces the reported replay attack end-to-end — the exact
// 6-digit code used to confirm enrolment must not also be accepted by
// Login within the same 30s window, because verifyAndConsumeTotp's
// afterTimeStep replay guard is keyed on the persisted two_factor_last_step.
describe('enableTwoFactor confirmation-code replay (ADS-976)', () => {
  it('rejects an immediate Login that replays the code used to confirm enrolment', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const token = generateSync({ secret });
      const enableMocks = makeMocks();

      const encrypted = encryptTotpSecret(ENCRYPTION_KEY, secret);
      enableMocks.poolScript.push({
        // SELECT pending secret
        rows: [
          {
            two_factor_enabled: false,
            two_factor_secret_pending: encrypted,
            two_factor_pending_expires_at: new Date(Date.now() + 9 * 60_000),
          },
        ],
        rowCount: 1,
      });
      enableMocks.clientScript.push({ rows: [], rowCount: 1 }); // UPDATE promote pending→active

      await enableTwoFactor(enableMocks.deps, PRINCIPAL, { token });

      const updateCall = findClientCall(
        enableMocks,
        'two_factor_secret = two_factor_secret_pending'
      );
      const [, updateParams] = updateCall!;
      const persistedStep = updateParams[0] as number;

      // Login as if the very next call, within the same 30s window, supplies
      // the identical code — using the step just persisted by enableTwoFactor.
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
      const natsPublish = vi.fn();
      const loginPool = {
        connect: vi.fn().mockResolvedValue(client),
        query: vi.fn().mockResolvedValueOnce({
          rows: [
            {
              user_id: 'usr-1',
              email: 'alex@example.com',
              password: 'hashed:hunter2',
              first_name: null,
              last_name: null,
              email_verified: true,
              phone_verified: false,
              two_factor_enabled: true,
              two_factor_secret: encrypted,
              two_factor_last_step: persistedStep,
              backup_codes: null,
              status: 'active',
              user_type: 'adopter',
              profile_image_url: null,
              bio: null,
              timezone: null,
              language: null,
              country: null,
              city: null,
              last_login_at: null,
              locked_until: null,
              login_attempts: 0,
              created_at: new Date('2026-01-01T00:00:00Z'),
              updated_at: new Date('2026-01-01T00:00:00Z'),
            },
          ],
        }),
      };
      const loginDeps: HandlerDeps = {
        pool: loginPool as unknown as HandlerDeps['pool'],
        nats: {
          publish: natsPublish,
          jetstream: () => ({ publish: natsPublish }),
        } as unknown as HandlerDeps['nats'],
        passwordHasher: enableMocks.deps.passwordHasher,
        tokenIssuer: enableMocks.deps.tokenIssuer,
        encryptionKey: ENCRYPTION_KEY,
      };

      await expect(
        login(loginDeps, null, {
          email: 'alex@example.com',
          password: 'hunter2',
          twoFactorToken: token,
        })
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    } finally {
      vi.useRealTimers();
    }
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
    mocks.poolScript.push(
      {
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: null,
          },
        ],
      },
      // Replay-guard UPDATE (two_factor_last_step) fired by verifyAndConsumeTotp.
      { rows: [] }
    );
    mocks.clientScript.push({ rows: [], rowCount: 1 }); // clearing UPDATE

    const res = await disableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(res.disabled).toBe(true);
    const updateCall = findClientCall(mocks, 'two_factor_secret = NULL');
    const [sql] = updateCall!;
    expect(sql).toMatch(/two_factor_secret_pending = NULL/);
    expect(sql).toMatch(/two_factor_pending_expires_at = NULL/);
  });

  it('publishes an auth.actionTaken audit event on disable', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolScript.push(
      {
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: null,
          },
        ],
      },
      { rows: [] }
    );
    mocks.clientScript.push({ rows: [], rowCount: 1 });

    await disableTwoFactor(mocks.deps, PRINCIPAL, { token });

    expect(auditPayload(mocks)).toMatchObject({
      action: 'twoFactor.disable',
      outcome: 'success',
      actorUserId: PRINCIPAL.userId,
    });
  });

  it('rejects when 2FA is not enabled', async () => {
    mocks.poolScript.push({
      rows: [{ two_factor_enabled: false, two_factor_secret: null, two_factor_last_step: null }],
    });
    await expect(
      disableTwoFactor(mocks.deps, PRINCIPAL, { token: '123456' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('rejects a wrong code (does not clear the secret)', async () => {
    const secret = generateSecret();
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolScript.push({
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
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('rejects a replayed code that was already accepted (ADS-914c)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const token = generateSync({ secret });
      const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
      const timeStep = Math.floor(Date.now() / 1000 / 30);
      mocks.poolScript.push({
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
    mocks.poolScript.push(
      {
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: null,
          },
        ],
      },
      // Replay-guard UPDATE fired by verifyAndConsumeTotp.
      { rows: [] }
    );
    mocks.clientScript.push({ rows: [] }); // The backup_codes overwrite.

    const res = await regenerateBackupCodes(mocks.deps, PRINCIPAL, { token });

    expect(res.backupCodes).toHaveLength(10);
    const updateCall = findClientCall(mocks, 'backup_codes = $2');
    const [sql, params] = updateCall!;
    expect(sql).toMatch(/backup_codes = \$2/);
    const storedHashes = params[1] as string[];
    expect(storedHashes).toHaveLength(10);
    for (const [i, code] of res.backupCodes.entries()) {
      expect(storedHashes[i]).not.toBe(code);
    }
  });

  it('publishes an auth.actionTaken audit event on regeneration', async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolScript.push(
      {
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: null,
          },
        ],
      },
      { rows: [] }
    );
    mocks.clientScript.push({ rows: [] });

    await regenerateBackupCodes(mocks.deps, PRINCIPAL, { token });

    expect(auditPayload(mocks)).toMatchObject({
      action: 'twoFactor.regenerateBackupCodes',
      outcome: 'success',
      actorUserId: PRINCIPAL.userId,
    });
  });

  it('rejects when 2FA is not enabled', async () => {
    mocks.poolScript.push({
      rows: [{ two_factor_enabled: false, two_factor_secret: null, two_factor_last_step: null }],
    });
    await expect(
      regenerateBackupCodes(mocks.deps, PRINCIPAL, { token: '123456' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a wrong code without regenerating', async () => {
    const secret = generateSecret();
    const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
    mocks.poolScript.push({
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
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    await expect(
      regenerateBackupCodes(mocks.deps, null, { token: '123456' })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  // ADS-976 AC: "RegenerateBackupCodes behaves the same way (its own TOTP
  // code is not replayable on the next Login)." Unlike enableTwoFactor,
  // this handler already verifies via verifyAndConsumeTotp (see the
  // "mints a fresh set" test above — call 2 is its replay-guard UPDATE),
  // which persists the accepted step. This test documents that the guard
  // is live: a code already accepted at the current step is rejected here
  // too, same as disableTwoFactor / Login.
  it('rejects a replayed code that was already accepted (ADS-914c/976)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const secret = generateSecret();
      const token = generateSync({ secret });
      const encryptedSecret = encryptTotpSecret(ENCRYPTION_KEY, secret);
      const timeStep = Math.floor(Date.now() / 1000 / 30);
      mocks.poolScript.push({
        rows: [
          {
            two_factor_enabled: true,
            two_factor_secret: encryptedSecret,
            two_factor_last_step: timeStep,
          },
        ],
      });
      await expect(regenerateBackupCodes(mocks.deps, PRINCIPAL, { token })).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });
      // Only the SELECT ran — no replay-guard update, no regeneration.
      expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
