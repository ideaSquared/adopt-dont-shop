import { Metadata } from '@grpc/grpc-js';

import {
  getDefaultPrincipalSigningKey,
  MIN_SIGNING_KEY_BYTES,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
  verifyPrincipalToken,
} from './principal-token.js';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

export class MissingPrincipalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingPrincipalError';
  }
}

// Thrown at boot when a service would run in production without the ability
// to verify signed principals (and without an explicit opt-in).
export class InsecurePrincipalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsecurePrincipalConfigError';
  }
}

// Environments where trusting unsigned x-user-* headers (no PRINCIPAL_SIGNING_KEY)
// is acceptable: only a developer's machine and the automated test run. Every
// other value — staging, production, or anything unrecognised/empty — is a
// deployed environment reachable by other actors and must fail closed.
const HEADER_TRUST_ALLOWED_ENVS = new Set(['development', 'test']);

// Boot-time guard (ADS-800 hardening, broadened in ADS-1050). Without
// PRINCIPAL_SIGNING_KEY, extractPrincipal falls back to trusting unsigned
// x-user-* headers. That is only safe for local development and the automated
// test run; in any DEPLOYED environment a missing key would silently let
// anything that can reach the service forge identity (e.g. x-user-roles: admin
// — the real cross-service authz boundary). So we fail closed everywhere the
// NODE_ENV is not development/test. An unset or unrecognised NODE_ENV is
// treated as deployed — the safe default.
export function assertPrincipalVerificationConfig(env: NodeJS.ProcessEnv = process.env): void {
  const key = getDefaultPrincipalSigningKey();
  if (key) {
    // Signed-token verification enabled — the secure path. Reject a weak key:
    // a short HMAC secret is offline-brute-forceable and would let an attacker
    // forge principal tokens trusted by every service.
    if (Buffer.byteLength(key, 'utf8') < MIN_SIGNING_KEY_BYTES) {
      throw new InsecurePrincipalConfigError(
        `PRINCIPAL_SIGNING_KEY must be at least ${MIN_SIGNING_KEY_BYTES} bytes`
      );
    }
    return;
  }
  // No key. Only development/test may fall back to header-trust.
  //
  // ALLOW_UNSIGNED_PRINCIPAL is deliberately NOT consulted here: it used to
  // force-open production (the second bypass ADS-1050 closes), and it must not
  // be able to open ANY deployed environment. In development/test the fallback
  // is already allowed, so the flag is now a no-op — tracked for full removal
  // from env docs under ADS-1039.
  const nodeEnv = env.NODE_ENV;
  if (nodeEnv !== undefined && HEADER_TRUST_ALLOWED_ENVS.has(nodeEnv)) {
    return;
  }
  throw new InsecurePrincipalConfigError(
    `PRINCIPAL_SIGNING_KEY is required outside development/test (NODE_ENV=${nodeEnv ?? '<unset>'}): ` +
      'without it the service trusts unsigned x-user-* headers, which any client that can ' +
      'reach it could forge. Set PRINCIPAL_SIGNING_KEY.'
  );
}

// Verification config (ADS-800). When a signing key is present the
// service REQUIRES a valid x-principal-token and takes the principal
// from the token payload — the x-user-* headers become informational,
// so a forged header can't win. When absent, the legacy header-trust
// behaviour is unchanged (phased rollout / dev without the key).
export type PrincipalVerification = {
  signingKey: string;
};

export function extractPrincipal(
  metadata: Metadata,
  verification?: PrincipalVerification
): Principal {
  if (verification) {
    const token = headerOne(metadata, PRINCIPAL_TOKEN_HEADER);
    if (!token) {
      throw new MissingPrincipalError(`missing ${PRINCIPAL_TOKEN_HEADER} metadata`);
    }
    // Throws PrincipalTokenError (→ UNAUTHENTICATED) on bad signature /
    // expiry / malformed payload.
    return verifyPrincipalToken(token, verification.signingKey);
  }

  const userId = headerOne(metadata, 'x-user-id');
  if (!userId) {
    throw new MissingPrincipalError('missing x-user-id metadata');
  }

  const rolesRaw = headerOne(metadata, 'x-user-roles');
  if (!rolesRaw) {
    throw new MissingPrincipalError('missing x-user-roles metadata');
  }

  const roles = rolesRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean) as UserRole[];

  const permissionsRaw = headerOne(metadata, 'x-user-permissions') ?? '';
  const permissions = permissionsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean) as Permission[];

  const rescueIdRaw = headerOne(metadata, 'x-rescue-id')?.trim();
  const rescueId = rescueIdRaw ? (rescueIdRaw as RescueId) : undefined;

  return {
    userId: userId as UserId,
    roles,
    permissions,
    rescueId,
  };
}

// extractPrincipalOptional — returns null if metadata is absent or incomplete.
// Used by public-read handlers (adaptUnauth) so they can pass null through
// to the handler rather than throwing. With verification enabled this is
// fail-closed: a missing OR invalid token yields null (unauthenticated),
// never a header-derived principal.
export function extractPrincipalOptional(
  metadata: Metadata,
  verification?: PrincipalVerification
): Principal | null {
  try {
    return extractPrincipal(metadata, verification);
  } catch {
    return null;
  }
}

export type PrincipalSigning = {
  signingKey: string;
  ttlMs?: number;
};

// principalToMetadata — inverse of extractPrincipal. Serialises a Principal
// back into x-user-* metadata headers for outbound service-to-service calls.
// Used by services that forward the caller's identity to another service
// (e.g. applications → pets, matching → pets).
//
// When a signing key is available — passed explicitly, or resolved from
// PRINCIPAL_SIGNING_KEY via config-secrets — the same principal is also
// stamped as a signed x-principal-token so a downstream service running
// with verification enabled accepts the forwarded call.
export function principalToMetadata(principal: Principal, signing?: PrincipalSigning): Metadata {
  const metadata = new Metadata();
  metadata.set('x-user-id', principal.userId);
  metadata.set('x-user-roles', principal.roles.join(','));
  metadata.set('x-user-permissions', principal.permissions.join(','));
  if (principal.rescueId !== undefined) {
    metadata.set('x-rescue-id', principal.rescueId);
  }
  const signingKey = signing?.signingKey ?? getDefaultPrincipalSigningKey();
  if (signingKey) {
    metadata.set(
      PRINCIPAL_TOKEN_HEADER,
      signPrincipalToken(principal, signingKey, { ttlMs: signing?.ttlMs })
    );
  }
  return metadata;
}

function headerOne(metadata: Metadata, key: string): string | undefined {
  const values = metadata.get(key);
  if (values.length === 0) {
    return undefined;
  }
  const first = values[0];
  return typeof first === 'string' ? first : first.toString();
}
