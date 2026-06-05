import type { Permission } from '@adopt-dont-shop/lib.types';

import type { Principal } from './principal.js';

// Does the principal have this permission?
//
//   - `super_admin` role short-circuits to true (platform superuser).
//   - Every other role checks membership in `principal.permissions` —
//     the array sourced from the DB role/permission tables.
//
// This is the backend equivalent of the existing frontend
// `PermissionsService.hasPermission(...)` — same shape, same semantics,
// just synchronous because the principal already carries the answer.
export function hasPermission(principal: Principal, permission: Permission): boolean {
  if (principal.roles.includes('super_admin')) {
    return true;
  }
  return principal.permissions.includes(permission);
}
