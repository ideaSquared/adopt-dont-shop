# @adopt-dont-shop/lib-permissions

Role-based access control (RBAC) system with hierarchical permissions, resource-based authorization, and comprehensive API integration

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-permissions

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-permissions": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { PermissionsService, PermissionsServiceConfig } from '@adopt-dont-shop/lib-permissions';

// Using the singleton instance
import { permissionsService } from '@adopt-dont-shop/lib-permissions';

// Basic permission check
const canEditPets = await permissionsService.hasPermission('pets:edit');
if (canEditPets) {
  // Allow pet editing
}

// Resource-based permission
const canManageRescue = await permissionsService.hasPermission('rescue:manage', { rescueId: '123' });

// Advanced configuration
const service = new PermissionsService({
  apiUrl: 'https://api.example.com',
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  enableHierarchy: true,
  debug: true
});
```

## 🔧 Configuration

### PermissionsServiceConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | `process.env.VITE_API_URL` | Backend API URL |
| `enableHierarchy` | `boolean` | `true` | Enable hierarchical permission inheritance |
| `cacheTtl` | `number` | `300000` | Cache TTL in milliseconds (5 min) |
| `maxCacheSize` | `number` | `1000` | Maximum cache entries |
| `debug` | `boolean` | `false` | Enable debug logging |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### PermissionsService

#### Core Permission Methods

##### `hasPermission(permission, context?)`

Check if the current user has a specific permission.

```typescript
// Simple permission check
const canCreatePets = await permissionsService.hasPermission('pets:create');

// Resource-based permission
const canEditPet = await permissionsService.hasPermission('pets:edit', { 
  petId: 'pet_123' 
});

// Context-based permission
const canManageUsers = await permissionsService.hasPermission('users:manage', {
  organizationId: 'org_456',
  rescueId: 'rescue_789'
});
```

##### `hasAnyPermission(permissions, context?)`

Check if user has any of the specified permissions.

```typescript
const canModerateContent = await permissionsService.hasAnyPermission([
  'content:moderate',
  'content:admin',
  'admin:global'
], { organizationId: 'org_123' });
```

##### `hasAllPermissions(permissions, context?)`

Check if user has all specified permissions.

```typescript
const canFullyManagePets = await permissionsService.hasAllPermissions([
  'pets:create',
  'pets:edit',
  'pets:delete',
  'pets:publish'
], { rescueId: 'rescue_456' });
```

##### `getUserPermissions(userId?, context?)`

Get all permissions for a user.

```typescript
const userPermissions = await permissionsService.getUserPermissions();
// Returns: ['pets:read', 'pets:create', 'applications:read', ...]

// For specific context
const rescuePermissions = await permissionsService.getUserPermissions(
  'user_123', 
  { rescueId: 'rescue_456' }
);
```

#### Role Management

##### `getUserRoles(userId?, context?)`

Get user's roles.

```typescript
const roles = await permissionsService.getUserRoles();
// Returns: [{ id: 'role_1', name: 'Rescue Manager', ... }]

// With context
const rescueRoles = await permissionsService.getUserRoles('user_123', {
  rescueId: 'rescue_456'
});
```

##### `assignRole(userId, roleId, context?)`

Assign a role to a user.

```typescript
await permissionsService.assignRole('user_123', 'rescue_volunteer', {
  rescueId: 'rescue_456',
  assignedBy: 'admin_789'
});
```

##### `removeRole(userId, roleId, context?)`

Remove a role from a user.

```typescript
await permissionsService.removeRole('user_123', 'rescue_volunteer', {
  rescueId: 'rescue_456',
  removedBy: 'admin_789'
});
```

##### `hasRole(userId, roleId, context?)`

Check if user has a specific role.

```typescript
const isAdmin = await permissionsService.hasRole('user_123', 'admin');
const isRescueManager = await permissionsService.hasRole('user_123', 'rescue_manager', {
  rescueId: 'rescue_456'
});
```

#### Resource Management

##### `getResourcePermissions(resourceType, resourceId)`

Get permissions for a specific resource.

```typescript
const petPermissions = await permissionsService.getResourcePermissions('pet', 'pet_123');
// Returns: { read: true, edit: false, delete: false, share: true }

