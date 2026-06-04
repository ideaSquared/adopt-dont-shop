import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';

import { hasPermission } from './has-permission.js';
import type { Principal } from './principal.js';

export type Scope = {
  // For rescue-scoped actions: the rescue the target entity belongs to.
  // `requirePermission` only allows the action when
  // `principal.rescueId === scope.rescueId`. Use this for any Pet, Application,
  // StaffMember, Invitation gate where the target is owned by a rescue.
  rescueId?: RescueId;
  // For self-only actions: the user the target entity belongs to.
  // `requirePermission` only allows the action when
  // `principal.userId === scope.userId`. Use this for any Application /
  // Chat / Notification / User gate where an adopter is acting on their
  // own record.
  userId?: UserId;
};

// requirePermission combines a permission check with an ownership / tenant
// scope check. Use this whenever a gate has to answer two questions:
//
//   (1) is this principal allowed to perform this action at all?
//   (2) is the target entity within their scope (own rescue, own record)?
//
// `super_admin` bypasses BOTH — it's a platform-wide superuser and isn't
// rescue-bound. For every other role:
//
//   - the permission must be in the principal's permissions array
//   - if `scope.rescueId` is supplied, `principal.rescueId` must match
//   - if `scope.userId` is supplied, `principal.userId` must match
//
// Scope is optional. When omitted, this degrades to a plain hasPermission
// check — useful for cross-cutting gates like `admin.audit_logs`.
//
// Both scope keys can be supplied at once. Both must match (logical AND) —
// e.g. an adopter writing a note on their own application would gate on
// `{ rescueId: app.rescueId, userId: app.adopterId }` and only succeed when
// the principal owns the application AND is the application's adopter.
// (Adopters typically wouldn't have `rescueId`, so this combo is rarely
// useful in practice — it's mainly here for documentation completeness.)
export function requirePermission(
  principal: Principal,
  permission: Permission,
  scope?: Scope
): boolean {
  if (principal.roles.includes('super_admin')) {
    return true;
  }
  if (!hasPermission(principal, permission)) {
    return false;
  }
  if (scope?.rescueId !== undefined && principal.rescueId !== scope.rescueId) {
    return false;
  }
  if (scope?.userId !== undefined && principal.userId !== scope.userId) {
    return false;
  }
  return true;
}
