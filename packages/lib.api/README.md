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

Then run `pnpm install` at the repo root to link.

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

Pet response payloads land as the `ApiPet` / `TransformedPet` types in `src/types/`; the client passes them through unchanged and consumers destructure the fields they need. There is no in-service snake_case→camelCase or PostGIS-geometry transformer at the moment — the example below shows the shapes involved, not a mapping the client applies.

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

The package exports several error classes that each extend the built-in `Error` directly — they are **not** subclasses of `ApiError`. `ApiError` itself is one of those classes and carries an HTTP status; the others are sibling classes for non-HTTP failure modes (network, timeout, validation) or HTTP-specific cases that arrive with their own shape (`NotFoundError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, `ValidationError`). Narrow with `instanceof` on the specific class you care about:

```typescript
import {
  apiService,
  ApiError,
  NetworkError,
  NotFoundError,
  AuthenticationError,
} from '@adopt-dont-shop/lib.api';

try {
  await apiService.get('/api/v1/pets');
} catch (err) {
  if (err instanceof AuthenticationError) {
    // 401 — surface a sign-in prompt
  } else if (err instanceof NotFoundError) {
    // 404 — surface an empty state
  } else if (err instanceof ApiError) {
    // any other HTTP status — err.status, err.code, err.details
  } else if (err instanceof NetworkError) {
    // request never reached the server
  }
  throw err;
}
```

The `createHttpError(status, ...)` factory in `src/errors/index.ts` chooses the appropriate class based on status code. See that file for the authoritative list.

## Development

From the repo root:

```bash
pnpm exec turbo build --filter=@adopt-dont-shop/lib.api
pnpm exec turbo test  --filter=@adopt-dont-shop/lib.api
pnpm exec turbo lint  --filter=@adopt-dont-shop/lib.api
```

Or from `lib.api/`:

```bash
pnpm build
pnpm test
pnpm lint
```

<!-- CONSUMERS:START (auto-generated by scripts/generate-dependency-docs.mjs — do not edit by hand) -->
## Consumers

19 workspace package(s) depend on this library. See [lib.api-consumers.md](../../docs/libraries/lib.api-consumers.md) for the auto-generated list — check it before making a breaking change.
<!-- CONSUMERS:END -->
