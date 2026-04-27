# Shared Libraries

The monorepo ships **21 workspace libraries** under `@adopt-dont-shop/lib.*`. Each library's authoritative documentation is its own `README.md` next to the source — those READMEs are kept code-verified.

## Standards

- ESM-only, TypeScript strict mode
- Built with `tsc`, orchestrated by Turborepo (`dependsOn: ["^build"]`)
- Tested with Jest (Node libraries) or Vitest (libraries co-located with apps)
- Workspace-linked: depend on each other with `"*"` and rely on `npm install` at the repo root

## Index

### Transport & data
- [`lib.api`](../../lib.api/README.md) — HTTP client, interceptors, auth-token plumbing ([architecture](../../lib.api/ARCHITECTURE.md))
- [`lib.types`](../../lib.types/README.md) — shared types and constants (zero-dep, safe for both runtimes)
- [`lib.validation`](../../lib.validation/README.md) — canonical Zod schemas (User / Pet / Rescue / Application)

### Auth & access
- [`lib.auth`](../../lib.auth/README.md) — sessions, two-factor, `AuthProvider` / `useAuth`
- [`lib.permissions`](../../lib.permissions/README.md) — RBAC + field-level permission services
- [`lib.invitations`](../../lib.invitations/README.md) — staff/user invitations

### Domain services
- [`lib.applications`](../../lib.applications/README.md) — adoption application lifecycle
- [`lib.chat`](../../lib.chat/README.md) — Socket.IO real-time messaging
- [`lib.discovery`](../../lib.discovery/README.md) — swipe-based pet discovery sessions
- [`lib.notifications`](../../lib.notifications/README.md) — email / push / in-app / SMS delivery
- [`lib.pets`](../../lib.pets/README.md) — read-side `PetsService` + write-side `PetManagementService`
- [`lib.rescue`](../../lib.rescue/README.md) — rescue profiles, staff, settings
- [`lib.search`](../../lib.search/README.md) — cross-domain search client
- [`lib.moderation`](../../lib.moderation/README.md) — reporting + moderation workflow
- [`lib.support-tickets`](../../lib.support-tickets/README.md) — support ticket creation / tracking
- [`lib.audit-logs`](../../lib.audit-logs/README.md) — audit logging for sensitive actions

### UI & analytics
- [`lib.components`](../../lib.components/README.md) — shared React components
- [`lib.analytics`](../../lib.analytics/README.md) — event tracking
- [`lib.feature-flags`](../../lib.feature-flags/README.md) — Statsig type definitions

### Utilities
- [`lib.utils`](../../lib.utils/README.md) — formatters, locale, env helpers
- [`lib.dev-tools`](../../lib.dev-tools/README.md) — dev-only tooling

## Common commands

```bash
# Build / test / lint a single library
npx turbo build --filter=@adopt-dont-shop/lib.api
npx turbo test  --filter=@adopt-dont-shop/lib.auth
npx turbo lint  --filter=@adopt-dont-shop/lib.permissions

# All libraries
npm run build:libs

# After editing lib.types in Docker dev
npm run docker:rebuild:types
```

## See also

- [Microservices Standards](../infrastructure/MICROSERVICES-STANDARDS.md)
- [Backend testing](../backend/testing.md)
- [Backend API endpoints](../backend/api-endpoints.md)
