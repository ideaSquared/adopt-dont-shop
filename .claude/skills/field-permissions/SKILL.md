---
name: field-permissions
description: >
  Field-level permission system for controlling per-field read/write access by role.
  Apply when working with field masking middleware, field permission defaults, the
  FieldPermission model, admin field-permission CRUD routes, or any route that uses
  fieldMask or fieldWriteGuard.
---

# Field-Level Permissions

## Architecture Overview

Field-level permissions control which fields each role can read or write on each resource.
Three layers combine at request time (lowest to highest precedence):

1. **Hardcoded defaults** (lib.types) -- the baseline per-resource, per-role access map
2. **Database overrides** (field_permissions table) -- admin-managed per-field tweaks
3. **Sensitive-field denylist** (lib.types) -- hard-sets certain fields to `none`; cannot be
   loosened by overrides or defaults

Unlisted fields default to `none` (secure by default).

```
Request --> auth middleware --> fieldMask / fieldWriteGuard --> controller
                                   |
                          defaults + DB overrides + denylist
                                   |
                          effective access map
```

## Key Files

### Source of Truth (lib.types)

| File | What it does |
|------|-------------|
| `lib.types/src/types/field-permissions.ts` | Canonical types: `FieldAccessLevel`, `FieldPermissionResource`, `FieldPermissionConfig` |
| `lib.types/src/config/field-permission-defaults.ts` | Default access maps for all 4 resources x 4 roles, `SENSITIVE_FIELD_DENYLIST`, `enforceSensitiveDenylist()`, `getFieldAccessMap()`, `getDefaultFieldAccess()`, `isSensitiveField()` |
| `lib.types/src/index.ts` | Re-exports everything above |

### Backend Middleware and Service

| File | What it does |
|------|-------------|
| `service.backend/src/middleware/field-permissions.ts` | `fieldMask()` (read masking), `fieldWriteGuard()` (write blocking), `maskResponseFields()`, `clearFieldPermissionCache()` |
| `service.backend/src/services/field-permission.service.ts` | CRUD for DB overrides: `upsert`, `bulkUpsert`, `deleteOverride`, `getByResource`, `getByResourceAndRole` |
| `service.backend/src/models/FieldPermission.ts` | Sequelize model for `field_permissions` table (resource + field_name + role unique constraint) |
| `service.backend/src/routes/field-permissions.routes.ts` | Admin-only CRUD API at `/api/v1/field-permissions/*` |

### Frontend

| File | What it does |
|------|-------------|
| `app.admin/src/pages/FieldPermissions.tsx` | Admin UI for viewing/editing overrides per resource and role |
| `lib.permissions/src/services/field-permissions-service.ts` | Client-side SDK: `getFieldAccess()`, `getEffectiveAccessMap()`, `maskFields()` with 60s cache |

### Tests

| File | What it tests |
|------|-------------|
| `service.backend/src/__tests__/middleware/field-permissions.test.ts` | Middleware masking, write guard, sensitive field enforcement, DB-failure graceful fallback |
| `app.admin/src/__tests__/field-permissions.behavior.test.tsx` | Admin UI page behavior (save, delete, tab switching, error states) |
| `lib.permissions/src/config/__tests__/field-permission-defaults.test.ts` | All resources have all roles, sensitive fields always hidden |

## The Four Resources

| Resource | Key casing in toJSON() | Notes |
|----------|----------------------|-------|
| `users` | camelCase (`firstName`, `email`) | Includes snake_case request aliases (`first_name`, `phone_number`) for `fieldWriteGuard` compatibility |
| `pets` | snake_case (`pet_id`, `short_description`) | Includes camelCase request aliases (`ageYears`, `adoptionFee`) for write guard |
| `applications` | Dual: camelCase response keys + snake_case request keys | Response from controller uses camelCase (`petId`), POST body uses snake_case (`pet_id`) |
| `rescues` | camelCase (`rescueId`, `readableId`) | Internal settings and verification state restricted |

## Route-Level Usage

### fieldMask (read masking) -- 8 endpoints

Applied to GET routes. Intercepts `res.json()` to strip fields the user's role cannot read.

