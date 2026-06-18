// Principal and gRPC metadata builders for tests.
//
// These mirror the gateway's `x-user-*` metadata-stamping pattern
// (services/gateway/src/middleware/metadata.ts) so any test that needs
// to construct a realistic caller identity can do so without copy-pasting
// the same ad-hoc object literals into every test file.
//
// `testPrincipal(overrides?)` — builds a Principal with sensible defaults.
// `metadataFor(principal)` — serialises a Principal into gRPC Metadata,
//   stamping exactly the headers the gateway forwards:
//     x-user-id / x-user-roles / x-user-permissions / x-rescue-id

import { Metadata } from '@grpc/grpc-js';
import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

/**
 * Partial overrides accepted by `testPrincipal`. Every field is optional —
 * the builder fills sensible defaults for the rest.
 */
export type TestPrincipalOverrides = {
  userId?: UserId;
  roles?: UserRole[];
  permissions?: Permission[];
  rescueId?: RescueId;
};

/**
 * Build a test `Principal` with sensible defaults.
 *
 * @param overrides - Optional fields to override the defaults.
 * @returns A fully populated `Principal`.
 */
export const testPrincipal = (overrides: TestPrincipalOverrides = {}): Principal => ({
  userId: overrides.userId ?? ('usr-test' as UserId),
  roles: overrides.roles ?? (['adopter'] as UserRole[]),
  permissions: overrides.permissions ?? [],
  ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
});

/**
 * Serialise a `Principal` into gRPC `Metadata` using the same header names
 * the gateway stamps when forwarding an authenticated request to a downstream
 * service. Matches `services/gateway/src/middleware/metadata.ts`.
 *
 * Headers stamped:
 *   - `x-user-id`          — the user's UUID
 *   - `x-user-roles`       — comma-separated roles
 *   - `x-user-permissions` — comma-separated permissions (may be empty string)
 *   - `x-rescue-id`        — only set when `principal.rescueId` is defined
 *
 * @param principal - The principal to serialise.
 * @returns A populated `Metadata` instance ready to attach to a gRPC call.
 */
export const metadataFor = (principal: Principal): Metadata => {
  const m = new Metadata();
  m.set('x-user-id', principal.userId);
  m.set('x-user-roles', principal.roles.join(','));
  m.set('x-user-permissions', principal.permissions.join(','));
  if (principal.rescueId !== undefined) {
    m.set('x-rescue-id', principal.rescueId);
  }
  return m;
};
