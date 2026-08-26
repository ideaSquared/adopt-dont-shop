import { Metadata } from '@grpc/grpc-js';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PRINCIPAL_TOKEN_HEADER,
  PrincipalTokenError,
  resetDefaultPrincipalSigningKeyForTests,
  signPrincipalToken,
  verifyPrincipalToken,
} from './principal-token.js';
import {
  assertPrincipalVerificationConfig,
  extractPrincipal,
  extractPrincipalOptional,
  InsecurePrincipalConfigError,
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

describe('assertPrincipalVerificationConfig', () => {
  const origKey = process.env.PRINCIPAL_SIGNING_KEY;

  afterEach(() => {
    if (origKey === undefined) {
      delete process.env.PRINCIPAL_SIGNING_KEY;
    } else {
      process.env.PRINCIPAL_SIGNING_KEY = origKey;
    }
    resetDefaultPrincipalSigningKeyForTests();
  });

  const withKey = (key: string | undefined): void => {
    if (key === undefined) {
      delete process.env.PRINCIPAL_SIGNING_KEY;
    } else {
      process.env.PRINCIPAL_SIGNING_KEY = key;
    }
    resetDefaultPrincipalSigningKeyForTests();
  };

  const STRONG_KEY = 'a-signing-key-that-is-at-least-32-bytes';

  describe('with a signing key configured (the secure path)', () => {
    it.each(['development', 'test', 'staging', 'production', 'qa', ''])(
      'does not throw for NODE_ENV=%j when a strong key is set',
      NODE_ENV => {
        withKey(STRONG_KEY);
        expect(() => assertPrincipalVerificationConfig({ NODE_ENV })).not.toThrow();
      }
    );

    it('does not throw for an unset NODE_ENV when a strong key is set', () => {
      withKey(STRONG_KEY);
      expect(() => assertPrincipalVerificationConfig({})).not.toThrow();
    });

    it('throws when the signing key is shorter than 32 bytes', () => {
      withKey('too-short-key');
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'production' })).toThrow(
        InsecurePrincipalConfigError
      );
    });
  });

  describe('without a signing key', () => {
    it('allows unsigned header-trust in development', () => {
      withKey(undefined);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'development' })).not.toThrow();
    });

    it('allows unsigned header-trust in test', () => {
      withKey(undefined);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'test' })).not.toThrow();
    });

    // ADS-1050: the bug being fixed. A staging deploy without the key must NOT
    // silently fall back to trusting forgeable x-user-* headers.
    it('fails closed in staging', () => {
      withKey(undefined);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'staging' })).toThrow(
        InsecurePrincipalConfigError
      );
    });

    it('fails closed in production', () => {
      withKey(undefined);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'production' })).toThrow(
        InsecurePrincipalConfigError
      );
    });

    it.each(['qa', 'staging-2', 'PRODUCTION', ''])(
      'fails closed for an unrecognised/empty NODE_ENV=%j (treated as deployed)',
      NODE_ENV => {
        withKey(undefined);
        expect(() => assertPrincipalVerificationConfig({ NODE_ENV })).toThrow(
          InsecurePrincipalConfigError
        );
      }
    );

    it('fails closed when NODE_ENV is unset (safe default)', () => {
      withKey(undefined);
      expect(() => assertPrincipalVerificationConfig({})).toThrow(InsecurePrincipalConfigError);
    });

    // ADS-1050: ALLOW_UNSIGNED_PRINCIPAL was a second bypass — it could
    // force-open production. It must no longer open ANY deployed environment.
    it.each(['production', 'staging', 'qa'])(
      'ALLOW_UNSIGNED_PRINCIPAL=true cannot force-open deployed NODE_ENV=%j',
      NODE_ENV => {
        withKey(undefined);
        expect(() =>
          assertPrincipalVerificationConfig({ NODE_ENV, ALLOW_UNSIGNED_PRINCIPAL: 'true' })
        ).toThrow(InsecurePrincipalConfigError);
      }
    );
  });

  // ADS-1259: getDefaultPrincipalSigningKey resolves PRINCIPAL_SIGNING_KEY via
  // config-secrets' readSecret with no env override, so it always reads the
  // real process.env — including NODE_ENV. A placeholder value long enough to
  // clear the 32-byte floor previously booted cleanly; it must now fail
  // closed in production, the same as every other runtime read path.
  describe('with a CHANGE_THIS-placeholder signing key (ADS-1259)', () => {
    const origNodeEnv = process.env.NODE_ENV;
    const PLACEHOLDER_KEY = 'CHANGE_THIS_principal_signing_key_placeholder_value';

    afterEach(() => {
      if (origNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('is long enough to clear the byte floor on its own', () => {
      expect(Buffer.byteLength(PLACEHOLDER_KEY, 'utf8')).toBeGreaterThanOrEqual(32);
    });

    it('fails boot in production with a clear error, not the byte-floor message', () => {
      process.env.NODE_ENV = 'production';
      withKey(PLACEHOLDER_KEY);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'production' })).toThrow(
        /PRINCIPAL_SIGNING_KEY is set to a placeholder value/
      );
    });

    it('does not fail boot in development (throwaway values are fine)', () => {
      process.env.NODE_ENV = 'development';
      withKey(PLACEHOLDER_KEY);
      expect(() => assertPrincipalVerificationConfig({ NODE_ENV: 'development' })).not.toThrow();
    });
  });
});
