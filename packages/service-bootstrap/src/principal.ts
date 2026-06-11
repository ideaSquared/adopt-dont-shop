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

// extractPrincipalOptional — returns null if metadata is absent or incomplete.
// Used by public-read handlers (adaptUnauth) so they can pass null through
// to the handler rather than throwing.
export function extractPrincipalOptional(metadata: Metadata): Principal | null {
  try {
    return extractPrincipal(metadata);
  } catch {
    return null;
  }
}

// principalToMetadata — inverse of extractPrincipal. Serialises a Principal
// back into x-user-* metadata headers for outbound service-to-service calls.
// Used by services that forward the caller's identity to another service
// (e.g. applications → pets, matching → pets).
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
