# @adopt-dont-shop/lib.dev-tools

Development-only utilities for the Adopt Don't Shop apps: seeded-user login panels, Ethereal mail preview credentials, and environment guards. The library is designed to be tree-shaken out of production bundles via the `DevOnly` wrapper and `isDevelopmentMode()` guard.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.dev-tools": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

### Components

- **`DevPanelComponent`** — dev-user quick-switcher panel. Takes a `DevPanelAuthContext` (your auth's `login`/`logout`/`currentUser`) and a list of `DevUser`s.
- **`EtherealCredentialsPanel`** — shows the per-session Ethereal SMTP credentials backend issues when `EMAIL_PROVIDER=ethereal`.
- **`DevOnly`** — wraps children and only renders them when `isDevelopmentMode()` is true. Accepts an optional `fallback`.

### Hooks

- **`useSeededUsers()`** — React Query hook returning seeded dev users from the backend.
- **`useEtherealCredentials()`** — React Query hook returning the backend's current Ethereal preview credentials.

### Seeded-user data

- **`seededDevUsers`** — static list of dev accounts
- **`SEEDED_PASSWORD`** — shared password for every seeded account
- **`getAllDevUsers`**, **`getAdminUsers`**, **`getRescueUsers`**, **`getAdopterUsers`**, **`getDevUsersByType(type)`** — filtered accessors

### Environment guards

- **`isDevelopmentMode()`** — true when running on `localhost`, `127.0.0.1`, a `*dev*` hostname, or `NODE_ENV === 'development'`.

## Quick start

```tsx
import { DevOnly, DevPanelComponent, useSeededUsers } from '@adopt-dont-shop/lib.dev-tools';
import { useAuth } from '@adopt-dont-shop/lib.auth';

export function DevHeader() {
  const { login, logout, currentUser } = useAuth();
  const { data: users } = useSeededUsers();

  return (
    <DevOnly>
      <DevPanelComponent
        auth={{ login, logout, currentUser }}
        users={users ?? []}
      />
    </DevOnly>
  );
}
```

## Scripts (from `lib.dev-tools/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # vitest run
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Notes

The `exports` field resolves to `./src/index.ts` under the `development` condition (picked up by Vite) and to `./dist/index.js` in production. That's why the library hot-reloads without a build in dev but still publishes built output for production bundles.
