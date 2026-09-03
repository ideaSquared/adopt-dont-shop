# @adopt-dont-shop/authz

## Purpose

Backend-side authorisation helpers for the extracted microservices. **Mirrors
adopt-dont-shop's existing permission-string model** — same `Permission` type
from `lib.types`, same DB-driven Role → Permission chain, same `super_admin`
short-circuit. No new vocabulary, no CASL. The frontend `PermissionsService`
(in `lib.permissions`) asks the backend "does this user have permission X?";
each extracted service needs the same answer locally without round-tripping the
auth service every request — this package is that local, synchronous check.

This is a service-only shared package (not a `lib.*`) — imported by
`services/*` gRPC handlers. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. The principal arrives via gRPC metadata (`x-user-id`,
`x-user-roles`, `x-user-permissions`, `x-rescue-id`) — populated at the gateway
edge from `service.auth`'s session lookup — and every downstream service runs
`hasPermission(principal, '<perm>')` synchronously. `lib.types` owns the
`Permission` / `UserRole` types (source of truth); `lib.permissions` owns the
frontend-side services; this package is the backend complement, not a
replacement.

## Scripts

```bash
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `Principal` type — `{ userId, roles, permissions, rescueId? }`. `permissions`
  is authoritative; `roles` is consulted only for the `super_admin`
  short-circuit.
- `hasPermission(principal, permission)` — pure membership check;
  `super_admin` short-circuits.
- `requirePermission(principal, permission, scope?)` — permission check plus an
  optional tenant/owner scope (`{ rescueId?, userId? }`, logical AND); throws
  when the permission is absent or a scope key doesn't match the principal's
  own value.
- `resolveFieldAccessMap(resource, roles, overrides?)` — resolves the effective
  per-field access map (`Record<field, 'none' | 'read' | 'write'>`) for a
  principal on one resource: role defaults unioned (most-permissive), admin
  overrides applied on top (can restrict), sensitive-field denylist last.
- `fieldMask(payload, accessMap)` — read-side response masking; strips every key
  not resolved to `read`/`write` (absent keys hidden by default).
- `fieldWriteGuard(body, accessMap)` — write-side request guard; returns
  `{ allowed: false, blockedFields }` if any submitted key is not `write`.

Field masking and write-guarding must be called at the **owning service's**
handler boundary, never at the gateway — a direct gRPC caller must not be able
to bypass them. See
[`docs/adr/0006-field-permission-enforcement.md`](../../docs/adr/0006-field-permission-enforcement.md);
the field-permission **defaults** live in `lib.types`
(`config/field-permission-defaults.ts`) and DB overrides are edited via the auth
service's field-permission RPCs.

Intentionally **not** here: permission discovery/mutation (the auth service's
job) and role-hierarchy logic (roles are flat). The frontend field-level
services live in `lib.permissions/FieldPermissionsService`.

## Environment variables consumed

None — every check is pure over the passed-in `Principal`.

## Testing notes

Vitest — the checks are pure functions, so the suite asserts each
permission/scope/`super_admin` path directly with hand-built principals. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
