# Shared API and Auth Libraries Migration Guide

This guide shows how to migrate your existing apps to use the new shared `lib.api` and `lib.auth` libraries for consistent, transferable API and authentication services.

## Overview

We've created two shared libraries:
- **`@adopt-dont-shop/lib-api`** - Enhanced API service with intelligent caching, error handling, and data transformation
- **`@adopt-dont-shop/lib-auth`** - Authentication service with role management and dev helpers

## Benefits

✅ **Single Source of Truth** - One implementation shared across all apps  
✅ **Consistent Patterns** - Same API patterns and auth flows everywhere  
✅ **Enhanced Features** - Built-in caching, transformers, and dev tools  
✅ **Easy Maintenance** - Update once, benefits all apps  
✅ **Type Safety** - Shared TypeScript types across the platform  

## Library Structure

### lib.api
```
lib.api/
├── src/
│   ├── api-service.ts       # Core API service class
│   ├── token-storage.ts     # Token storage implementations
│   ├── pet-transformers.ts  # Pet data transformation utilities
│   ├── types.ts            # Core API types
│   └── index.ts            # Main exports
├── package.json
└── tsconfig.json
```

### lib.auth
```
lib.auth/
├── src/
│   ├── auth-service.ts     # Authentication service class
│   ├── types.ts           # Auth-specific types
│   └── index.ts           # Main exports
├── package.json
└── tsconfig.json
```

## Installation

The libraries are already added to the workspace. To use them in your apps:

1. **Add dependencies to your app's package.json:**
```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-api": "workspace:*",
    "@adopt-dont-shop/lib-auth": "workspace:*"
  }
}
```

2. **Install dependencies:**
```bash
npm install
```

## Migration Steps

### Step 1: Replace API Service

**Before (old way):**
```typescript
// app/src/services/api.ts - 400+ lines of duplicated code
class ApiService {
  // Lots of duplicated implementation...
}
export const apiService = new ApiService();
```

**After (new way):**
```typescript
// app/src/services/api.ts - Clean, focused configuration
import { ApiService, petDataTransformer } from '@adopt-dont-shop/lib-api';

const apiService = new ApiService({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  defaultTimeout: 10000,
});

// Register app-specific data transformers
apiService.registerTransformer('/pets', petDataTransformer);

export { apiService };
export const api = apiService;
```

### Step 2: Replace Auth Service

**Before (old way):**
```typescript
// app/src/services/authService.ts - 150+ lines of duplicated code
class AuthService {
  // Lots of duplicated auth logic...
}
export const authService = new AuthService();
```

**After (new way):**
```typescript
// app/src/services/authService.ts - Clean, app-specific configuration
import { AuthService, Role } from '@adopt-dont-shop/lib-auth';
import { apiService } from './api';

const authService = new AuthService(apiService, {
  devMode: import.meta.env.DEV,
  userStorageKey: 'user',
  onUnauthorized: () => {
    // App-specific unauthorized handling
    window.location.href = '/login';
  },
});

// App-specific auth helpers
export const appAuthHelpers = {
  canManagePets(): boolean {
    return authService.hasAnyRole([Role.RESCUE_STAFF, Role.RESCUE_MANAGER, Role.RESCUE_ADMIN]);
  },
  
  async devLoginAsStaff(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'rescue_staff',
      role: Role.RESCUE_STAFF,
    });
  },
};

export { authService };
```

### Step 3: Update Type Imports

**Before:**
```typescript
import { ApiResponse, AuthResponse, User } from '@/types';
```

**After:**
```typescript
import type { ApiResponse } from '@adopt-dont-shop/lib-api';
import type { AuthResponse, User, Role } from '@adopt-dont-shop/lib-auth';
```

### Step 4: Update Component Usage

**Before:**
```typescript
// Component using old services
import { apiService } from '../services/api';
import { authService } from '../services/authService';
```

**After:**
```typescript
// Component using new services (same interface!)
import { apiService } from '../services/api';
import { authService } from '../services/authService';
// No changes needed in component logic!
```

## App-Specific Examples

### For app.rescue

```typescript
// app.rescue/src/services/index.ts
import { ApiService, petDataTransformer } from '@adopt-dont-shop/lib-api';
import { AuthService, Role } from '@adopt-dont-shop/lib-auth';

// Configure API service
export const apiService = new ApiService({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Register pet transformer for automatic data transformation
apiService.registerTransformer('/pets', petDataTransformer);

// Configure auth service with rescue-specific settings
export const authService = new AuthService(apiService, {
  devMode: import.meta.env.DEV,
  onUnauthorized: () => window.location.href = '/login',
});

// Rescue-specific helpers
export const rescueHelpers = {
  canManagePets(): boolean {
    return authService.hasAnyRole([Role.RESCUE_STAFF, Role.RESCUE_MANAGER, Role.RESCUE_ADMIN]);
  },
  
  async quickDevLogin(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'rescue_admin',
      role: Role.RESCUE_ADMIN,
    });
  },
};
```

