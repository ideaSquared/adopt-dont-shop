// Principal extractor for gRPC handlers that REQUIRE a principal.
//
// Every extracted service receives identity context as gRPC metadata
// headers from the gateway:
//
//   x-user-id           UUID of the calling user
//   x-user-roles        comma-separated UserRole list
//   x-user-permissions  comma-separated Permission list
//   x-rescue-id         (optional) rescueId for rescue-scoped roles
//
// Direct port of services/rescue/src/grpc/principal.ts. All
// ApplicationService RPCs require a principal — there's no
// token-minting flow on this surface (auth handles that). Even
// `StartDraft` requires a principal because drafts are user-scoped.

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
// StartDraft uses this to forward the adopter's identity to
// service.pets (whose Get gate requires the caller's `pets.read`), so
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
