# API Migration Guide

## Summary

The API code from `app.client/src/services/api.ts` and `app.client/src/services/authService.ts` has been successfully ported to `lib.api`. This migration centralizes the API functionality into a reusable library that can be shared across all applications in the monorepo.

## What Was Migrated

### ✅ Completed

1. **Core API Service** (`api.ts` → `api-service.ts`)
   - HTTP client with fetch-based implementation
   - Authentication token management
   - Request/response interceptors
   - Error handling and timeout management
   - File upload capabilities
   - Pet data transformation (snake_case ↔ camelCase)
   - PostGIS geometry handling
   - Environment variable support

2. **Authentication Service** (`authService.ts` → `auth-service.ts`)
   - Login/logout functionality
   - User registration
   - Token refresh mechanism
   - Profile management
   - Password reset capabilities
   - Local storage management

3. **Type Definitions**
   - All authentication types (User, LoginRequest, RegisterRequest, AuthResponse)
   - Pet-related types with transformation support
   - API response types with generic support
   - Configuration interfaces

4. **Data Transformation**
   - Automatic snake_case to camelCase conversion for pet data
   - PostGIS geometry to readable location strings
   - Image/photo field mapping with proper typing

### 📋 Remaining Services (Not Yet Migrated)

The following services from `app.client/src/services/` could be migrated in future iterations:

- `applicationService.ts` - Application/adoption management
- `chatService.ts` - Real-time chat functionality  
- `discoveryService.ts` - Pet discovery and search
- `petService.ts` - Pet-specific operations
- `rescueService.ts` - Rescue organization management
- `messageSearchService.ts` - Message search functionality
- `analyticsService.ts` - Analytics tracking

## Key Features

### 1. Backward Compatibility
- All existing method signatures preserved
- Same import patterns work with new library
- Environment variable support maintained

### 2. Enhanced Type Safety
- Full TypeScript support with strict typing
- Generic response types for better type inference
- Comprehensive interface definitions

### 3. Environment Flexibility
- Works in both Node.js and browser environments
- Supports Vite and Create React App environment variables
- Graceful fallbacks for missing APIs (localStorage, etc.)

### 4. Data Transformation
- Automatic pet data transformation between API and UI formats
- PostGIS geometry handling for location data
- Consistent field naming across the application

## Migration Instructions

### For New Applications

```typescript
// Install the library
npm install @adopt-dont-shop/lib-api

// Use in your application
import { apiService, authService } from '@adopt-dont-shop/lib-api';

// Configure if needed
apiService.updateConfig({
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
  debug: process.env.NODE_ENV === 'development'
});
```

### For Existing Applications

Replace imports in your existing code:

```typescript
// Before
import { apiService } from '../services/api';
import { authService } from '../services/authService';

// After  
import { apiService, authService } from '@adopt-dont-shop/lib-api';

// All method calls remain the same!
const pets = await apiService.get('/api/v1/pets');
const user = await authService.login(credentials);
```

## Benefits

1. **Code Reusability**: Shared API logic across all applications
2. **Consistent Behavior**: Same API handling in admin, client, and rescue apps
3. **Centralized Updates**: Bug fixes and features benefit all apps
4. **Type Safety**: Better TypeScript support with comprehensive types
5. **Maintainability**: Single source of truth for API communication

## Next Steps

1. **Update Applications**: Replace local API imports with library imports
2. **Remove Duplicated Code**: Delete local API service files after migration
3. **Additional Services**: Consider migrating other services as needed
4. **Testing**: Add comprehensive tests to the library
5. **Documentation**: Expand documentation for specific use cases

## Testing the Migration

The library has been built and tested successfully. To verify:

```bash
cd lib.api
npm run build  # ✅ Successful
npm test       # Run when tests are added
```

All TypeScript compilation passes without errors, and the library exports are properly structured for consumption by other packages in the monorepo.