const rescuePermissions = await permissionsService.getResourcePermissions('rescue', 'rescue_456');
```

##### `setResourcePermissions(resourceType, resourceId, permissions)`

Set permissions for a resource.

```typescript
await permissionsService.setResourcePermissions('pet', 'pet_123', {
  'user_456': ['read', 'edit'],
  'role_volunteer': ['read'],
  'role_manager': ['read', 'edit', 'delete']
});
```

##### `checkResourceAccess(resourceType, resourceId, action)`

Check access to a specific resource action.

```typescript
const canEditPet = await permissionsService.checkResourceAccess('pet', 'pet_123', 'edit');
const canDeleteApplication = await permissionsService.checkResourceAccess('application', 'app_789', 'delete');
```

#### Permission Hierarchy

##### `getEffectivePermissions(userId?, context?)`

Get effective permissions including inherited ones.

```typescript
const effectivePermissions = await permissionsService.getEffectivePermissions();
// Includes permissions from roles, groups, and direct assignments

// With hierarchy context
const rescueEffectivePermissions = await permissionsService.getEffectivePermissions('user_123', {
  rescueId: 'rescue_456',
  includeInherited: true
});
```

##### `getPermissionHierarchy(permission)`

Get the permission hierarchy tree.

```typescript
const hierarchy = await permissionsService.getPermissionHierarchy('pets:edit');
// Returns: ['pets:edit', 'pets:manage', 'admin:pets', 'admin:global']
```

#### Bulk Operations

##### `checkMultiplePermissions(permissionChecks)`

Check multiple permissions efficiently.

```typescript
const results = await permissionsService.checkMultiplePermissions([
  { permission: 'pets:create' },
  { permission: 'pets:edit', context: { petId: 'pet_123' } },
  { permission: 'rescue:manage', context: { rescueId: 'rescue_456' } }
]);

// Results: { 'pets:create': true, 'pets:edit': false, 'rescue:manage': true }
```

##### `bulkAssignRoles(assignments)`

Assign multiple roles efficiently.

```typescript
await permissionsService.bulkAssignRoles([
  { userId: 'user_123', roleId: 'volunteer', context: { rescueId: 'rescue_456' } },
  { userId: 'user_789', roleId: 'foster', context: { rescueId: 'rescue_456' } }
]);
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Permissions Context
import { createContext, useContext, useEffect, useState } from 'react';
import { PermissionsService } from '@adopt-dont-shop/lib-permissions';

const PermissionsContext = createContext<PermissionsService | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new PermissionsService({
    debug: process.env.NODE_ENV === 'development',
    enableHierarchy: true
  }));

  return (
    <PermissionsContext.Provider value={service}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => {
  const service = useContext(PermissionsContext);
  if (!service) throw new Error('usePermissions must be used within PermissionsProvider');
  return service;
};

// Permission Hook
export function usePermission(permission: string, context?: any) {
  const service = usePermissions();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const allowed = await service.hasPermission(permission, context);
        setHasPermission(allowed);
      } catch (error) {
        console.error(`Error checking permission ${permission}:`, error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permission, JSON.stringify(context)]);

  return { hasPermission, loading };
}

// Permission Gate Component
export function PermissionGate({ 
  permission, 
  context, 
  fallback = null, 
  children 
}: {
  permission: string;
  context?: any;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasPermission, loading } = usePermission(permission, context);

  if (loading) return <div>Loading...</div>;
  if (!hasPermission) return <>{fallback}</>;
  
  return <>{children}</>;
}

