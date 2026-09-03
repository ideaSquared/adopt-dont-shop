# Frontend app-shell pattern

_How the three React apps (`app.admin`, `app.client`, `app.rescue`) are wired: the provider spine,
routing, the Vite dev proxy, env vars, and theming. Per-app product scope lives in the
`app-*-prd.md` files; the rescue app's own contexts and routes are in
[`rescue-architecture.md`](./rescue-architecture.md)._

All three apps are React 19 + TypeScript (strict) + Vite, styled with vanilla-extract (`*.css.ts`),
with server state in TanStack Query v5. They share one shell shape. This doc describes the parts
that are the same; where an app differs, it is called out.

## 1. Provider spine (`src/main.tsx`)

`src/main.tsx` is the entry module. It initialises observability, builds the `QueryClient`, and
renders the provider tree. The common outer spine is:

```
React.StrictMode
  └─ ErrorBoundary                       app-owned, top-level crash guard
     └─ QueryClientProvider              @tanstack/react-query
        └─ AuthProvider                  @adopt-dont-shop/lib.auth (allowedUserTypes, appType, onLogout)
           └─ StatsigWrapper             app-owned contexts/StatsigContext, wraps @statsig/react-bindings
              └─ ThemeProvider           @adopt-dont-shop/lib.components
                 └─ BrowserRouter        react-router, basename={VITE_ROUTER_BASENAME ?? '/'}
                    └─ App               src/App.tsx
                 (+ <Toaster />          @adopt-dont-shop/lib.components, sibling of BrowserRouter)
```

Per-app differences in the spine:

| Concern                | app.client              | app.admin                             | app.rescue                      |
| ---------------------- | ----------------------- | ------------------------------------- | ------------------------------- |
| Auth mount             | `AuthProvider` directly | `AuthProvider` directly               | `AppWithAuth` wrapper component |
| `PermissionsProvider`  | in `App.tsx`            | in `App.tsx` (after auth check)       | in `main.tsx`                   |
| `allowedUserTypes`     | `['adopter']`           | `['admin','moderator','super_admin']` | (set inside `AppWithAuth`)      |
| Extra provider in main | —                       | —                                     | `ChatProvider`                  |

`AuthProvider`, `useAuth`, `PermissionsProvider`, `PermissionGate`, and the `useHasPermission`
family all come from `@adopt-dont-shop/lib.auth`. `PermissionsProvider` takes a
`service={permissionsService}` prop, imported from `@/services/libraryServices`.

## 2. QueryClient defaults

Every app builds the same client (copied deliberately — without these, react-query defaults to
`staleTime: 0` and `retry: 3`):

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (v5 name; was cacheTime in v4)
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: () => toast.error('Something went wrong. Please try again.', { duration: 6000 }),
    },
  },
});
```

## 3. Observability

`main.tsx` calls `initSentry({ dsn: VITE_SENTRY_DSN, appName, environment: MODE, release:
VITE_APP_RELEASE })` and `reportWebVitals(...)` from `@adopt-dont-shop/lib.observability` before
rendering. Both no-op when `VITE_SENTRY_DSN` is unset.

## 4. Routing and lazy loading (`src/App.tsx`)

`App.tsx` mounts the app-specific context providers, then the router. Conventions shared by all
three:

- Page components are `lazy()`-imported for code splitting and rendered under a single top-level
  `<Suspense fallback={<PageLoader />}>`.
- Risky routes (chat, discovery, applications, moderation) are wrapped in a route-level
  `RouteBoundary` — an app-owned `ErrorBoundary` with a `boundary` name — so one route crashing
  does not blank the whole app (ADS-482).
- A `<Route path="*" element={<NotFoundPage />} />` catch-all closes the protected subtree
  (ADS-480).
- The legal UI — `CookieBanner` + `LegalReacceptanceModal` from `@adopt-dont-shop/lib.legal` — is
  mounted once per app (ADS-497). `app.client` wraps both in one `lazy()` boundary (`LegalUI`);
  `app.admin` and `app.rescue` import them directly. `CookieBanner` is shown to anonymous visitors
  too, so first-time choices persist before sign-in.
- `{import.meta.env.DEV && <DevLoginPanel />}` renders a dev-only login helper.

Route trees are per-app and are not shared — read `src/App.tsx` in each app. The rescue tree is
documented in [`rescue-architecture.md`](./rescue-architecture.md).

## 5. Vite dev proxy and library aliases

Each app's `vite.config.ts` proxies `/api`, `/health`, and `/monitoring` to the gateway:

```ts
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
const backendHost = isDocker ? 'service-gateway' : '127.0.0.1';
const backendPort = 4000;
```

Use the `127.0.0.1` literal, not `localhost`: the gateway binds `0.0.0.0` (IPv4-only), so on
IPv6-first hosts `localhost` resolving to `::1` first would `ECONNREFUSED`. This proxy replaces the
deleted `service-backend` monolith; the gateway is the only HTTP surface, on port 4000.

Workspace libraries are aliased to their `src/` for hot-reload in dev via `getLibraryAliases(__dirname, mode)`
from `../../vite.shared.config.ts` (ADS-895 — adding a new `lib.*` is a one-line edit there, shared
by all three apps; the aliases are only applied when `mode === 'development'`). `envDir` points at
the monorepo root, so all apps load the root `.env`.

## 6. Environment variables

All `VITE_*`, read via `import.meta.env`. `.env.example` ships the two base URLs; the rest are
optional and documented in [`docs/env-reference.md`](../env-reference.md).

| Variable                  | Required         | Default                              | Notes                               |
| ------------------------- | ---------------- | ------------------------------------ | ----------------------------------- |
| `VITE_API_BASE_URL`       | yes              | `''` in Docker (uses the Vite proxy) | Gateway base URL                    |
| `VITE_WS_BASE_URL`        | yes              | —                                    | WebSocket base URL                  |
| `VITE_STATSIG_CLIENT_KEY` | no               | unset → flags default off            | Statsig client key                  |
| `VITE_SENTRY_DSN`         | no               | unset → Sentry no-ops                | Error reporting DSN                 |
| `VITE_APP_RELEASE`        | no               | set by CI                            | Sentry release tag                  |
| `VITE_ROUTER_BASENAME`    | no               | `/`                                  | react-router basename               |
| `VITE_ANON_SWIPE_LIMIT`   | no (client only) | —                                    | Anonymous swipe cap on `app.client` |

## 7. Theming

`ThemeProvider` (from `@adopt-dont-shop/lib.components`) wraps each app and applies one of the three
theme classes generated from the token contract in
[`packages/lib.components/src/styles/theme.css.ts`](../../packages/lib.components/src/styles/theme.css.ts).
The `<ThemeToggle />` component cycles `light → normal → dark` and persists the choice in
`localStorage` under the key `theme` (`THEME_STORAGE_KEY`). Every app renders `<ThemeToggle />`
inside its account/settings page. Reference every visual property through `vars.*` tokens — see
[`DESIGN_TOKENS.md`](../../DESIGN_TOKENS.md).

## Related

- [`rescue-architecture.md`](./rescue-architecture.md) — the rescue app's own contexts and routes
- [`app-admin-prd.md`](./app-admin-prd.md), [`app-client-prd.md`](./app-client-prd.md), [`app-rescue-prd.md`](./app-rescue-prd.md) — per-app product scope
- [`DESIGN_TOKENS.md`](../../DESIGN_TOKENS.md) — the styling token contract
- [`docs/frontend/testing.md`](./testing.md) — how the apps are tested
