import * as crypto from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

// Spy-wrap timingSafeEqual so the suite can assert the MAC comparison is
// constant-time rather than a `===` on strings (which leaks length/prefix
// timing). Everything else passes through to the real node:crypto.
vi.mock('node:crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    timingSafeEqual: vi.fn(actual.timingSafeEqual),
  };
});

import {
  DEFAULT_PRINCIPAL_TOKEN_TTL_MS,
  PrincipalTokenError,
  signPrincipalToken,
  verifyPrincipalToken,
} from './principal-token.js';

const KEY = 'test-signing-key';

const PRINCIPAL = {
  userId: 'usr-1',
  roles: ['rescue_staff', 'admin'],
  permissions: ['pets.read', 'pets.update'],
  rescueId: 'rsc-42',
};

describe('signPrincipalToken / verifyPrincipalToken — round trip', () => {
  it('round-trips a full principal (incl. rescueId)', () => {
    const token = signPrincipalToken(PRINCIPAL, KEY);
    const verified = verifyPrincipalToken(token, KEY);
    expect(verified).toEqual(PRINCIPAL);
  });

  it('round-trips a principal without rescueId', () => {
    const { rescueId: _ignored, ...noRescue } = PRINCIPAL;
    const token = signPrincipalToken(noRescue, KEY);
    const verified = verifyPrincipalToken(token, KEY);
    expect(verified.rescueId).toBeUndefined();
    expect(verified.userId).toBe('usr-1');
  });

  it('produces a compact two-part dot-separated token', () => {
    const token = signPrincipalToken(PRINCIPAL, KEY);
    expect(token.split('.')).toHaveLength(2);
    // base64url only — no '+', '/', '=' that would break header transport.
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('defaults to a 120s TTL', () => {
    const now = Date.now();
    const token = signPrincipalToken(PRINCIPAL, KEY, { now });
    // Just before expiry: still valid.
    expect(() =>
      verifyPrincipalToken(token, KEY, now + DEFAULT_PRINCIPAL_TOKEN_TTL_MS - 1)
    ).not.toThrow();
    // Just after expiry: rejected.
    expect(() =>
      verifyPrincipalToken(token, KEY, now + DEFAULT_PRINCIPAL_TOKEN_TTL_MS + 1)
    ).toThrow(PrincipalTokenError);
  });

  it('honours a custom ttlMs', () => {
    const now = Date.now();
    const token = signPrincipalToken(PRINCIPAL, KEY, { now, ttlMs: 5_000 });
    expect(() => verifyPrincipalToken(token, KEY, now + 4_999)).not.toThrow();
    expect(() => verifyPrincipalToken(token, KEY, now + 5_001)).toThrow(PrincipalTokenError);
  });
});

describe('verifyPrincipalToken — rejection paths', () => {
  it('rejects a tampered payload (bad_signature)', () => {
    const token = signPrincipalToken(PRINCIPAL, KEY);
    const [payload, sig] = token.split('.');
    const forged = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    forged.userId = 'attacker';
    const tampered = `${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${sig}`;

    expect(() => verifyPrincipalToken(tampered, KEY)).toThrowError(PrincipalTokenError);
    try {
      verifyPrincipalToken(tampered, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('bad_signature');
    }
  });

  it('rejects a token signed with a different key (bad_signature)', () => {
    const token = signPrincipalToken(PRINCIPAL, 'some-other-key');
    try {
      verifyPrincipalToken(token, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('bad_signature');
    }
  });

  it('rejects an expired token (expired)', () => {
    const token = signPrincipalToken(PRINCIPAL, KEY, { ttlMs: -1 });
    try {
      verifyPrincipalToken(token, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('expired');
    }
  });

  it.each([
    ['no separator', 'not-a-token'],
    ['too many parts', 'a.b.c'],
    ['empty payload', '.c2ln'],
    ['empty signature', 'cGF5bG9hZA.'],
    ['empty string', ''],
  ])('rejects a malformed token: %s', (_label, bad) => {
    try {
      verifyPrincipalToken(bad, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('malformed');
    }
  });

  it('rejects a signed-but-not-JSON payload as malformed', () => {
    // Build a token whose signature is valid for a non-JSON payload —
    // signature passes, JSON parse fails.
    const payload = Buffer.from('this is not json').toString('base64url');
    const sig = crypto.createHmac('sha256', KEY).update(payload).digest('base64url');
    try {
      verifyPrincipalToken(`${payload}.${sig}`, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('malformed');
    }
  });

  it('rejects a signed payload that fails schema validation as malformed', () => {
    const payload = Buffer.from(JSON.stringify({ userId: 'u' })).toString('base64url');
    const sig = crypto.createHmac('sha256', KEY).update(payload).digest('base64url');
    try {
      verifyPrincipalToken(`${payload}.${sig}`, KEY);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PrincipalTokenError);
      expect((err as PrincipalTokenError).reason).toBe('malformed');
    }
  });

  it('compares signatures with crypto.timingSafeEqual', () => {
    const spy = vi.mocked(crypto.timingSafeEqual);
    spy.mockClear();
    const token = signPrincipalToken(PRINCIPAL, KEY);
    verifyPrincipalToken(token, KEY);
    expect(spy).toHaveBeenCalled();
  });
});
