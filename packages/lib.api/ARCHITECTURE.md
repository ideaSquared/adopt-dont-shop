# lib.api — HTTP Transport Layer

Read this when you need the internals of the shared client: how the interceptor
pipeline runs, how cookie auth and CSRF are wired, and how HTTP status maps to
error classes. For the public surface and how to configure the singleton, see
[`README.md`](README.md).

## Overview

`lib.api` is a **pure HTTP transport layer**. It owns no business logic; the
domain libraries (`lib.auth`, `lib.pets`, `lib.chat`, …) build on top of it. It
provides typed HTTP methods, a request/response interceptor pipeline,
cookie-based auth, double-submit CSRF, structured errors with HTTP status
mapping, `AbortController` timeouts, and a small in-memory response cache.

## Interceptor pipeline

Every request runs through registered request interceptors, then the fetch,
then response/error interceptors. Interceptors are the seam for app-specific
concerns — CSRF header injection and the optional bearer-token hook are built
in; apps add their own (e.g. dev logging, redirect-on-401).

```typescript
import { apiService, AuthenticationError } from '@adopt-dont-shop/lib.api';

// Redirect to login when the refresh flow ultimately fails.
apiService.interceptors.addErrorInterceptor(async (error) => {
  if (error instanceof AuthenticationError) {
    window.location.href = '/login';
  }
  return error;
});

if (import.meta.env.DEV) {
  apiService.interceptors.addRequestInterceptor(async (config) => {
    console.log(`${config.method} ${config.url}`);
    return config;
  });
}
```

## Cookie model

There is no token in JavaScript. The gateway sets `accessToken` and
`refreshToken` as HttpOnly cookies on login and refresh; `lib.api` sends
`credentials: 'include'` on every request so the browser attaches them. A
non-HttpOnly `hasSession` marker cookie lets `lib.auth` read session state
without exposing the token. `getAuthToken` in the config is a bearer-token
escape hatch for non-cookie callers, not the default path.

## CSRF (double-submit)

State-changing requests carry an `x-csrf-token` header. `getCsrfToken()` reads
the non-HttpOnly `csrfToken` cookie (fetching one from the server on first call
and caching it), and the request interceptor copies it into the header; the
gateway compares header against cookie. A 403 clears the cached token so the
next request re-fetches. `getCsrfToken()` is public so other libraries
(`lib.chat`) can reuse the same token.

## Domain-library usage

Domain services wrap the singleton and translate its errors into their own
result shapes.

```typescript
// lib.pets/src/services/pets-service.ts
import { apiService, ApiError } from '@adopt-dont-shop/lib.api';
import type { Pet, PetSearchFilters, PaginatedResponse } from '../types';

export class PetsService {
  constructor(private api = apiService) {}

  async searchPets(filters: PetSearchFilters): Promise<PaginatedResponse<Pet>> {
    try {
      // apiService.get(url, params) — the query object is the second argument.
      return await this.api.get('/api/v1/pets', filters);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { data: [], pagination: { totalItems: 0 } };
      }
      throw error;
    }
  }

  async getFeaturedPets(limit = 12): Promise<Pet[]> {
    // Featured pets are a query param, not a sub-route.
    const response = await this.api.get('/api/v1/pets', { featured: true, limit });
    return response.data ?? [];
  }
}

export const petsService = new PetsService();
```

`lib.auth` follows the same pattern for login — and stores nothing. The gateway
sets the cookies; the client only reads the response body:

```typescript
async login(credentials: LoginRequest): Promise<AuthResponse> {
  // Sets accessToken/refreshToken/hasSession cookies server-side. No localStorage.
  return await this.api.post('/api/v1/auth/login', credentials);
}

async refreshToken(): Promise<AuthResponse> {
  // Refresh token rides in its HttpOnly cookie; the body is empty.
  return await this.api.post('/api/v1/auth/refresh-token');
}
```

## Error to HTTP mapping

`createHttpError(status, message, code?, details?)` picks the error class from
the status code. Each class extends `Error` directly:

| Status   | Error class                                      |
| -------- | ------------------------------------------------ |
| 400, 422 | `ValidationError`                                |
| 401      | `AuthenticationError`                            |
| 403      | `AuthorizationError`                             |
| 404      | `NotFoundError`                                  |
| 409      | `ConflictError`                                  |
| other    | `ApiError` (carries `status`, `code`, `details`) |

Transport failures throw `NetworkError`; aborted/timed-out requests throw
`TimeoutError`. Callers narrow with `instanceof` rather than reading status
codes by hand.

## Response cache

The singleton keeps a small in-memory response cache. `clearCache()` empties it
(e.g. after a mutation that invalidates cached reads); `clearCsrfToken()` drops
the cached CSRF token after logout or a 403.
