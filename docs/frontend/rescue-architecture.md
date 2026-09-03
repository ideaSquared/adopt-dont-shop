# Rescue app architecture

_Reference: how `app.rescue`'s shell, contexts, and routes are wired today. The pattern shared with
`app.admin` and `app.client` lives in [`app-shell.md`](./app-shell.md); product scope is in
[`app-rescue-prd.md`](./app-rescue-prd.md). This doc is not a delivery plan._

`app.rescue` is the rescue-organization portal — pet listings, application review, foster
coordination, staff management, events, reporting, and chat with adopters. It follows the shared
[app-shell pattern](./app-shell.md); this doc covers only what is specific to the rescue app.

## Provider spine

The rescue app is unusual in mounting more of its providers in `src/main.tsx` rather than
`src/App.tsx`. The order is:

```
ErrorBoundary → QueryClientProvider → AppWithAuth → StatsigWrapper
  → PermissionsProvider(service=permissionsService) → ThemeProvider → ChatProvider
    → BrowserRouter → App   (+ <Toaster />)
```

Authentication comes from `AppWithAuth` (which wraps `AuthProvider` from `@adopt-dont-shop/lib.auth`).
Permissions come from `PermissionsProvider` / `useHasPermission` (also `lib.auth`), backed by
`@adopt-dont-shop/lib.permissions`. There is no app-owned permissions context.

## App-owned contexts (`src/contexts/`)

The rescue app owns exactly two contexts:

| Context          | Owns                                               | Hook      |
| ---------------- | -------------------------------------------------- | --------- |
| `ChatContext`    | Per-app chat connection state from `lib.chat`      | `useChat` |
| `StatsigContext` | Wraps `@statsig/react-bindings` (`StatsigWrapper`) | —         |

Everything else is consumed directly from libraries: auth and permissions from `lib.auth`, analytics
from `lib.analytics`, notifications from `lib.notifications`. Unlike `app.client`, the rescue app does
**not** own Analytics, Notifications, Favorites, or MatchAcknowledgement providers.
Rescue-organization data (settings, staff, etc.) is fetched on demand via React Query — there is no
`RescueContext`.

## Routes (`src/App.tsx`)

The router has a public (unauthenticated) branch and a protected branch, gated on
`useAuth().isAuthenticated`.

Unauthenticated:

```
/accept-invitation   AcceptInvitation
/register-rescue     RegisterRescue
/login               LoginPage
*                    → redirect to /login
```

Authenticated (inside `ProtectedRoute` → `Layout`):

```
/                       Dashboard
/pets                   PetManagement
/applications/:id?      Applications        (one route serves list + deep-linkable detail, ADS D4)
/staff                  StaffManagement
/settings               RescueSettings
/communication          Communication
/events                 Events
/foster                 FosterCoordination
/analytics              Analytics
/reports                Reports
/reports/new            ReportBuilderPage
/reports/:id            ReportViewPage
/reports/:id/edit       ReportBuilderPage
*                       NotFoundPage
/accept-invitation, /register-rescue also resolve here; /login redirects to /
```

Pages are `lazy()`-imported. `Applications` and `Communication` are additionally wrapped in a
route-level `RouteBoundary` (ADS-482).

## Page components (`src/pages/`)

`Dashboard`, `PetManagement`, `Applications`, `StaffManagement`, `RescueSettings`, `Communication`,
`Events`, `FosterCoordination`, `Analytics`, `Reports`, `ReportBuilderPage`, `ReportViewPage`,
`AcceptInvitation`, `RegisterRescue`, `LoginPage`, `NotFoundPage`.

```ts
// Lazy loading, e.g.:
const PetManagement = lazy(() => import('./pages/PetManagement'));
```

The component inventory lives in the source tree — browse `apps/rescue/src/components/<area>/`. For
example, analytics components are `AdoptionTrendsChart`, `ConversionFunnelChart`,
`StageDistributionChart`, and `ExportButton` (`src/components/analytics/`); staff components are
`StaffOverview`, `InviteStaffModal`, and `PendingInvitations` (`src/components/staff/`).

## Server state (React Query)

Server state is TanStack Query v5 with the shared client defaults (see
[`app-shell.md` §2](./app-shell.md)):

```ts
{
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 10 * 60 * 1000,     // 10 minutes
  refetchOnWindowFocus: false,
}
```

Typical query areas: pet lists and detail, applications by status and their history, and analytics
(dashboard metrics, adoption statistics, custom reports).

## Real-time

Chat and notifications use Socket.IO via `lib.chat` / `lib.notifications`; connections attach on
authentication and reconnect with backoff.

## Related

- [`app-shell.md`](./app-shell.md) — the shared shell (provider spine, Vite proxy, env vars, theming)
- [`app-rescue-prd.md`](./app-rescue-prd.md) — product requirements and roadmap
- [`../backend/api-endpoints.md`](../backend/api-endpoints.md) — gateway endpoints
- [`packages/lib.components/README.md`](../../packages/lib.components/README.md) — component library
- [`testing.md`](./testing.md) — frontend testing guide
