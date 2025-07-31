# Rescue App - Permissions & Infrastructure Guide

## Overview

The Rescue App has been upgraded with a comprehensive permissions system that follows the infrastructure patterns from `app.client`. This system provides role-based access control (RBAC) using the `@adopt-dont-shop/lib-permissions` library.

## 🔐 Permissions System

### Architecture

The permissions system uses a layered approach:

1. **Library Layer**: `@adopt-dont-shop/lib-permissions` provides the core permission service
2. **Context Layer**: `PermissionsContext` manages user permissions state
3. **Hook Layer**: `useAuthPermissions` combines auth and permission checks
4. **Component Layer**: `PermissionGate` and `ProtectedRoute` for UI protection

### Permission Format

Permissions follow the format: `resource.action`

Examples:
- `pets.read` - View pets
- `pets.create` - Create new pets
- `applications.approve` - Approve applications
- `users.suspend` - Suspend users
- `admin.reports` - View analytics reports

### Available Permissions

All rescue-specific permissions are now defined in `@adopt-dont-shop/lib-permissions` in the `/src/types/rescue-permissions.ts` file. This ensures consistency across all apps that need rescue functionality.

Key permission groups:
- **Pet Management**: `pets.read`, `pets.create`, `pets.update`, `pets.delete`
- **Application Management**: `applications.read`, `applications.approve`, `applications.reject`
- **Staff Management**: `users.read`, `users.create`, `users.update`, `users.suspend`
- **Analytics**: `admin.reports`
- **Settings**: `rescues.read`, `rescues.update`

## 🏗️ Infrastructure Components

### 1. Service Layer (`/src/services/`)

All services are configured using the shared libraries:

```typescript
// All services properly configured with environment variables
export const petsService = new PetsService(apiService);
export const applicationsService = new ApplicationsService(apiService, config);
export const permissionsService = new PermissionsService({ debug: DEV_MODE });
// ... and more
```

### 2. Context Providers (`/src/contexts/`)

- **AuthContext**: Handles authentication state
- **PermissionsContext**: Manages user permissions (integrates with lib-permissions)
- **AnalyticsContext**: User analytics and tracking
- **FeatureFlagsContext**: Feature flag management
- **NotificationsContext**: Real-time notifications
- **ChatContext**: Communication features

### 3. Combined Hooks (`/src/hooks/`)

**useAuthPermissions.ts**: Provides unified access to auth and permissions:

```typescript
const { 
  user, 
  isAuthenticated, 
  hasPermission, 
  hasRole,
  login,
  logout 
} = useAuthWithPermissions();
```

**useRescuePermissions.ts**: Rescue-specific permissions with convenience methods:

```typescript
const { 
  canManagePets, 
  canViewApplications, 
  canProcessApplications,
  isRescueAdmin,
  PETS_CREATE,
  APPLICATIONS_APPROVE 
} = useRescuePermissions();
```

### 4. Protection Components

#### PermissionGate
Conditionally renders content based on permissions:

```tsx
<PermissionGate permission={PETS_CREATE}>
  <CreatePetButton />
</PermissionGate>

<PermissionGate permissions={[STAFF_VIEW, ANALYTICS_VIEW]} requireAll={false}>
  <ManagerDashboard />
</PermissionGate>
```

#### ProtectedRoute
Protects entire routes with permission checks:

```tsx
<ProtectedRoute requiredPermission={APPLICATIONS_VIEW}>
  <ApplicationsPage />
</ProtectedRoute>
```

## 🛡️ Route Protection

Routes are protected with specific permissions:

- `/pets` - Requires `pets.read`
- `/applications` - Requires `applications.read`
- `/staff` - Requires `users.read`
- `/analytics` - Requires `admin.reports`
- `/communication` - Requires `chats.read`
- `/settings` - Requires `rescues.read`

## 🚀 Usage Examples

### Basic Permission Check

```tsx
import { useRescuePermissions } from '@/hooks/useRescuePermissions';

function PetManagement() {
  const { canManagePets, PETS_CREATE } = useRescuePermissions();
  
  return (
    <div>
      {canManagePets() && (
        <button>Add New Pet</button>
      )}
    </div>
  );
}
```

