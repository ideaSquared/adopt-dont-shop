---
name: api-fetch
description: >
  Rules for making API calls in frontend components. Apply when writing or reviewing any
  component, hook, or service that fetches data or submits state-changing requests.
user-invocable: false
---

# API Fetch Rules for Adopt Don't Shop

All API calls in frontend apps MUST go through the shared `apiService` instance from
`../services/libraryServices`. Never use raw `fetch` or `axios` directly in components or hooks.

## Why This Matters

This project runs in Docker with a Vite dev server proxy. The proxy rewrites requests from the
browser origin (e.g. `localhost:3001`) to the backend (`service-backend:5000`). Raw `fetch`
calls that bypass the proxy — for example by using an absolute `http://localhost:5000` URL —
break CSRF protection because:

1. The CSRF token cookie is issued to the Vite proxy origin
2. A raw `fetch` to `localhost:5000` hits a different origin, so the browser either blocks the
   cookie or the backend rejects the token as mismatched

Every state-changing request (POST, PUT, PATCH, DELETE) requires a CSRF token header
(`x-csrf-token`). Only `apiService` fetches and attaches this automatically via its request
interceptor.

## Rules

### Always use `apiService`

```typescript
// CORRECT
import { apiService } from '../services/libraryServices';

const data = await apiService.get<{ data: User[] }>('/api/v1/users');
await apiService.post('/api/v1/field-permissions/bulk', { overrides });
```

```typescript
// WRONG — bypasses CSRF, breaks in Docker
const token = authService.getToken();
const res = await fetch('/api/v1/field-permissions/bulk', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ overrides }),
});
```

### Never construct absolute URLs from env vars in components

```typescript
// WRONG — breaks CSRF when VITE_API_BASE_URL differs from the Vite proxy origin
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
fetch(`${apiBase}/api/v1/...`);
```

`apiService` already knows the base URL. Pass only paths starting with `/api/`.

### Never manually attach auth tokens

`apiService` attaches `Authorization: Bearer <token>` automatically via its auth interceptor.
Do not read from `localStorage` or call `authService.getToken()` before a fetch.

### Do not import `authService` just for token access

```typescript
// WRONG
import { authService } from '@adopt-dont-shop/lib.auth';
const token = authService.getToken();
fetch(..., { headers: { Authorization: `Bearer ${token}` } });

// CORRECT — apiService handles this
import { apiService } from '../services/libraryServices';
await apiService.get('/api/v1/...');
```

You may still import `useAuth` for reading auth state (e.g. `isAuthenticated`) in components.

## Vite Proxy Configuration

The Vite proxy target is determined at dev server startup by the `DOCKER_ENV` environment
variable (set to `'true'` in all app Docker containers):

- `DOCKER_ENV=true` → proxy target is `http://service-backend:5000` (Docker internal DNS)
- otherwise → proxy target is `http://localhost:5000` (local dev outside Docker)

`VITE_API_BASE_URL` is set to `''` (empty string) in Docker so that `apiService` uses relative
URLs, which always route through the Vite proxy on the same origin.

Do not change these env vars or override the proxy target without understanding the CSRF
implications.

## CSRF Token Lifecycle

1. On first state-changing request, `apiService` calls `GET /api/v1/csrf-token`
2. The backend sets a `psifi.x-csrf-token` cookie and returns a token in the response body
3. `apiService` caches the token and adds it as `x-csrf-token` on all subsequent
   POST/PUT/PATCH/DELETE requests
4. On a 403 CSRF error, `apiService` clears the cache and will re-fetch on the next request

This flow only works correctly when all requests — including the CSRF token fetch — go through
the same origin. That is only guaranteed when using `apiService` with relative URLs.

## Adding New Endpoints

When building a new feature with backend API calls:

1. Add a service file in `app.*/src/services/` that imports and uses `apiService`
2. Or call `apiService` methods directly from a custom hook
3. Never call `apiService` from inside a component render — always use `useEffect`, event
   handlers, or a custom hook

```typescript
// app.admin/src/services/myFeatureService.ts
import { apiService } from './libraryServices';
import type { MyThing } from '../types/myThing';

export const myFeatureService = {
  getAll: () => apiService.get<{ data: MyThing[] }>('/api/v1/my-things'),
  create: (payload: CreateMyThingPayload) =>
    apiService.post<{ data: MyThing }>('/api/v1/my-things', payload),
};
```
