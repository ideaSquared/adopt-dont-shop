# Shared Libraries

The monorepo ships **24 workspace libraries** under `@adopt-dont-shop/lib.*`. Each library's authoritative documentation is its own `README.md` next to the source — those READMEs are kept code-verified.

## Standards

- ESM by default; `lib.permissions` and `lib.types` additionally emit a CJS bundle via a second `tsc -p tsconfig.cjs.json` pass for backend consumers, exposed through the `require` condition in their `exports` map
- TypeScript strict mode
- Built with `tsc` (`lib.components` uses Vite to bundle styles/assets), orchestrated by Turborepo (`dependsOn: ["^build"]`)
- Tested with Vitest — every library ships a `vitest.config.ts` and an `pnpm test` script that runs `vitest run`
- Workspace-linked: depend on each other with the `"workspace:*"` protocol and rely on `pnpm install` at the repo root

## Index

### Transport & data
- [`lib.api`](../../packages/lib.api/README.md) — HTTP client, interceptors, auth-token plumbing ([architecture](../../packages/lib.api/ARCHITECTURE.md))
- [`lib.types`](../../packages/lib.types/README.md) — shared types and constants (zero-dep, safe for both runtimes)
- [`lib.validation`](../../packages/lib.validation/README.md) — canonical Zod schemas (User / Pet / Rescue / Application)

### Auth & access
- [`lib.auth`](../../packages/lib.auth/README.md) — sessions, two-factor, `AuthProvider` / `useAuth`
- [`lib.permissions`](../../packages/lib.permissions/README.md) — RBAC + field-level permission services
- [`lib.invitations`](../../packages/lib.invitations/README.md) — staff/user invitations

### Domain services
- [`lib.applications`](../../packages/lib.applications/README.md) — adoption application lifecycle
- [`lib.chat`](../../packages/lib.chat/README.md) — Socket.IO real-time messaging
- [`lib.discovery`](../../packages/lib.discovery/README.md) — swipe-based pet discovery sessions
- [`lib.notifications`](../../packages/lib.notifications/README.md) — email / push / in-app / SMS delivery
- [`lib.pets`](../../packages/lib.pets/README.md) — read-side `PetsService` + write-side `PetManagementService`
- [`lib.rescue`](../../packages/lib.rescue/README.md) — rescue profiles, staff, settings
- [`lib.search`](../../packages/lib.search/README.md) — cross-domain search client
- [`lib.moderation`](../../packages/lib.moderation/README.md) — reporting + moderation workflow
- [`lib.support-tickets`](../../packages/lib.support-tickets/README.md) — support ticket creation / tracking
- [`lib.audit-logs`](../../packages/lib.audit-logs/README.md) — audit logging for sensitive actions
- [`lib.matching`](../../packages/lib.matching/README.md) — shared types for pet-adopter matching

### UI & analytics
- [`lib.components`](../../packages/lib.components/README.md) — shared React components
- [`lib.analytics`](../../packages/lib.analytics/README.md) — event tracking
- [`lib.feature-flags`](../../packages/lib.feature-flags/README.md) — Statsig hooks (`useFeatureGate`, `useDynamicConfig`, `useConfigValue`) + typed gate/config constants
- [`lib.observability`](../../packages/lib.observability/README.md) — Sentry init, Web Vitals reporter, analytics-consent gate
- [`lib.legal`](../../packages/lib.legal/README.md) — legal re-acceptance modal, cookie banner, consent service

### Utilities
- [`lib.utils`](../../packages/lib.utils/README.md) — formatters, locale, env helpers
- [`lib.dev-tools`](../../packages/lib.dev-tools/README.md) — dev-only tooling

## Common commands

```bash
# Build / test / lint a single library
pnpm exec turbo build --filter=@adopt-dont-shop/lib.api
pnpm exec turbo test  --filter=@adopt-dont-shop/lib.auth
pnpm exec turbo lint  --filter=@adopt-dont-shop/lib.permissions

# All libraries
pnpm build:libs

```

## See also

- [Microservices Standards](../infrastructure/MICROSERVICES-STANDARDS.md)
- [Backend testing](../backend/testing.md)
- [Backend API endpoints](../backend/api-endpoints.md)
