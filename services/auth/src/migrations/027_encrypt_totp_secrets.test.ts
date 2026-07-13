import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decryptTotpSecret } from '../grpc/totp-crypto.js';

import { down, up } from './027_encrypt_totp_secrets.js';

const ENCRYPTION_KEY = 'a'.repeat(64);

type SelectRow = { user_id: string; two_factor_secret: string };

function makePgm(rows: SelectRow[]) {
  const updates: Array<{ sql: string; params: unknown[] }> = [];
  const pgm = {
    addColumns: vi.fn(),
    dropColumns: vi.fn(),
    db: {
      select: vi.fn().mockResolvedValue(rows),
      query: vi.fn((sql: string, params: unknown[]) => {
        updates.push({ sql, params });
        return Promise.resolve();
      }),
    },
  };
  return { pgm, updates };
}

describe('027_encrypt_totp_secrets', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('adds the two_factor_last_step column and re-wraps existing plaintext secrets', async () => {
    const { pgm, updates } = makePgm([{ user_id: 'u1', two_factor_secret: 'JBSWY3DPEHPK3PXP' }]);

    await up(pgm as any);

    expect(pgm.addColumns).toHaveBeenCalledWith('users', {
      two_factor_last_step: { type: 'integer' },
    });
    expect(updates).toHaveLength(1);
    const [{ params }] = updates;
    // The written value is ciphertext, not the plaintext secret, and
    // round-trips back to the original.
    expect(params[0]).not.toBe('JBSWY3DPEHPK3PXP');
    expect(decryptTotpSecret(ENCRYPTION_KEY, params[0] as string)).toBe('JBSWY3DPEHPK3PXP');
    expect(params[1]).toBe('u1');
  });

  it('is a no-op on the row set when no secrets are enrolled', async () => {
    const { pgm, updates } = makePgm([]);

    await up(pgm as any);

    expect(updates).toHaveLength(0);
  });

  it('logs a warning and continues when a single row fails to encrypt', async () => {
    const { pgm, updates } = makePgm([{ user_id: 'u1', two_factor_secret: 'GOOD' }]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Force the second write to be reached by making the key invalid mid-run
    // is awkward; instead make db.query throw for the first row so the catch
    // path runs, then assert we surfaced a warning rather than aborting.
    pgm.db.query.mockRejectedValueOnce(new Error('boom'));

    await up(pgm as any);

    expect(warn).toHaveBeenCalled();
    // The write was attempted (and failed) but up() did not throw.
    expect(updates).toHaveLength(0);
  });

  it('down drops the two_factor_last_step column', async () => {
    const { pgm } = makePgm([]);

    await down(pgm as any);

    expect(pgm.dropColumns).toHaveBeenCalledWith('users', ['two_factor_last_step']);
  });
});
