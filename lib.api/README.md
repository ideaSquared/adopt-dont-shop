# @adopt-dont-shop/lib.api

A **pure HTTP transport layer** for the Adopt Don't Shop monorepo. Provides a typed `ApiService` with interceptors, authentication token injection, CSRF handling, error types, and PostGIS/pet data transformation. Domain-specific libraries (`lib.auth`, `lib.pets`, `lib.chat`, …) build on top of this.

## Architecture

```
┌─────────────────────────────────────────┐
│        Application Layer                │
│  app.client │ app.rescue │ app.admin    │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Domain Libraries                │
│  lib.auth │ lib.pets │ lib.rescue │ …   │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│       Infrastructure Layer              │
│              lib.api                    │
│   HTTP • Auth • Interceptors • Errors   │
└─────────────────────────────────────────┘
```

## Features

- HTTP methods: `get`, `post`, `put`, `patch`, `delete`, `fetch`, `fetchWithAuth`, `uploadFile`, `healthCheck`
- Request/response interceptor pipeline
- Automatic auth token injection (pluggable `getAuthToken` callback)
- CSRF token fetching and injection for state-changing requests
- Configurable timeout with `AbortController`
- Structured error types with HTTP status mapping
- Pet data transformation (snake_case ↔ camelCase, PostGIS geometry → readable strings)
- Small in-memory cache with manual invalidation
- Debug logging toggle
- Full TypeScript types

## Installation

This is a workspace package — add to a consumer's `package.json`:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.api": "*"
  }
}
```

Then run `npm install` at the repo root to link.

## Quick Start

```typescript
import { apiService, ApiService, API_PATHS, buildApiPath } from '@adopt-dont-shop/lib.api';

// Configure the default singleton
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  debug: import.meta.env.DEV,
  timeout: 15000,
  getAuthToken: () => localStorage.getItem('accessToken'),
});

// Make requests
const pets = await apiService.get('/api/v1/pets', { page: 1, limit: 20 });
const pet = await apiService.get(`/api/v1/pets/${id}`);
```

For authentication flows (login, register, session, refresh), use [`@adopt-dont-shop/lib.auth`](../lib.auth/README.md) — it wraps `lib.api` with the full auth surface. Do not look for `authService` in this package; it does not export one.

## File Uploads

```typescript
const file = new File(['…'], 'pet-photo.jpg', { type: 'image/jpeg' });
const response = await apiService.uploadFile('/api/v1/pets/123/photos', file, {
  caption: 'Cute photo of Max',
  isPrimary: true,
});
```

## API Reference

### Exports

From `@adopt-dont-shop/lib.api`:

- `ApiService` — the class
- `apiService` — default singleton instance
- `api` — convenience alias
- `API_PATHS`, `buildApiPath` — URL helpers
- `*` from `./interceptors` — interceptor utilities
- `*` from `./errors` — error types
- Type exports: `ApiServiceConfig`, `ApiServiceOptions`, `FetchOptions`, `BaseResponse`, `ErrorResponse`, `ApiResponse`, `PaginatedResponse`, `ApiPet`, `TransformedPet`, `PetImage`, `PetLocation`, `PetRescue` (and all other types re-exported from `./types`)

### ApiService methods

- `get<T>(url, params?)` — GET with query-string params
- `post<T>(url, data?)` — POST with JSON body
- `put<T>(url, data?)` — PUT with JSON body
- `patch<T>(url, data?)` — PATCH with JSON body
- `delete<T>(url, data?)` — DELETE
- `fetch<T>(url, options?)` — low-level fetch
- `fetchWithAuth<T>(url, options?)` — fetch with auth header
- `uploadFile<T>(url, file, additionalData?)` — multipart upload
- `healthCheck()` — resolves to `boolean`
- `updateConfig(partial)` — merge config
- `getConfig()` — return current config
- `clearCache()` — clear the in-memory request cache
- `clearCsrfToken()` — force re-fetch of CSRF on next write

### Configuration

```typescript
type ApiServiceConfig = {
  apiUrl?: string;                                // Base API URL
  debug?: boolean;                                // Debug logging
  timeout?: number;                               // Request timeout (ms)
  headers?: Record<string, string>;               // Default headers
  getAuthToken?: () => string | null | Promise<string | null>;
  // … see src/types for the full type
};
```

## Data Transformation

Responses that contain pet objects are automatically normalised from API snake_case to camelCase, and PostGIS geometry is converted to a readable `"lat, lng"` string. See `src/transformers` for the precise mapping.

```typescript
// API Response (snake_case)
{
  pet_id: '123',
  short_description: 'Friendly dog',
  images: [{ image_id: '456', is_primary: true, order_index: 0 }],
  location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
  created_at: '2023-01-01T00:00:00Z',
}

// Transformed
{
  petId: '123',
  shortDescription: 'Friendly dog',
  photos: [{ photoId: '456', isPrimary: true, order: 0 }],
  location: '37.7749, -122.4194',
  createdAt: '2023-01-01T00:00:00Z',
}
```

## Environment Variables

The library reads API URL from `VITE_API_BASE_URL` (canonical) or `VITE_API_URL` (legacy fallback). Prefer `VITE_API_BASE_URL` — it's the name used in `.env.example` and the `vite-env.d.ts` declaration in each app.

## Error Handling

Errors are thrown as `ApiError` subclasses with HTTP status attached. Import from the package and narrow with `instanceof`:

```typescript
import { apiService, ApiError } from '@adopt-dont-shop/lib.api';

try {
  await apiService.get('/api/v1/pets');
} catch (err) {
  if (err instanceof ApiError && err.status === 401) {
    // handle unauthenticated
  }
  throw err;
}
```

See `src/errors` for the concrete error classes.

## Development

From the repo root:

```bash
npx turbo build --filter=@adopt-dont-shop/lib.api
npx turbo test  --filter=@adopt-dont-shop/lib.api
npx turbo lint  --filter=@adopt-dont-shop/lib.api
```

Or from `lib.api/`:

```bash
npm run build
npm test
npm run lint
```
