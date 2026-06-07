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
  return { userId: userId as UserId, roles, permissions, rescueId };
}

// extractPrincipalOptional — returns null if metadata is absent. Used
// by public-read handlers so they can short-circuit without throwing.
export function extractPrincipalOptional(metadata: Metadata): Principal | null {
  try {
    return extractPrincipal(metadata);
  } catch {
    return null;
  }
}

function headerOne(metadata: Metadata, key: string): string | undefined {
  const values = metadata.get(key);
  if (values.length === 0) {
    return undefined;
  }
  const first = values[0];
  return typeof first === 'string' ? first : first.toString();
}