// In components
function PetManagement({ petId }: { petId: string }) {
  const permissions = usePermissions();
  const { hasPermission: canEdit } = usePermission('pets:edit', { petId });
  const { hasPermission: canDelete } = usePermission('pets:delete', { petId });

  return (
    <div>
      <h2>Pet Management</h2>
      
      <PermissionGate permission="pets:view" context={{ petId }}>
        <PetDetails petId={petId} />
      </PermissionGate>

      <PermissionGate 
        permission="pets:edit" 
        context={{ petId }}
        fallback={<div>Read-only view</div>}
      >
        <PetEditForm petId={petId} />
      </PermissionGate>

      {canDelete && (
        <button onClick={() => deletePet(petId)}>
          Delete Pet
        </button>
      )}
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/permissions.service.ts
import { PermissionsService } from '@adopt-dont-shop/lib-permissions';

export const permissionsService = new PermissionsService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// Permission Middleware
export const requirePermission = (permission: string, getContext?: (req: Request) => any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = getContext ? getContext(req) : undefined;
      const hasPermission = await permissionsService.hasPermission(permission, context);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Resource-based middleware
export const requireResourceAccess = (resourceType: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      const hasAccess = await permissionsService.checkResourceAccess(
        resourceType, 
        resourceId, 
        action
      );
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          resource: resourceType,
          action: action
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      res.status(500).json({ error: 'Access check failed' });
    }
  };
};

// In routes
app.get('/api/pets', 
  requirePermission('pets:read'),
  async (req, res) => {
    const pets = await petService.getPets(req.query);
    res.json(pets);
  }
);

app.put('/api/pets/:id', 
  requireResourceAccess('pet', 'edit'),
  async (req, res) => {
    const pet = await petService.updatePet(req.params.id, req.body);
    res.json(pet);
  }
);

app.delete('/api/rescue/:rescueId/pets/:id',
  requirePermission('pets:delete', (req) => ({ 
    rescueId: req.params.rescueId,
    petId: req.params.id 
  })),
  async (req, res) => {
    await petService.deletePet(req.params.id);
    res.status(204).send();
  }
);
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Permission checking algorithms
- ✅ Role assignment and removal
- ✅ Resource-based access control
- ✅ Hierarchical permission inheritance
- ✅ Bulk operations
- ✅ Caching mechanisms
- ✅ Error handling and edge cases

Run tests:
```bash
npm run test:lib-permissions
```

## 🚀 Key Features

### Role-Based Access Control (RBAC)
- **Hierarchical Roles**: Parent-child role relationships
- **Context-Aware**: Permissions scoped to organizations, rescues
- **Dynamic Assignment**: Runtime role management
- **Bulk Operations**: Efficient mass role assignments

### Resource-Based Authorization
- **Fine-Grained Control**: Per-resource permission settings
- **Action-Based**: Read, write, delete, manage actions
- **Inheritance**: Resource hierarchy permission flow
- **Ownership**: Creator and ownership-based access

### Performance & Scalability
- **Intelligent Caching**: LRU cache with TTL optimization
- **Batch Operations**: Efficient multiple permission checks
- **Lazy Loading**: On-demand permission resolution
- **Optimistic Checking**: Fast local checks with backend sync

### Developer Experience
- **TypeScript Support**: Full type safety and IntelliSense
- **React Integration**: Hooks and components for UI
- **Middleware Support**: Express.js route protection
- **Debug Mode**: Comprehensive permission logging

## 🔧 Troubleshooting

### Common Issues

**Permissions not updating**:
- Check cache TTL settings and clear cache if needed
- Verify user authentication and context
- Enable debug mode for permission resolution traces

**Hierarchical permissions not working**:
- Ensure `enableHierarchy` is true in configuration
- Check permission naming conventions and hierarchy setup
- Verify role inheritance chains

**Performance issues**:
- Monitor cache hit rates and optimize cache size
- Use bulk operations for multiple checks
- Consider context specificity to improve cache effectiveness

### Debug Mode

```typescript
const permissions = new PermissionsService({
  debug: true // Enables detailed permission checking logs
});
```

This library provides enterprise-grade RBAC with fine-grained resource control, optimized for modern web applications with comprehensive caching and hierarchical permission inheritance.
