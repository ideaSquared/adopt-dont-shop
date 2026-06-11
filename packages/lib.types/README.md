# @adopt-dont-shop/lib.types

Shared TypeScript types, permission constants, and default configurations for the Adopt Don't Shop monorepo.

**Zero dependencies** - safe for both frontend and backend. This package is the single source of truth for all permission-related types and default configurations.

## Why This Package Exists

```
lib.types (this package)              <-- Zero dependencies, pure types + data
  ^                      ^
  |                      |
lib.permissions          service.backend
  (frontend services)     (backend API)
  depends on lib.api      NO frontend deps
```

Previously, `lib.permissions` contained both types and frontend service implementations (which depend on `lib.api`). This forced the backend to pull in frontend code just to get type definitions. `lib.types` solves this by providing a clean, dependency-free package that both sides can import.

## What's In This Package

- **RBAC types**: `UserRole`, `Permission`, `PermissionAction`, `PermissionResource`, etc.
- **Field-level permission types**: `FieldAccessLevel`, `FieldPermissionResource`, `FieldPermissionConfig`, etc.
- **Rescue permission constants**: `RescuePermissions`, `RescuePermissionGroups`, `PETS_VIEW`, `STAFF_CREATE`, etc.
- **Default field permission configs**: `defaultFieldPermissions`, `getDefaultFieldAccess()`, `getFieldAccessMap()`

## Usage

### Backend (service.backend)

```typescript
import { type FieldPermissionResource, getFieldAccessMap } from '@adopt-dont-shop/lib.types';
import { defaultFieldPermissions } from '@adopt-dont-shop/lib.types';
```

### Frontend Apps

Frontend apps can import from either `lib.types` directly or from `lib.permissions` (which re-exports everything from `lib.types` plus frontend service classes):

```typescript
// Types only - use lib.types
import type { UserRole, Permission } from '@adopt-dont-shop/lib.types';

// Types + frontend services - use lib.permissions
import { PermissionsService } from '@adopt-dont-shop/lib.permissions';
```

### lib.permissions

`lib.permissions` depends on `lib.types` and re-exports all its types for backwards compatibility. It adds frontend-only service classes (`PermissionsService`, `FieldPermissionsService`) that depend on `lib.api`.

## Exports

```typescript
import {
  // RBAC types
  type UserRole,
  type Permission,
  type PermissionAction,
  type PermissionResource,
  type UserWithPermissions,
  type PermissionsServiceConfig,

  // Field-level permission types
  type FieldAccessLevel,
  type FieldPermissionResource,
  type FieldPermissionConfig,
  type FieldAccessMap,

  // Rescue permission constants
  RescuePermissions,
  RescuePermissionGroups,
  STAFF_CREATE,
  RESCUE_SETTINGS_UPDATE,

  // Default configurations
  defaultFieldPermissions,
  getDefaultFieldAccess,
  getFieldAccessMap,
} from '@adopt-dont-shop/lib.types';
```

## Building

```bash
npm run build        # ESM + CJS dual build
npm run type-check   # Type check only
npm run clean        # Remove dist/
```
