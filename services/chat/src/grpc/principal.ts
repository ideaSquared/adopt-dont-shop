// Principal extractor for gRPC handlers.
//
// Every extracted service receives identity context as gRPC metadata
// headers from the gateway:
//
//   x-user-id           UUID of the calling user
//   x-user-roles        comma-separated UserRole list
//   x-user-permissions  comma-separated Permission list
//   x-rescue-id         (optional) rescueId for rescue-scoped roles
//
// The gateway populates these from the auth service's session lookup
// (Phase 2). Until that lands, the dev mode in service.backend stamps
// the same headers so the strangler-fig overlap works.
//
// extractPrincipal returns the principal shape that
// @adopt-dont-shop/authz.{hasPermission,requirePermission} expects.

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

  // permissions can legitimately be empty for unauthenticated-ish
  // scenarios (e.g. the dev role-switcher seed where adopters have
  // a hard-conditional rule set). Treat missing as "no permissions
  // beyond what the role grants".
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