```
GET  /users/profile              fieldMask('users', { audit: true })
GET  /users/search               fieldMask('users', { audit: true })
GET  /users/:userId              fieldMask('users', { audit: true, resourceIdParam: 'userId' })
GET  /rescues                    fieldMask('rescues')
GET  /rescues/:rescueId          fieldMask('rescues', { audit: true, resourceIdParam: 'rescueId' })
GET  /pets                       fieldMask('pets')
GET  /pets/:petId                fieldMask('pets', { resourceIdParam: 'petId' })
GET  /applications               fieldMask('applications', { audit: true })
GET  /applications/:applicationId fieldMask('applications', { audit: true, resourceIdParam: 'applicationId' })
```

### fieldWriteGuard (write blocking) -- 7 endpoints

Applied to POST/PUT/PATCH routes. Rejects request body fields the user's role cannot write.

```
PUT   /users/profile              fieldWriteGuard('users', { audit: true })
PUT   /users/:userId              fieldWriteGuard('users', { audit: true, resourceIdParam: 'userId' })
POST  /rescues                    fieldWriteGuard('rescues', { audit: true })
PUT   /rescues/:rescueId          fieldWriteGuard('rescues', { audit: true, resourceIdParam: 'rescueId' })
PATCH /rescues/:rescueId          fieldWriteGuard('rescues', { audit: true, resourceIdParam: 'rescueId' })
POST  /pets                       fieldWriteGuard('pets', { audit: true })
PUT   /pets/:petId                fieldWriteGuard('pets', { audit: true, resourceIdParam: 'petId' })
PATCH /pets/:petId                fieldWriteGuard('pets', { audit: true, resourceIdParam: 'petId' })
POST  /applications               fieldWriteGuard('applications', { audit: true })
PUT   /applications/:applicationId fieldWriteGuard('applications', { audit: true, resourceIdParam: 'applicationId' })
```

### Middleware ordering on routes

Place field permission middleware AFTER auth/RBAC but BEFORE validation/controller:

```typescript
router.get('/:userId',
  authenticateToken,                                    // 1. Auth
  requirePermissionOrOwnership(PERMISSIONS.USER_READ),  // 2. RBAC
  fieldMask('users', { audit: true }),                  // 3. Field masking
  UserController.getUserById                            // 4. Controller
);

router.put('/:userId',
  authenticateToken,
  requirePermissionOrOwnership(PERMISSIONS.USER_UPDATE),
  fieldWriteGuard('users', { audit: true }),            // Blocks forbidden body fields
  userValidation.updateProfile,                         // Validation runs on allowed fields only
  UserController.updateUser
);
```

## Admin API (field-permissions.routes.ts)

All endpoints require `authenticateToken` + `requireRole(UserType.ADMIN)`.

```
GET    /api/v1/field-permissions/defaults                  All defaults for all resources/roles
GET    /api/v1/field-permissions/defaults/:resource/:role   Default access map for one resource+role
GET    /api/v1/field-permissions/:resource                  All DB overrides for a resource
GET    /api/v1/field-permissions/:resource/:role            DB overrides for resource+role
POST   /api/v1/field-permissions                            Upsert single override
POST   /api/v1/field-permissions/bulk                       Bulk upsert overrides
DELETE /api/v1/field-permissions/:resource/:role/:field_name Delete one override (reverts to default)
```

POST body (single):
```json
{ "resource": "users", "field_name": "email", "role": "adopter", "access_level": "read" }
```

POST body (bulk):
```json
{ "overrides": [
    { "resource": "users", "field_name": "email", "role": "adopter", "access_level": "read" },
    { "resource": "pets", "field_name": "medical_notes", "role": "adopter", "access_level": "none" }
  ]
}
```

Sensitive fields (`password`, `resetToken`, `twoFactorSecret`, `backupCodes`, etc.) are
rejected at the API level and re-enforced by middleware, so overrides can never expose them.

## Adding a New Field

When adding a new attribute to a Sequelize model:

1. **Add to defaults** in `lib.types/src/config/field-permission-defaults.ts`:
   - Add the field key to ALL 4 roles for the resource
   - Use the casing that the model's `toJSON()` emits (camelCase for users/rescues, snake_case for pets/applications)
   - If the request body uses different casing, also add an alias (see `userRequestAliases` / `petRequestAliases` patterns)
   - Set appropriate access: `WRITE` for owner-editable, `READ` for visible, `NONE` for restricted

2. **Rebuild lib.types**: `cd lib.types && npm run build`

3. **No backend changes needed** unless you want a different default than the resource's existing pattern

