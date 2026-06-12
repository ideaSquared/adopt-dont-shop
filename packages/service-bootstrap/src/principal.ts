import { Metadata } from '@grpc/grpc-js';

import {
  getDefaultPrincipalSigningKey,
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
