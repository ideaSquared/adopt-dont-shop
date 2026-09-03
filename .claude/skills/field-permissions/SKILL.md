---
name: field-permissions
description: >
  Backend: field-level read/write access control by role. Apply when a gRPC handler must
  mask response fields or reject writes to fields a role cannot set, when editing the
  field-permission defaults in lib.types, or when working with the auth service's
  field-permission override RPCs. Covers resolveFieldAccessMap, fieldMask, fieldWriteGuard.
---

# Field-Level Permissions (backend)

Controls which fields each role may **read** or **write** on each resource, on
top of the coarse `requirePermission` check. There is no Express middleware and
no `FieldPermission` Sequelize model — enforcement is three pure functions from
`@adopt-dont-shop/authz`, called **inside the owning service's gRPC handler**.

## The model

Every field resolves to one of `'none' | 'read' | 'write'`. A field absent from
the map is `none` (secure by default). The effective map is built in three
stages by `resolveFieldAccessMap`:

1. **Role defaults union** — each of the principal's roles contributes its
   default map (`lib.types`), merged most-permissive-per-field.
2. **Admin overrides** — an optional pre-resolved map (from the `field_permissions`
   DB table) applied on top; unlike the role union it **replaces** a field's
   level, so it can both loosen and _restrict_.
3. **Sensitive-field denylist** — re-applied last so `password` / token / secret
   fields are always `none`, whatever the earlier layers said.

Four resources exist: `users`, `pets`, `applications`, `rescues`.

## Key files

| File                                                                                                                                    | What it is                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`packages/authz/src/field-access.ts`](../../../packages/authz/src/field-access.ts)                                                     | `resolveFieldAccessMap(resource, roles, overrides?)` → `FieldAccessMap`                                             |
| [`packages/authz/src/field-mask.ts`](../../../packages/authz/src/field-mask.ts)                                                         | `fieldMask(payload, accessMap)` → `Partial<T>` (read masking)                                                       |
| [`packages/authz/src/field-write-guard.ts`](../../../packages/authz/src/field-write-guard.ts)                                           | `fieldWriteGuard(body, accessMap)` → `{ allowed }` / `{ allowed: false, blockedFields }`                            |
| [`packages/lib.types/src/config/field-permission-defaults.ts`](../../../packages/lib.types/src/config/field-permission-defaults.ts)     | Per-resource, per-role default maps + `SENSITIVE_FIELD_DENYLIST` + `getFieldAccessMap` / `enforceSensitiveDenylist` |
| [`packages/lib.types/src/types/field-permissions.ts`](../../../packages/lib.types/src/types/field-permissions.ts)                       | `FieldAccessLevel`, `FieldPermissionResource`, `FieldPermissionConfig`                                              |
| [`services/rescue/src/grpc/handlers.ts`](../../../services/rescue/src/grpc/handlers.ts)                                                 | The one live consumer today — copy this pattern                                                                     |
| [`services/auth/src/migrations/009_create_field_permissions.ts`](../../../services/auth/src/migrations/009_create_field_permissions.ts) | The `field_permissions` DB table (auth schema)                                                                      |
| [`apps/admin/src/pages/FieldPermissions.tsx`](../../../apps/admin/src/pages/FieldPermissions.tsx)                                       | Admin UI to edit overrides                                                                                          |

## The rule: enforce in the owning service, never at the gateway

`fieldMask` and `fieldWriteGuard` are called at the serialisation / validation
boundary of the service that owns the data. A direct gRPC caller must not be
able to bypass them, so the gateway (which forwards raw requests) is the wrong
place. See [`docs/adr/0006-field-permission-enforcement.md`](../../../docs/adr/0006-field-permission-enforcement.md).

## Read masking

Resolve the map once, mask the response object before returning it:

```ts
import { fieldMask, resolveFieldAccessMap } from '@adopt-dont-shop/authz';

const accessMap = resolveFieldAccessMap('rescues', principal.roles);
return { ...ZERO_RESCUE, ...fieldMask(rescueProto, accessMap) };
```

`fieldMask` drops every key not resolved to `read` or `write`. Spreading over a
zero-valued proto keeps the response shape well-typed (proto3 required scalars)
while the masked-out fields fall back to their zero value.

For anonymous / public reads, use a fixed public access map rather than a role
lookup (rescue handlers keep a `PUBLIC_RESCUE_ACCESS_MAP` for this).

## Write guarding

Collect only the fields the request actually sets (`!== undefined`), guard, and
reject the whole write on failure:

```ts
import { fieldWriteGuard, resolveFieldAccessMap } from '@adopt-dont-shop/authz';

const accessMap = resolveFieldAccessMap('rescues', principal.roles);
const check = fieldWriteGuard(requestedFields, accessMap);
if (!check.allowed) {
  throw new HandlerError(
    'PERMISSION_DENIED',
    `cannot write field(s): ${check.blockedFields.join(', ')}`
  );
}
```

The guard rejects the entire request if any submitted field lacks `write` — it
never partially applies. Run it before building any SQL.

## Admin-managed overrides (DB layer)

Overrides live in the `field_permissions` table (auth schema) and are edited via
`AuthService` RPCs, not a REST CRUD router
([`packages/proto/proto/adopt_dont_shop/auth/v1/auth.proto`](../../../packages/proto/proto/adopt_dont_shop/auth/v1/auth.proto)):
`GetFieldPermissionDefaults` / `GetFieldPermissionDefaultsForRole`,
`ListFieldPermissionOverrides` / `ListFieldPermissionOverridesForRole`,
`UpsertFieldPermission`, `BulkUpsertFieldPermissions`, `DeleteFieldPermission`.
Read RPCs require `admin.field_permissions.read`; writes require
`admin.field_permissions.write`. The auth service rejects overrides that would
expose a denylisted field. A consuming service that wants DB overrides applied
fetches them (via the gateway/auth) and passes them as the third
`overrides` argument to `resolveFieldAccessMap`; no service wires a live
override source yet, so most call sites pass two arguments.

## Adding a new field

1. Add the field key to **every** role for the resource in
   `field-permission-defaults.ts`, using the casing the handler's proto response
   emits. Absent keys silently mask to `none`.
2. If it is a secret, add it to `SENSITIVE_FIELD_DENYLIST` so it can never be
   granted.
3. Rebuild lib.types (`pnpm --filter @adopt-dont-shop/lib.types build`) if
   consuming a built artifact; in dev the Vite/tsx alias picks up source.

## Common mistakes

- Trying to call `fieldMask` / `fieldWriteGuard` at the gateway — enforce in the
  owning service.
- Passing arguments in the wrong order: it is `resolveFieldAccessMap(resource, roles)`,
  `fieldMask(payload, accessMap)`, `fieldWriteGuard(body, accessMap)`.
- Guarding the full request object instead of just the supplied (`!== undefined`)
  fields — you will block writes the caller never attempted.
- Field key casing not matching the proto response keys — the field masks to
  `none` silently.

Canonical doc: [`docs/adr/0006-field-permission-enforcement.md`](../../../docs/adr/0006-field-permission-enforcement.md).