### For app.client

```typescript
// app.client/src/services/index.ts
import { ApiService, petDataTransformer } from '@adopt-dont-shop/lib-api';
import { AuthService, Role } from '@adopt-dont-shop/lib-auth';

export const apiService = new ApiService({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

apiService.registerTransformer('/pets', petDataTransformer);

export const authService = new AuthService(apiService, {
  devMode: import.meta.env.DEV,
  onUnauthorized: () => window.location.href = '/auth',
});

// Client-specific helpers
export const clientHelpers = {
  isAdopter(): boolean {
    return authService.hasRole(Role.ADOPTER);
  },
  
  async devLoginAsAdopter(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'adopter',
      role: Role.ADOPTER,
    });
  },
};
```

### For app.admin

```typescript
// app.admin/src/services/index.ts
import { ApiService } from '@adopt-dont-shop/lib-api';
import { AuthService, Role } from '@adopt-dont-shop/lib-auth';

export const apiService = new ApiService({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const authService = new AuthService(apiService, {
  devMode: import.meta.env.DEV,
  onUnauthorized: () => window.location.href = '/admin/login',
});

// Admin-specific helpers
export const adminHelpers = {
  isSuperAdmin(): boolean {
    return authService.hasRole(Role.SUPER_ADMIN);
  },
  
  canImpersonateUsers(): boolean {
    return authService.hasAnyRole([Role.ADMIN, Role.SUPER_ADMIN]);
  },
  
  async devLoginAsAdmin(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'admin',
      role: Role.SUPER_ADMIN,
    });
  },
};
```

## Advanced Features

### Custom Data Transformers

Register custom transformers for specific data types:

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';

// Custom transformer for application data
const applicationTransformer = (data: unknown) => {
  // Transform application data from snake_case to camelCase
  // Add any app-specific logic
  return transformedData;
};

apiService.registerTransformer('/applications', applicationTransformer);
```

### Custom Token Storage

For SSR or testing environments:

```typescript
import { ApiService, MemoryTokenStorage } from '@adopt-dont-shop/lib-api';

// Use memory storage instead of localStorage
const apiService = new ApiService(
  { baseURL: 'http://localhost:5000' },
  new MemoryTokenStorage()
);
```

### Environment-Specific Configuration

```typescript
// Different configs for different environments
const getApiConfig = () => {
  if (import.meta.env.PROD) {
    return {
      baseURL: 'https://api.petadoption.com',
      defaultTimeout: 5000,
    };
  }
  
  return {
    baseURL: 'http://localhost:5000',
    defaultTimeout: 10000,
  };
};

const apiService = new ApiService(getApiConfig());
```

## Migration Checklist

For each app, follow this checklist:

- [ ] Add `@adopt-dont-shop/lib-api` and `@adopt-dont-shop/lib-auth` to dependencies
- [ ] Replace old API service with new configured instance
- [ ] Replace old auth service with new configured instance
- [ ] Update type imports to use shared types
- [ ] Register any app-specific data transformers
- [ ] Add app-specific auth helpers
- [ ] Test authentication flows
- [ ] Test API calls and data transformation
- [ ] Remove old service files
- [ ] Update new-app generator to use shared libraries

## Benefits After Migration

1. **Reduced Codebase**: ~500 lines of duplicated code removed per app
2. **Consistent Behavior**: Same error handling, caching, and auth patterns
3. **Easy Updates**: Update shared library once, all apps benefit
4. **Better Testing**: Test core functionality once in shared libs
5. **Faster Development**: New apps get full-featured services instantly

## Updating the new-app Generator

Update `scripts/create-new-app.js` to use shared libraries:

```javascript
// Instead of copying service files, create configuration files
function createSharedServices(targetDir, appType) {
  const apiConfig = getApiConfigTemplate(appType);
  fs.writeFileSync(path.join(targetDir, 'src/services/api.ts'), apiConfig);
  
  const authConfig = getAuthConfigTemplate(appType);
  fs.writeFileSync(path.join(targetDir, 'src/services/auth.ts'), authConfig);
}
```

This ensures new apps automatically use the shared libraries from day one.

---

The shared libraries provide a solid foundation for all your apps while allowing for app-specific customization through configuration and helpers. This architecture scales well and makes maintenance much easier across your entire platform.
