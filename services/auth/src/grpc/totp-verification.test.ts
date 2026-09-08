import { generateSecret, generateSync } from 'otplib';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { encryptTotpSecret } from './totp-crypto.js';
import { verifyAndConsumeTotp } from './totp-verification.js';

const KEY = 'a'.repeat(64);

function makeDeps() {
  const query = vi.fn().mockResolvedValue(undefined);
  return { deps: { pool: { query }, encryptionKey: KEY }, query };
}

// Pin the clock in the tests that generate a code and then verify it, so the
// epoch generateSync() encodes and the epoch verifyAndConsumeTotp() reads
// internally cannot drift apart across a 30s RFC 6238 step boundary (flake
// guard — same pattern as verify-credentials.test.ts and handlers.test.ts).
function pinClock(): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
}

describe('verifyAndConsumeTotp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no secret is enrolled', async () => {
    const { deps, query } = makeDeps();
    const ok = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret: null, lastStep: null },
      '123456'
    );
    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('accepts a valid code and persists the matched time step', async () => {
    pinClock();
    const { deps, query } = makeDeps();
    const secret = generateSecret();
    const token = generateSync({ secret });
    const encryptedSecret = encryptTotpSecret(KEY, secret);

    const ok = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret, lastStep: null },
      token
    );

    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE auth\.users SET two_factor_last_step/),
      ['u1', expect.any(Number)]
    );
  });

  it('rejects an incorrect code', async () => {
    const { deps, query } = makeDeps();
    const secret = generateSecret();
    const encryptedSecret = encryptTotpSecret(KEY, secret);

    const ok = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret, lastStep: null },
      '000000'
    );

    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects replay of a code already accepted at or before the last step (ADS-914c)', async () => {
    pinClock();
    const { deps, query } = makeDeps();
    const secret = generateSecret();
    const token = generateSync({ secret });
    const encryptedSecret = encryptTotpSecret(KEY, secret);

    const first = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret, lastStep: null },
      token
    );
    expect(first).toBe(true);

    const lastStep = query.mock.calls[0]?.[1]?.[1] as number;
    query.mockClear();

    // Same code, same time step — must be rejected as a replay.
    const second = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret, lastStep },
      token
    );
    expect(second).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed (returns false) when the stored ciphertext cannot be decrypted', async () => {
    const { deps, query } = makeDeps();
    const ok = await verifyAndConsumeTotp(
      deps,
      { userId: 'u1', encryptedSecret: 'not-valid-ciphertext', lastStep: null },
      '123456'
    );
    expect(ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
