# @adopt-dont-shop/lib.permissions

Frontend permission services for the Adopt Don't Shop monorepo.

This package re-exports all types from `@adopt-dont-shop/lib.types` and adds frontend-only service classes that depend on `lib.api`.

## Architecture

```
lib.types (source of truth)
  = Pure types, constants, and default configs
  = Zero dependencies - safe for both frontend and backend

lib.permissions (this package)
  = Re-exports everything from lib.types
  = Adds frontend service classes (PermissionsService, FieldPermissionsService)
  = Depends on lib.api (frontend HTTP client)

service.backend
  = Imports from lib.types directly (no frontend deps)
  = Has ORM-layer enums that mirror lib.types values (required by Sequelize)

app.admin / app.client / app.rescue
  = Import types + services from lib.permissions
```

### Import Rules

| Consumer | Import from | What |
|----------|------------|------|
| Frontend apps | `@adopt-dont-shop/lib.permissions` | Types, services, defaults |
| Backend (all files) | `@adopt-dont-shop/lib.types` | Types, default config functions |
| Backend ORM layer | `../models/FieldPermission` | Model + ORM enums |

The backend **never** imports from `lib.permissions` or `lib.api`.

---

## Exports

### Types

```typescript
import type {
  // RBAC types
  UserRole,                    // 'adopter' | 'rescue_staff' | 'admin' | 'moderator'
  Permission,                  // Template literal type: `${PermissionResource}.${PermissionAction}`
  PermissionAction,            // 'create' | 'read' | 'update' | 'delete' | 'list' | ...
  PermissionResource,          // 'users' | 'pets' | 'applications' | 'rescues' | ...
  UserWithPermissions,
  PermissionCheckRequest,
  RoleAssignmentRequest,
  PermissionGrantRequest,
  PermissionAuditLog,

  // Field-level permission types
  FieldAccessLevel,            // 'none' | 'read' | 'write'
  FieldPermissionResource,     // 'users' | 'pets' | 'applications' | 'rescues'
  FieldPermissionRule,
  FieldPermissionRecord,
  FieldAccessMap,              // Record<string, FieldAccessLevel>
  ResourceFieldPermissions,
  FieldPermissionConfig,
  FieldPermissionCheckRequest,
  FieldPermissionCheckResult,
  FieldPermissionUpdateRequest,
  FieldAccessAuditEntry,
  FieldMaskingOptions,
} from '@adopt-dont-shop/lib.permissions';
```

### Services

```typescript
import {
  PermissionsService,          // RBAC service (API-backed, with caching)
  FieldPermissionsService,     // Field-level permission service (API-backed, with caching)
} from '@adopt-dont-shop/lib.permissions';
```

### Default Configuration

```typescript
import {
  defaultFieldPermissions,     // Complete default config: FieldPermissionConfig
  getDefaultFieldAccess,       // (resource, role, fieldName) => FieldAccessLevel
  getFieldAccessMap,           // (resource, role) => Record<string, FieldAccessLevel>
} from '@adopt-dont-shop/lib.permissions';
```

### Rescue Permission Constants

```typescript
import {
  RescuePermissions,          // All rescue-related permission constants
  RescuePermissionGroups,     // Pre-built permission sets by rescue role
  // Individual constants: PETS_VIEW, PETS_CREATE, APPLICATIONS_VIEW, etc.
} from '@adopt-dont-shop/lib.permissions';
```

---

## RBAC (Role-Based Access Control)

### Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `moderator` | Content moderation, read-only access to most resources |
| `rescue_staff` | Manages pets, applications, and rescue settings for their organisation |
| `adopter` | Browses pets, submits applications |

### PermissionsService

Client-side service for checking RBAC permissions via the backend API. Includes a 5-minute cache.

```typescript
const service = new PermissionsService({ debug: false });

// Check a single permission
const canCreate = await service.hasPermission(userId, 'pets.create');

// Check any/all of multiple permissions
const canManage = await service.hasAnyPermission(userId, ['pets.update', 'pets.delete']);
const canFullyManage = await service.hasAllPermissions(userId, ['pets.create', 'pets.update', 'pets.delete']);

// Check role
const isAdmin = await service.hasRole(userId, 'admin');
const isStaffOrAdmin = await service.hasAnyRole(userId, ['admin', 'rescue_staff']);

// Get all permissions for a user
const permissions = await service.getUserPermissions(userId);

// Admin operations
await service.assignRole({ userId, role: 'rescue_staff', assignedBy: adminId });
await service.grantPermissions({ userId, permissions: ['pets.create'], grantedBy: adminId });
await service.revokePermissions(userId, ['pets.create'], adminId);
```

### Rescue Permission Constants

Pre-defined permission constants for rescue-specific operations:

```typescript
import { RescuePermissions, RescuePermissionGroups } from '@adopt-dont-shop/lib.permissions';

// Individual permissions
RescuePermissions.PETS_VIEW        // 'pets.read'
RescuePermissions.PETS_CREATE      // 'pets.create'
RescuePermissions.APPLICATIONS_APPROVE  // 'applications.approve'
RescuePermissions.ADMIN_DASHBOARD  // 'admin.dashboard'

// Role-based permission groups
RescuePermissionGroups.RESCUE_ADMIN    // All rescue permissions
RescuePermissionGroups.RESCUE_MANAGER  // Management subset
RescuePermissionGroups.RESCUE_STAFF    // Staff subset
RescuePermissionGroups.VOLUNTEER       // Minimal read-only
```

---

## Field-Level Permissions

Field-level permissions control which fields on a resource each role can see or modify.

### Access Levels

