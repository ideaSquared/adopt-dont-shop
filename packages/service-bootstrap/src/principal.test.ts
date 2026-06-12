import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import {
  PRINCIPAL_TOKEN_HEADER,
  PrincipalTokenError,
  signPrincipalToken,
  verifyPrincipalToken,
} from './principal-token.js';
import {
  extractPrincipal,
  extractPrincipalOptional,
  MissingPrincipalError,
  principalToMetadata,
} from './principal.js';

function build(headers: Record<string, string>): Metadata {
  const m = new Metadata();
  for (const [k, v] of Object.entries(headers)) m.set(k, v);
  return m;
}

describe('extractPrincipal', () => {
  it('throws MissingPrincipalError when x-user-id is absent', () => {
    expect(() => extractPrincipal(build({ 'x-user-roles': 'adopter' }))).toThrowError(
      MissingPrincipalError
    );
  });

  it('throws MissingPrincipalError when x-user-roles is absent', () => {
    expect(() => extractPrincipal(build({ 'x-user-id': 'u' }))).toThrowError(MissingPrincipalError);
  });

  it('parses comma-separated roles + permissions', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-1',
        'x-user-roles': 'rescue_staff, admin',
        'x-user-permissions': 'pets.read , pets.update',
      })
    );
    expect(p.userId).toBe('usr-1');
    expect(p.roles).toEqual(['rescue_staff', 'admin']);
    expect(p.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it('carries x-rescue-id when present', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'u',
        'x-user-roles': 'rescue_staff',
        'x-rescue-id': 'rsc-42',
      })
    );
    expect(p.rescueId).toBe('rsc-42');
  });

  it('treats missing x-user-permissions as empty list', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'u',
        'x-user-roles': 'adopter',
      })
    );
    expect(p.permissions).toEqual([]);
  });
});

const SIGNING_KEY = 'principal-test-key';

const TOKEN_PRINCIPAL = {
  userId: 'usr-token',
  roles: ['rescue_staff'],
  permissions: ['pets.read'],
  rescueId: 'rsc-token',
};

describe('extractPrincipal — with verification (signing key set)', () => {
  it('accepts a valid token and takes the principal from the token payload', () => {
    const token = signPrincipalToken(TOKEN_PRINCIPAL, SIGNING_KEY);
    const p = extractPrincipal(build({ [PRINCIPAL_TOKEN_HEADER]: token }), {
      signingKey: SIGNING_KEY,
    });
    expect(p).toEqual(TOKEN_PRINCIPAL);
  });

  it('rejects a request with no token even when x-user-* headers are present', () => {
    const m = build({
      'x-user-id': 'attacker',
      'x-user-roles': 'super_admin',
      'x-user-permissions': 'admin.security.manage',
    });
    expect(() => extractPrincipal(m, { signingKey: SIGNING_KEY })).toThrowError(
      MissingPrincipalError
    );
  });

  it('forged headers alongside a valid token: the token payload wins', () => {
    const token = signPrincipalToken(TOKEN_PRINCIPAL, SIGNING_KEY);
    const m = build({
      [PRINCIPAL_TOKEN_HEADER]: token,
      'x-user-id': 'attacker',
      'x-user-roles': 'super_admin',
      'x-user-permissions': 'admin.security.manage',
      'x-rescue-id': 'rsc-attacker',
    });
    const p = extractPrincipal(m, { signingKey: SIGNING_KEY });
    expect(p.userId).toBe('usr-token');
    expect(p.roles).toEqual(['rescue_staff']);
    expect(p.permissions).toEqual(['pets.read']);
    expect(p.rescueId).toBe('rsc-token');
  });

  it('rejects a token signed with the wrong key', () => {
    const token = signPrincipalToken(TOKEN_PRINCIPAL, 'wrong-key');
    expect(() =>
      extractPrincipal(build({ [PRINCIPAL_TOKEN_HEADER]: token }), { signingKey: SIGNING_KEY })
    ).toThrowError(PrincipalTokenError);
  });

  it('rejects an expired token', () => {
    const token = signPrincipalToken(TOKEN_PRINCIPAL, SIGNING_KEY, { ttlMs: -1 });
    expect(() =>
      extractPrincipal(build({ [PRINCIPAL_TOKEN_HEADER]: token }), { signingKey: SIGNING_KEY })
    ).toThrowError(PrincipalTokenError);
  });
});

describe('extractPrincipalOptional — with verification (signing key set)', () => {
  it('returns null when no token is present (even with forged headers)', () => {
    const m = build({ 'x-user-id': 'attacker', 'x-user-roles': 'super_admin' });
    expect(extractPrincipalOptional(m, { signingKey: SIGNING_KEY })).toBeNull();
  });

  it('returns null for an invalid token rather than trusting headers', () => {
    const m = build({
      [PRINCIPAL_TOKEN_HEADER]: signPrincipalToken(TOKEN_PRINCIPAL, 'wrong-key'),
      'x-user-id': 'attacker',
      'x-user-roles': 'super_admin',
    });
    expect(extractPrincipalOptional(m, { signingKey: SIGNING_KEY })).toBeNull();
  });

  it('returns the token principal for a valid token', () => {
    const m = build({
      [PRINCIPAL_TOKEN_HEADER]: signPrincipalToken(TOKEN_PRINCIPAL, SIGNING_KEY),
    });
    expect(extractPrincipalOptional(m, { signingKey: SIGNING_KEY })?.userId).toBe('usr-token');
  });
});

describe('principalToMetadata — signing', () => {
  const principal = extractPrincipal(
    build({
      'x-user-id': 'usr-fwd',
      'x-user-roles': 'rescue_staff',
      'x-user-permissions': 'pets.read',
      'x-rescue-id': 'rsc-9',
    })
  );

  it('stamps x-principal-token when a signing key is supplied', () => {
    const m = principalToMetadata(principal, { signingKey: SIGNING_KEY });
    const token = m.get(PRINCIPAL_TOKEN_HEADER)[0];
    expect(typeof token).toBe('string');
    expect(verifyPrincipalToken(String(token), SIGNING_KEY)).toEqual(principal);
  });

  it('round-trips through extractPrincipal with verification enabled', () => {
    const m = principalToMetadata(principal, { signingKey: SIGNING_KEY });
    expect(extractPrincipal(m, { signingKey: SIGNING_KEY })).toEqual(principal);
  });

  it('does not stamp a token when no signing key is configured', () => {
    const m = principalToMetadata(principal);
    expect(m.get(PRINCIPAL_TOKEN_HEADER)).toHaveLength(0);
  });
});

describe('extractPrincipalOptional', () => {
  it('returns null when x-user-id is absent', () => {
    expect(extractPrincipalOptional(build({}))).toBeNull();
  });

  it('returns null when x-user-roles is absent', () => {
    expect(extractPrincipalOptional(build({ 'x-user-id': 'u' }))).toBeNull();
  });

  it('returns the principal when headers are present', () => {
    const p = extractPrincipalOptional(
      build({
        'x-user-id': 'usr-2',
        'x-user-roles': 'admin',
        'x-user-permissions': 'pets.read',
      })
    );
    expect(p).not.toBeNull();
    expect(p?.userId).toBe('usr-2');
  });
});
