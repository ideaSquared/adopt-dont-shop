# Environment Variables - Industry Standard URL Configuration

This document outlines the standardized environment variable setup for URL configuration across all applications and libraries in the adopt-dont-shop monorepo.

## Overview

We have migrated from inconsistent URL environment variable naming to industry-standard conventions that provide:

- **Consistent naming** across all apps and libraries
- **Clear separation** between different URL types  
- **Proper fallback handling** for different environments
- **TypeScript type safety** for all environment variables
- **Future-proof patterns** that scale with the application

## Standard Environment Variables

### Primary URL Variables

| Variable Name | Purpose | Example Values |
|---------------|---------|----------------|
| `VITE_API_BASE_URL` | Base URL for HTTP API requests | `http://api.localhost:5000` (dev)<br>`https://api.adoptdontshop.com` (prod) |
| `VITE_WS_BASE_URL` | Base URL for WebSocket connections | `ws://api.localhost:5000` (dev)<br>`wss://api.adoptdontshop.com` (prod) |

### Legacy Support (Deprecated)

The following variables are supported for backward compatibility but should not be used in new code:

- `VITE_API_URL` → Use `VITE_API_BASE_URL` instead
- `VITE_API_BASE_URL` (old redundant variable) → Use the new standardized `VITE_API_BASE_URL`
- `VITE_WEBSOCKET_URL` → Use `VITE_WS_BASE_URL` instead
- `VITE_SOCKET_URL` → Use `VITE_WS_BASE_URL` instead

## File Changes Made

### Environment Files Updated

All `.env.example` files have been updated to use the new standard:

- `app.client/.env.example`
- `app.rescue/.env.example` 
- `app.admin/.env.example`

### TypeScript Definitions Updated

All `vite-env.d.ts` files have been updated:

- `app.client/src/vite-env.d.ts`
- `app.rescue/src/vite-env.d.ts`
- `app.admin/src/vite-env.d.ts`
- `lib.api/src/vite-env.d.ts`
- `lib.utils/src/vite-env.d.ts` (new)

### Application Code Updated

**app.client:**
- `src/contexts/AuthContext.tsx`
- `src/contexts/FeatureFlagsContext.tsx`
- `src/contexts/NotificationsContext.tsx`
- `src/services/libraryServices.ts`
- `src/services/api.ts`
- `src/utils/fileUtils.ts`
- `src/utils/offlineManager.ts`
- `src/setup-tests.ts`

**app.rescue:**
- `src/services/library-services.ts`
- `src/setup-tests.ts`

**app.admin:**
- `src/services/api.ts`
- `src/setup-tests.ts`

**lib.api:**
- `src/services/api-service.ts`

### New Environment Utilities

A new utility library has been created at `lib.utils/src/env.ts` that provides:

```typescript
import { getApiBaseUrl, getWsBaseUrl, buildApiUrl, buildWsUrl } from '@adopt-dont-shop/lib-utils';

// Get base URLs
const apiUrl = getApiBaseUrl(); // Returns VITE_API_BASE_URL with fallbacks
const wsUrl = getWsBaseUrl(); // Returns VITE_WS_BASE_URL with fallbacks

// Build specific endpoint URLs
const loginUrl = buildApiUrl('/auth/login'); // http://api.localhost:5000/auth/login
const chatWs = buildWsUrl('/chat'); // ws://api.localhost:5000/chat
```

## Environment Configuration Examples

### Development (.env.local)

```bash
# API Configuration - Development
VITE_API_BASE_URL=http://api.localhost:5000
VITE_WS_BASE_URL=ws://api.localhost:5000

# App Configuration
VITE_APP_NAME=Adopt Don't Shop - Client
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG_LOGGING=true
```

### Production (.env.production)

```bash
# API Configuration - Production
VITE_API_BASE_URL=https://api.adoptdontshop.com
VITE_WS_BASE_URL=wss://api.adoptdontshop.com

# App Configuration
VITE_APP_NAME=Adopt Don't Shop
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG_LOGGING=false
```

### Docker Compose

```yaml
services:
  app-client:
    environment:
      - VITE_API_BASE_URL=http://api.localhost:5000
      - VITE_WS_BASE_URL=ws://api.localhost:5000
  
  app-rescue:
    environment:
      - VITE_API_BASE_URL=http://api.localhost:5000
      - VITE_WS_BASE_URL=ws://api.localhost:5000
```

## Fallback Behavior

The environment utilities provide intelligent fallbacks:

1. **Primary**: Uses `VITE_API_BASE_URL` if available
2. **Legacy**: Falls back to `VITE_API_URL` for backward compatibility
3. **Environment**: Falls back to environment-specific defaults:
   - Development: `http://localhost:5000`
   - Production: `https://api.adoptdontshop.com`
   - Test: `http://localhost:5000`

## Best Practices

### For New Code

```typescript
// ✅ Recommended: Use the standardized environment utilities
import { getApiBaseUrl, buildApiUrl } from '@adopt-dont-shop/lib-utils';

const apiClient = new ApiClient({
  baseUrl: getApiBaseUrl(),
});

const endpoint = buildApiUrl('/pets');
```

### For Existing Code

```typescript
// ✅ Update existing code to use new variable names
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ❌ Avoid using deprecated variable names in new code
const apiUrl = import.meta.env.VITE_API_URL; // deprecated
```

## Migration Checklist

- [x] Update all `.env.example` files
- [x] Update all `vite-env.d.ts` TypeScript definitions
- [x] Update all application code to use `VITE_API_BASE_URL`
- [x] Update all test setup files
- [x] Create centralized environment utilities in `lib.utils`
- [x] Update library API service to use new variables
- [ ] Update Docker Compose files (if needed)
- [ ] Update CI/CD pipelines (if needed)
- [ ] Update deployment documentation

## Validation

You can validate your environment configuration using the utilities:

```typescript
import { validateUrlConfig } from '@adopt-dont-shop/lib-utils';

const validation = validateUrlConfig();
if (!validation.isValid) {
  console.error('Environment configuration errors:', validation.errors);
}
```

## Support

For questions about the environment variable setup, please refer to:

- This documentation
- The `lib.utils/src/env.ts` implementation
- Example usage in the application service files
