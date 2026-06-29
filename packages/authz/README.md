# @adopt-dont-shop/authz

Backend-side authorisation helpers for the extracted microservices.
**Mirrors adopt-dont-shop's existing permission-string model** — same
`Permission` type from `lib.types`, same DB-driven Role → Permission
chain, same `super_admin` short-circuit. No new vocabulary, no CASL.

## Why this package exists

The frontend `PermissionsService` (in `lib.permissions`) calls the
backend to ask "does this user have permission X?". Each extracted
service (`services/auth`, `services/pets`, `services/rescue`, …) needs
the same answer locally without round-tripping the auth service every
request. This package is that local check.

The principal arrives via gRPC metadata (`x-user-id`, `x-user-roles`,
`x-user-permissions`, `x-rescue-id`) — populated at the gateway edge
from the auth service's session lookup — and every downstream service
runs `hasPermission(principal, '<perm>')` synchronously.

## API

### `Principal`

```ts
type Principal = {
  userId: UserId;
  roles: UserRole[];          // for super_admin short-circuit
  permissions: Permission[];  // authoritative — sourced from DB
  rescueId?: RescueId;        // tenant key for rescue_staff / admin
};
```

`permissions` is the authoritative source of truth. `roles` is only
consulted for the `super_admin` platform-superuser short-circuit; every
other gate runs against the permissions array.

### `hasPermission(principal, permission)`

Pure permission membership check. `super_admin` short-circuits.

```ts
hasPermission(principal, 'pets.update');       // true if 'pets.update' ∈ permissions
hasPermission(superAdmin, 'admin.audit_logs'); // true regardless of permissions array
```

### `requirePermission(principal, permission, scope?)`

Permission check + optional tenant/owner scope check.

```ts
// Plain check — no scope:
requirePermission(principal, 'admin.audit_logs');

// Rescue-scoped: principal.rescueId must equal scope.rescueId
requirePermission(principal, 'pets.update', { rescueId: pet.rescueId });

// Self-only: principal.userId must equal scope.userId
requirePermission(principal, 'applications.read', { userId: app.adopterId });

// Both — logical AND
requirePermission(principal, 'applications.approve', {
  rescueId: app.rescueId,
  userId: app.assignedReviewerId,
});
```

Returns `true` when:
- the principal has the `super_admin` role, OR
- the permission is in the principal's permissions array AND every
  supplied scope key matches the principal's own value.

## Relationship to other packages

- **`lib.types`** owns the `Permission` / `UserRole` types. Source of
  truth.
- **`lib.permissions`** owns the frontend-side service (`PermissionsService`,
  `FieldPermissionsService`). Continues to exist; this package is the
  backend complement, not a replacement.
- **`service.auth`** (Phase 2 — not yet built) will build the
  `permissions: Permission[]` array from the DB at login time and return
  it in the session payload that flows downstream.

## What's NOT here (intentionally)

- **Field-level permissions.** `lib.permissions/FieldPermissionsService`
  already handles per-field read/write masking via the `FieldPermission`
  model. This package is action-level only.
- **Permission discovery / mutation.** Listing or granting permissions is
  the auth service's job — this package only *checks* them.
- **Role hierarchy logic.** Roles are flat; the only role-aware rule is
  the `super_admin` short-circuit.
