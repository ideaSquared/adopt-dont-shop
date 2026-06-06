// Principal extractor for gRPC handlers that REQUIRE a principal.
//
// Direct port of services/rescue/src/grpc/principal.ts. Note: most
// MatchingService RPCs are session-scoped to the calling user, so a
// principal is required for StartSession / EndSession / Recommend /
// RecordSwipe / ListSwipeHistory. SearchPets is the one anonymous
// surface (matches the monolith's public /api/search/*); the gateway
// will route it through an unauth adapter variant in Phase 9.3c.

import { Metadata } from '@grpc/grpc-js';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

export class MissingPrincipalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingPrincipalError';
  }
}

export function extractPrincipal(metadata: Metadata): Principal {
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

// Inverse of extractPrincipal — serialises a Principal back into the
// x-user-* metadata headers for an OUTBOUND service-to-service call.
// Recommend + SearchPets use this to forward the caller's identity to
// service.pets (whose List gate requires the caller's `pets.read`), so
// the downstream service runs its own authz against the real principal
// rather than a synthesized system identity.
export function principalToMetadata(principal: Principal): Metadata {
  const metadata = new Metadata();
  metadata.set('x-user-id', principal.userId);
  metadata.set('x-user-roles', principal.roles.join(','));
  metadata.set('x-user-permissions', principal.permissions.join(','));
  if (principal.rescueId !== undefined) {
    metadata.set('x-rescue-id', principal.rescueId);
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
