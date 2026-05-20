import { describe, it, expect, vi } from 'vitest';

// The global vitest setup mocks jsonwebtoken; restore the real
// implementation here so we exercise the actual algorithm allowlist
// (the whole point of ADS-590).
vi.unmock('jsonwebtoken');
const jwt = await vi.importActual<typeof import('jsonwebtoken')>('jsonwebtoken');

vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

// We deliberately bind verifyAccessToken to the real jwt above using
// vi.doMock so the helper sees the real implementation rather than the
// global mock.
vi.doMock('jsonwebtoken', () => jwt);
const { verifyAccessToken } = await import('./jwt');

const SECRET = 'test-jwt-secret-min-32-characters-long-12345';

describe('verifyAccessToken (ADS-590)', () => {
  it('accepts an HS256-signed token', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.c' }, SECRET, {
      algorithm: 'HS256',
    });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.email).toBe('a@b.c');
  });

  it('rejects an alg=none token', () => {
    // jsonwebtoken refuses to sign with alg=none without an explicit
    // empty key, so craft the token by hand.
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'u1', email: 'a@b.c' })).toString(
      'base64url'
    );
    const noneToken = `${header}.${payload}.`;
    expect(() => verifyAccessToken(noneToken)).toThrow();
  });

  it('rejects a token signed with a non-allowlisted algorithm', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.c' }, SECRET, {
      algorithm: 'HS384',
    });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('rejects a token with a bad signature', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.c' }, 'wrong-secret-min-32-chars-123456', {
      algorithm: 'HS256',
    });
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