4. **If the field is sensitive** (passwords, tokens, secrets): add it to `SENSITIVE_FIELD_DENYLIST`

## Adding a New Resource

1. Add the resource name to `FieldPermissionResource` in `lib.types/src/types/field-permissions.ts`
2. Add a default config block in `lib.types/src/config/field-permission-defaults.ts` (all 4 roles)
3. Add the resource to `SENSITIVE_FIELD_DENYLIST` (even if empty: `myResource: []`)
4. Add the resource to `FieldPermissionResource` enum in `service.backend/src/models/FieldPermission.ts`
5. Apply `fieldMask('myResource')` and `fieldWriteGuard('myResource')` to routes

## Casing Rules

The field name keys in defaults MUST match the Sequelize model's `toJSON()` output:

| Model config | toJSON output | Default key style |
|-------------|--------------|-------------------|
| `underscored: true` + camelCase attrs | camelCase | `firstName`, `email` |
| snake_case attrs directly | snake_case | `pet_id`, `short_description` |

If request bodies use different casing than responses (common for users and pets), add
request-body aliases so `fieldWriteGuard` can match `req.body` keys against the access map.

## Middleware Behavior

### fieldMask (response interceptor)

- Replaces `res.json()` with a version that filters fields before sending
- Handles three response shapes:
  - `{ data: {...} }` or `{ success: true, data: {...} }` -- masks data
  - `{ [resource]: [...] }` -- masks the nested resource array (e.g. search results)
  - Direct resource object -- masks if keys overlap with access map
- Error responses (`{ error: ... }`) and non-resource payloads pass through untouched
- Unauthenticated requests are treated as `adopter` role (most restrictive)
- Sequelize model instances are normalized via `toJSON()` before masking

### fieldWriteGuard (request validator)

- Checks every key in `req.body` against the access map
- Returns 403 with `{ blockedFields: [...] }` if any field lacks `write` access
- Requires authentication (returns 401 without it)

### Override caching

- 60-second TTL cache keyed by `resource:role`
- Call `clearFieldPermissionCache(resource, role)` after mutating overrides
- The service layer clears the cache automatically on upsert/delete

## Security Guarantees

1. **Secure by default**: fields not in the access map are excluded
2. **Sensitive denylist**: `password`, `resetToken`, `resetTokenExpiration`, `resetTokenForceFlag`, `verificationToken`, `verificationTokenExpiresAt`, `twoFactorSecret`, `backupCodes` are ALWAYS `none` for ALL roles -- enforced AFTER overrides are merged
3. **Fail closed**: if `getEffectiveAccessMap` throws, middleware returns 500 rather than leaking fields
4. **API-level rejection**: admin API rejects override creation for sensitive fields before they reach the DB
5. **Double enforcement**: denylist is applied both in `getFieldAccessMap()` defaults and again in `getEffectiveAccessMap()` after DB overrides

## Docker Setup

lib.types is bind-mounted from the host into the backend container. The docker-compose
startup command rebuilds lib.types from source before starting the backend:

```yaml
# docker-compose.yml (service-backend)
volumes:
  - ./lib.types:/app/lib.types
  - lib_types_node_modules:/app/lib.types/node_modules   # preserves TypeScript compiler

command: >
  sh -c "cd /app/lib.types && npm run build &&
         cd /app/service.backend &&
         mkdir -p node_modules/@adopt-dont-shop &&
         rm -rf node_modules/@adopt-dont-shop/lib.types &&
         ln -s /app/lib.types node_modules/@adopt-dont-shop/lib.types &&
         npm run dev"
```

After changing lib.types defaults: restart the backend container or rebuild on the host
(`cd lib.types && npm run build`) -- ts-node-dev will pick up the change via the symlink.

## Common Pitfalls

- **Mismatched casing**: field key doesn't match `toJSON()` output -- field silently defaults to `none`
- **Missing request aliases**: `fieldWriteGuard` rejects writes because req.body uses different casing than the access map
- **Forgetting a role**: all 4 roles (admin, moderator, rescue_staff, adopter) must have entries for every field
- **Stale lib.types in Docker**: if lib.types isn't rebuilt after changes, the container gets old defaults. The docker-compose now auto-rebuilds at startup
- **FieldPermission model paranoid**: must be `paranoid: false` because the field_permissions table has no `deleted_at` column
