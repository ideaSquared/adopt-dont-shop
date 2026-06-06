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
// Direct port of services/pets/src/grpc/principal.ts. All six
// RescueService RPCs require a principal — no token-minting flow here.

import type { Metadata } from '@grpc/grpc-js';

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

function headerOne(metadata: Metadata, key: string): string | undefined {
  const values = metadata.get(key);
  if (values.length === 0) {
    return undefined;
  }
  const first = values[0];
  return typeof first === 'string' ? first : first.toString();
}