| Level | Description |
|-------|-------------|
| `none` | Field is completely hidden from API responses and cannot be written |
| `read` | Field is visible in API responses but cannot be modified |
| `write` | Field can be both read and modified |

### Two-Layer Architecture

1. **Defaults** (hardcoded in this library): Baseline access levels per resource, role, and field. These are the security floor.
2. **Overrides** (stored in database): Runtime-configurable overrides managed via the admin UI. These take precedence over defaults.

```
Effective access = override ?? default ?? 'none'
```

### Default Configuration

The defaults are defined in `src/config/field-permission-defaults.ts` and cover all four resources (`users`, `pets`, `applications`, `rescues`) across all four roles.

Key security invariants enforced by defaults:
- `password`, `resetToken`, `twoFactorSecret`, `backupCodes`, and other security fields are **always `none`** for all roles
- Adopters cannot see `email`, `phoneNumber`, `dateOfBirth`, or internal fields on other users
- Adopters cannot see `interviewNotes`, `homeVisitNotes`, or `score` on applications
- Adopters cannot see `medicalHistory`, `vaccinations`, `microchipId`, or `internalNotes` on pets
- Rescue staff cannot see other users' `status`, `userType`, or login-related fields

```typescript
import { getDefaultFieldAccess, getFieldAccessMap, defaultFieldPermissions } from '@adopt-dont-shop/lib.permissions';

// Check a single field
const level = getDefaultFieldAccess('users', 'adopter', 'email');
// => 'none'

// Get full access map for a role on a resource
const accessMap = getFieldAccessMap('pets', 'rescue_staff');
// => { petId: 'read', name: 'write', breed: 'write', medicalHistory: 'write', ... }

// Access the full config object
const allDefaults = defaultFieldPermissions;
// => { users: { admin: {...}, moderator: {...}, ... }, pets: {...}, ... }
```

### FieldPermissionsService

Client-side service for resolving effective field access (defaults + overrides from API). Includes a 2-minute cache.

```typescript
const fieldService = new FieldPermissionsService({ debug: false });

// Get effective access for a single field
const result = await fieldService.getFieldAccess('users', 'adopter', 'email');
// => { allowed: false, effectiveLevel: 'none', source: 'default' }

// Get full effective access map (defaults + overrides)
const accessMap = await fieldService.getEffectiveFieldAccessMap('pets', 'rescue_staff');

// Check if a specific access level is allowed
const canWrite = await fieldService.checkFieldAccess('pets', 'rescue_staff', 'name', 'write');
// => true

// Mask fields in a data object (removes fields the role can't see)
const masked = await fieldService.maskFields(userData, {
  resource: 'users',
  role: 'adopter',
  action: 'read',
});

// Mask an array of objects
const maskedList = await fieldService.maskFieldsArray(userList, {
  resource: 'users',
  role: 'adopter',
  action: 'read',
});

// Get fields that a role cannot write to
const blocked = await fieldService.getWriteBlockedFields('users', 'adopter', ['firstName', 'email', 'status']);
// => ['email', 'status']

// Admin: update an override
await fieldService.updateFieldPermission({
  resource: 'users',
  fieldName: 'email',
  role: 'rescue_staff',
  accessLevel: 'read',
  updatedBy: adminUserId,
});

// Admin: delete an override (reverts to default)
await fieldService.deleteFieldPermission('users', 'rescue_staff', 'email');
```

---

## Backend Integration

The backend (`service.backend`) consumes this library in three ways:

### 1. Middleware: `fieldMask(resource)`

Intercepts `res.json()` to automatically strip fields the authenticated user's role cannot read. Apply to GET routes.

```typescript
// service.backend/src/routes/users.routes.ts
import { fieldMask } from '../middleware/field-permissions';

router.get('/users/:userId', authenticateToken, fieldMask('users'), controller.getUser);
```

### 2. Middleware: `fieldWriteGuard(resource)`

Rejects PUT/PATCH/POST requests that include fields the user cannot write to. Apply to write routes.

```typescript
router.put('/users/:userId', authenticateToken, fieldWriteGuard('users'), controller.updateUser);
```

### 3. Admin API Routes

The backend exposes REST endpoints under `/api/v1/field-permissions/` for managing overrides. These are admin-only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/defaults` | Get all default configurations |
| GET | `/defaults/:resource/:role` | Get defaults for a specific resource/role |
| GET | `/:resource` | Get all overrides for a resource |
| GET | `/:resource/:role` | Get overrides for a resource/role |
| POST | `/` | Create or update a single override |
| POST | `/bulk` | Bulk create/update overrides |
| DELETE | `/:resource/:role/:fieldName` | Delete a single override |

---

## Project Structure

```
lib.permissions/
  src/
    index.ts                                    # Re-exports everything
    types/
      index.ts                                  # RBAC types (UserRole, Permission, etc.)
      rescue-permissions.ts                     # Rescue permission constants and groups
      field-permissions.ts                      # Field-level permission types
    config/
      field-permission-defaults.ts              # Default field access configurations
    services/
      permissions-service.ts                    # RBAC service (API-backed)
      field-permissions-service.ts              # Field permission service (API-backed)
      __tests__/
        field-permissions-service.test.ts
    config/
      __tests__/
        field-permission-defaults.test.ts
  jest.config.cjs
  tsconfig.json
  package.json
```

## Testing

```bash
# From lib.permissions directory
npx jest --config jest.config.cjs

# Run a specific test file
npx jest --config jest.config.cjs src/config/__tests__/field-permission-defaults.test.ts

# With coverage
npx jest --config jest.config.cjs --coverage
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Lint
npm run lint
```