### Using Library Permissions Directly

```tsx
import { usePermissions } from '@/hooks/useAuthPermissions';
import { PETS_CREATE } from '@adopt-dont-shop/lib-permissions';

function PetManagement() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission(PETS_CREATE) && (
        <button>Add New Pet</button>
      )}
    </div>
  );
}
```

### Role-Based Components

```tsx
import { usePermissions } from '@/hooks/useAuthPermissions';
import { Role } from '@/types/auth';

function AdminPanel() {
  const { hasRole } = usePermissions();
  
  if (!hasRole(Role.RESCUE_ADMIN)) {
    return <div>Access Denied</div>;
  }
  
  return <AdminDashboard />;
}
```

### Multiple Permission Check

```tsx
import { useRescuePermissions } from '@/hooks/useRescuePermissions';

function StaffManagement() {
  const { canViewStaff, canManageStaff } = useRescuePermissions();
  
  return (
    <div>
      {canViewStaff() && <StaffList />}
      {canManageStaff() && <AddStaffButton />}
    </div>
  );
}
```

### Alternative: Direct Library Usage

```tsx
import { usePermissions } from '@/hooks/useAuthPermissions';
import { STAFF_VIEW, STAFF_CREATE } from '@adopt-dont-shop/lib-permissions';

function StaffManagement() {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const canViewStaff = hasAnyPermission([STAFF_VIEW]);
  const canManageStaff = hasAllPermissions([STAFF_VIEW, STAFF_CREATE]);
  
  return (
    <div>
      {canViewStaff && <StaffList />}
      {canManageStaff && <AddStaffButton />}
    </div>
  );
}
```

## 🔧 Development

### Adding New Permissions

1. Add the permission to `@adopt-dont-shop/lib-permissions/src/types/rescue-permissions.ts`:
```typescript
export const NEW_FEATURE_VIEW = 'new_feature.read' as Permission;
```

2. Add it to the appropriate permission group:
```typescript
export const RescuePermissions = {
  // ... existing permissions
  NEW_FEATURE_VIEW,
} as const;
```

3. Use in components:
```tsx
import { NEW_FEATURE_VIEW } from '@adopt-dont-shop/lib-permissions';

<PermissionGate permission={NEW_FEATURE_VIEW}>
  <NewFeature />
</PermissionGate>
```

### Testing Permissions

The permission system is designed to be easily testable:

```typescript
// Mock the permissions context for testing
const mockPermissions = {
  hasPermission: jest.fn().mockReturnValue(true),
  hasAnyPermission: jest.fn().mockReturnValue(true),
  hasAllPermissions: jest.fn().mockReturnValue(true),
  hasRole: jest.fn().mockReturnValue(true),
};
```

## 🎯 Key Benefits

1. **Type Safety**: All permissions are typed and checked at compile time
2. **Centralized**: All permission logic goes through the lib-permissions service
3. **Flexible**: Supports resource-based, role-based, and custom permission checks
4. **Testable**: Easy to mock and test permission scenarios
5. **Consistent**: Same patterns used across all apps in the monorepo

## 🔗 Integration with Backend

The permissions system integrates with the backend through:

1. **API Service**: Configured to pass auth tokens
2. **Permission Service**: Fetches user permissions from `/api/v1/permissions`
3. **Caching**: Permissions are cached for performance
4. **Real-time Updates**: Can refresh permissions when roles change

## 📚 Related Files

- `@adopt-dont-shop/lib-permissions/src/types/rescue-permissions.ts` - Rescue permission constants
- `@adopt-dont-shop/lib-permissions/src/types/index.ts` - Base permission types  
- `/src/types/auth.ts` - Auth types and role definitions
- `/src/hooks/useAuthPermissions.ts` - Combined auth/permissions hook
- `/src/hooks/useRescuePermissions.ts` - Rescue-specific permissions hook
- `/src/contexts/PermissionsContext.tsx` - Permissions state management
- `/src/components/ui/PermissionGate.tsx` - Permission-based rendering
- `/src/components/navigation/ProtectedRoute.tsx` - Route protection

This infrastructure provides a solid foundation for secure, scalable rescue management with proper access control throughout the application.
