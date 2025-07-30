# 🏗️ API URL Management - Industry Standard Implementation

## Overview

This document describes the industry-standard API URL management system implemented across the adopt-dont-shop monorepo. The solution centralizes URL construction in libraries while apps provide only base URLs.

## ✅ What Was Fixed

### Before (Broken)
```
❌ Base URL: '/api' (relative path)
❌ Endpoint: '/api/v1/auth/login'  
❌ Result: '/api/api/v1/auth/login' (double prefix)
❌ updateConfig() didn't update baseURL property
❌ Mixed environment variable names
```

### After (Industry Standard)
```
✅ Base URL: 'http://api.localhost' (full URL)
✅ Endpoint: '/api/v1/auth/login'
✅ Result: 'http://api.localhost/api/v1/auth/login' (correct)
✅ updateConfig() properly updates baseURL
✅ Standardized VITE_API_BASE_URL
```

## 🏛️ Architecture Principles

### 1. **Separation of Concerns**
- **Apps**: Provide base URLs only (`http://api.localhost`)
- **Libraries**: Control path construction (`/api/v1/auth/login`)
- **Result**: Full URL construction (`http://api.localhost/api/v1/auth/login`)

### 2. **Single Source of Truth**
- Environment variables define base URLs
- Libraries define endpoint paths
- No URL construction in app components

### 3. **Environment Agnostic**
- Same code works across dev/staging/production
- Only base URLs change between environments
- Path structure remains constant

## 📁 Implementation Details

### Environment Variables (Industry Standard)

```bash
# ✅ Recommended Pattern
VITE_API_BASE_URL=http://api.localhost      # Protocol + Host + Port
VITE_WS_BASE_URL=ws://api.localhost         # WebSocket equivalent

# ❌ Avoid These Patterns
VITE_API_URL=/api                           # Relative paths
VITE_API_ENDPOINT=http://api.localhost/api  # URLs with paths
```

### Library Configuration

```typescript
// ✅ Centralized in libraryServices.ts
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
globalApiService.updateConfig({
  apiUrl: baseUrl,  // No '/api' prefix here
  debug: import.meta.env.DEV,
});
```

### Path Constants

```typescript
// ✅ Centralized in lib.api/src/constants/api-paths.ts
const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',           // Library controls paths
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
} as const;
```

### Service Implementation

```typescript
// ✅ AuthService uses path constants
async login(credentials: LoginRequest): Promise<AuthResponse> {
  return await apiService.post(AUTH_ENDPOINTS.LOGIN, credentials);
  // Results in: http://api.localhost/api/v1/auth/login
}
```

## 🔧 Fixed Components

### 1. ApiService (`lib.api`)
- **Fixed**: `updateConfig()` now updates `baseURL` property
- **Improved**: Better fallback logic for different environments
- **Added**: Path constants for consistent URL construction

### 2. AuthService (`lib.auth`)
- **Centralized**: All endpoint paths in constants
- **Standardized**: Uses path constants instead of hardcoded strings
- **Fixed**: Proper logout cleanup

### 3. Client App Configuration
- **Updated**: Uses `VITE_API_BASE_URL` consistently
- **Centralized**: Single configuration point in `libraryServices.ts`
- **Debuggable**: Enhanced logging for troubleshooting

## 🌍 Environment Configuration

### Development
```bash
VITE_API_BASE_URL=http://localhost:5000     # Direct backend
# OR
VITE_API_BASE_URL=http://api.localhost      # Through nginx proxy
```

### Staging
```bash
VITE_API_BASE_URL=https://api-staging.adoptdontshop.com
```

### Production
```bash
VITE_API_BASE_URL=https://api.adoptdontshop.com
```

## 🧪 Testing & Validation

### Manual Testing
1. Open `api-config-test.html` in browser
2. Check environment variables
3. Verify URL construction
4. Test API connectivity

### URL Construction Verification
```typescript
// ✅ Expected Pattern
const baseUrl = 'http://api.localhost';
const endpoint = '/api/v1/auth/login';  
const result = `${baseUrl}${endpoint}`;
// Result: 'http://api.localhost/api/v1/auth/login' ✅

// ❌ Anti-Pattern (old way)
const badBase = '/api';
const badResult = `${badBase}${endpoint}`;
// Result: '/api/api/v1/auth/login' ❌
```

## 📋 Migration Checklist

- [x] Fix `ApiService.updateConfig()` to update baseURL
- [x] Improve `getBaseUrl()` fallback logic  
- [x] Standardize environment variables to `VITE_API_BASE_URL`
- [x] Create centralized path constants
- [x] Update AuthService to use path constants
- [x] Configure global apiService in libraryServices.ts
- [x] Add comprehensive logging for debugging
- [x] Create validation test page
- [x] Document the new architecture

## 🔍 Debugging

### Enable Debug Mode
```typescript
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: true,  // Shows all API calls
});
```

### Console Output
```
🔧 DEBUG: VITE_API_BASE_URL = http://api.localhost
🔧 DEBUG: Global ApiService configured with baseUrl: http://api.localhost
🌐 API: POST http://api.localhost/api/v1/auth/login
```

## 🚀 Benefits Achieved

1. **No More Double Prefixes**: Fixed `/api/api/v1` issue
2. **Industry Standard**: Follows patterns used by Axios, Apollo Client
3. **Maintainable**: Single source of truth for URL construction
4. **Testable**: Easy to mock and validate URLs
5. **Scalable**: Works across all environments without code changes
6. **Type Safe**: Path constants prevent typos
7. **Debuggable**: Comprehensive logging for troubleshooting

## 🔗 Related Files

### Core Implementation
- `lib.api/src/services/api-service.ts` - Fixed updateConfig()
- `lib.api/src/constants/api-paths.ts` - Path constants
- `lib.auth/src/services/auth-service.ts` - Updated to use constants

### Configuration  
- `app.client/.env` - Environment variables
- `app.client/src/services/libraryServices.ts` - Global configuration

### Testing
- `api-config-test.html` - Validation test page

This implementation follows modern web development best practices and provides a solid foundation for API communication across the entire adopt-dont-shop ecosystem.
