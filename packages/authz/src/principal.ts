import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

// Identity payload passed across the wire to each backend service.
// Services reconstruct it from gRPC metadata (`x-user-id`, `x-roles`,
// `x-permissions`, `x-rescue-id`) and pass it into hasPermission /
// requirePermission. The shape matches what the existing
// `PermissionsService` already builds on the frontend — same names, same
// semantics, just usable from any extracted backend service.
//
// `permissions` is the authoritative source of truth. It's loaded from
// the DB via `User → UserRole → Role → RolePermission → Permission` at
// login time and flows with every request. `roles` is kept here for the
// super_admin short-circuit only; every other gate hits `permissions`.
//
// `rescueId` is the user's *home* rescue when they have one (rescue_staff,
// admin scoped to a single rescue). It's the tenant key — `requirePermission`
// compares it against `scope.rescueId` for rescue-scoped resources.
export type Principal = {
  userId: UserId;
  roles: UserRole[];
  permissions: Permission[];
  rescueId?: RescueId;
};
