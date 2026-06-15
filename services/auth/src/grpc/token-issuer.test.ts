import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { createJwtTokenIssuer } from './token-issuer.js';

const cfg = {
  accessSecret: 'access-secret-' + 'x'.repeat(32),
  refreshSecret: 'refresh-secret-' + 'x'.repeat(32),
};

describe('createJwtTokenIssuer', () => {
  it('mints a pair with non-empty access + refresh tokens', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    expect(minted.pair.accessToken).toMatch(/^eyJ/);
    expect(minted.pair.refreshToken).toMatch(/^eyJ/);
    expect(minted.accessJti).toMatch(/^[0-9a-f-]{36}$/);
    expect(minted.refreshJti).toMatch(/^[0-9a-f-]{36}$/);
    expect(minted.accessExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(minted.refreshExpiresAt.getTime()).toBeGreaterThan(minted.accessExpiresAt.getTime());
  });

  it('verifyAccess round-trips the claims it minted', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    const claims = await issuer.verifyAccess(minted.pair.accessToken);
    expect(claims.sub).toBe('usr-1');
    expect(claims.jti).toBe(minted.accessJti);
  });

  it('verifyRefresh round-trips the claims it minted', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    const claims = await issuer.verifyRefresh(minted.pair.refreshToken);
    expect(claims.sub).toBe('usr-1');
    expect(claims.jti).toBe(minted.refreshJti);
  });

  it('verifyAccess REJECTS a refresh token (distinct secrets)', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    await expect(issuer.verifyAccess(minted.pair.refreshToken)).rejects.toThrowError();
  });

  it('verifyRefresh REJECTS an access token (distinct secrets)', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    await expect(issuer.verifyRefresh(minted.pair.accessToken)).rejects.toThrowError();
  });

  it('verifyAccess rejects a tampered token', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const minted = await issuer.mint('usr-1');
    const tampered = minted.pair.accessToken.slice(0, -3) + 'AAA';
    await expect(issuer.verifyAccess(tampered)).rejects.toThrowError();
  });

  it('verifyAccess REJECTS a token signed with a non-HS256 algorithm (algorithm pinning)', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const now = Math.floor(Date.now() / 1000);
    // A valid HMAC token over the SAME secret but with HS512 instead of the
    // pinned HS256 — must be rejected so an attacker can't substitute the
    // signing algorithm.
    const hs512 = jwt.sign(
      { sub: 'usr-1', jti: 'j1', iat: now, exp: now + 600 },
      cfg.accessSecret,
      { algorithm: 'HS512' }
    );
    await expect(issuer.verifyAccess(hs512)).rejects.toThrowError();
  });

  it('verifyRefresh REJECTS a token signed with a non-HS256 algorithm (algorithm pinning)', async () => {
    const issuer = createJwtTokenIssuer(cfg);
    const now = Math.floor(Date.now() / 1000);
    const hs512 = jwt.sign(
      { sub: 'usr-1', jti: 'j1', iat: now, exp: now + 600 },
      cfg.refreshSecret,
      { algorithm: 'HS512' }
    );
    await expect(issuer.verifyRefresh(hs512)).rejects.toThrowError();
  });
});
