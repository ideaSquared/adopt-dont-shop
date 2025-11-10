# 🐛 API Double Prefix Debug Guide

**Issue**: API calls are generating double `/api` prefixes: `/api/api/v1/auth/login` instead of `/api/v1/auth/login`

**Error**: `XHR POST http://localhost:3000/api/api/v1/auth/login [HTTP/1.1 404 Not Found 3ms]`

## 🔍 Step-by-Step Debugging

### Step 1: Identify the Source of API Calls

The error shows the request is coming from `localhost:3000` (client app), so we need to trace:
1. Where is the login request being made?
2. Which service is being used?
3. How is the URL being constructed?

### Step 2: Current Configuration Analysis

#### App.Client Environment
- **Local .env**: `VITE_API_URL=http://localhost:5000`
- **Docker override**: `VITE_API_URL=http://service-backend:5000`
- **Vite proxy**: DISABLED (removed)

#### Library Service Configuration
```typescript
// app.client/src/services/libraryServices.ts
const apiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_URL || '',  // ← This should be the full URL
  debug: import.meta.env.MODE === 'development',
});
```

### Step 3: Trace the Login Flow

#### 3.1 Find Login Component
```bash
# Search for login form/component
grep -r "login" app.client/src/pages/ | grep -i login
grep -r "authService\.login" app.client/src/
```

#### 3.2 Check AuthService Implementation
```bash
# Find auth service usage
grep -r "authService" app.client/src/ | head -10
```

#### 3.3 Verify AuthService Source
The login call is likely coming from one of these:
- `@adopt-dont-shop/lib-auth` (new library)
- `app.client/src/services/api.ts` (legacy service)

### Step 4: URL Construction Analysis

#### Expected URL Construction:
```
baseURL + endpoint = final URL
http://service-backend:5000 + /api/v1/auth/login = http://service-backend:5000/api/v1/auth/login ✅
```

#### Current Problem:
```
Something + /api/v1/auth/login = /api/api/v1/auth/login ❌
```

This suggests:
- `baseURL` = `/api` (wrong!)
- `endpoint` = `/api/v1/auth/login`

### Step 5: Systematic Checks

#### 5.1 Environment Variable Check
```bash
# Check what VITE_API_URL is actually set to in the running container
docker-compose exec app-client env | grep VITE_API_URL
```

#### 5.2 Service Configuration Check
```bash
# Check if libraries are using correct configuration
# Add debug logging to see actual URLs being constructed
```

#### 5.3 Network Tab Analysis
```
# In browser dev tools:
# 1. Open Network tab
# 2. Try to login
# 3. Check the actual request URL
# 4. Check request headers and payload
```

## 🔧 Debugging Actions

### Action 1: Add Debug Logging

Add console logging to see exactly what URLs are being constructed:

```typescript
// In libraryServices.ts
console.log('🔧 DEBUG: VITE_API_URL =', import.meta.env.VITE_API_URL);
console.log('🔧 DEBUG: MODE =', import.meta.env.MODE);

const apiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_URL || '',
  debug: true, // Force debug mode
});
```

### Action 2: Check AuthService Implementation

Determine which auth service is actually being used:

```typescript
// Add to the component that calls login
console.log('🔧 DEBUG: authService =', authService);
console.log('🔧 DEBUG: authService.constructor.name =', authService.constructor.name);
```

### Action 3: Test Direct API Call

Bypass all services and make a direct fetch call:

```typescript
// Test direct API call to verify backend is reachable
const testDirectCall = async () => {
  try {
    const response = await fetch('http://service-backend:5000/api/v1/health/simple');
    console.log('Direct API call result:', response.status);
  } catch (error) {
    console.error('Direct API call failed:', error);
  }
};
```

## 🎯 Hypothesis & Next Steps

### Primary Hypothesis
The `@adopt-dont-shop/lib-auth` service is not receiving the correct `apiUrl` configuration and is falling back to a default that includes `/api`.

### Secondary Hypothesis
There might be multiple auth services in use (legacy vs new library) causing confusion.

### Immediate Actions Needed:
1. ✅ Add debug logging to identify which service is being used
2. ✅ Verify the actual `VITE_API_URL` value in the running container
3. ✅ Check the `lib-auth` service implementation for URL construction
4. ✅ Test with a direct API call to isolate the issue

## 🎯 Root Cause Identified ✅

**Problem**: The `AuthService` from `@adopt-dont-shop/lib-auth` imports and uses the **global `apiService`** from `lib-api`, which has a default configuration:

```typescript
// In lib.api/src/services/api-service.ts
private getBaseUrl(): string {
  return '/api';  // ← This is the problem!
}

export const apiService = new ApiService(); // ← No config, uses default baseURL = '/api'
```

**URL Construction**:
```
baseURL + endpoint = final URL
/api + /api/v1/auth/login = /api/api/v1/auth/login ❌
```

## � Solution Applied ✅

Configure the global `apiService` to use the correct API URL:

```typescript
// In app.client/src/services/libraryServices.ts
import { apiService as globalApiService } from '@adopt-dont-shop/lib-api';
globalApiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL || '',
  debug: true,
});
```

**Now URL Construction**:
```
baseURL + endpoint = final URL
http://service-backend:5000 + /api/v1/auth/login = http://service-backend:5000/api/v1/auth/login ✅
```

## �📋 Investigation Checklist

- [x] ✅ Confirm which auth service is being imported and used
- [x] ✅ Verify VITE_API_URL value in running container  
- [x] ✅ Add debug logging to service initialization
- [x] ✅ Check lib-auth service implementation
- [x] ✅ Identify global apiService configuration issue
- [x] ✅ Apply fix to configure global apiService
- [ ] 🔄 Test that login now works correctly
- [ ] 🔄 Verify no other API calls have the double prefix issue

---

**Status**: FIX APPLIED - Testing needed to confirm resolution
