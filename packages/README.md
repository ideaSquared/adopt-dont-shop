# Packages

All shared workspace packages, scoped under `@adopt-dont-shop/`. Three groups:

- **Frontend-shared libraries** (`lib.*`) — consumed by the React apps
  (`app.client`, `app.admin`, `app.rescue`). Most are HTTP service clients +
  React Query hooks + types.
- **Service-only shared packages** — backend substrate consumed by the gateway
  and the gRPC services.
- **ESLint configs** — shared lint presets.

Each package has its own `README.md` with the canonical, code-verified detail;
this is just the map. The `lib.*` references are also indexed from
[`docs/libraries/README.md`](../docs/libraries/README.md).

## Frontend-shared libraries (`lib.*`)

| Package | Purpose |
| --- | --- |
| [lib.analytics](./lib.analytics/README.md) | Event-tracking client — batched engagement events, metrics, A/B results. |
| [lib.api](./lib.api/README.md) | HTTP transport: typed `ApiService`, interceptors, auth-token injection, CSRF, PostGIS transforms. |
| [lib.applications](./lib.applications/README.md) | Adoption-application lifecycle client — submit, update, transition, documents. |
| [lib.audit-logs](./lib.audit-logs/README.md) | Audit-log data access — filtering, pagination, date ranges. |
| [lib.auth](./lib.auth/README.md) | Auth flows (login, registration, sessions, 2FA), `AuthProvider` / `useAuth`. |
| [lib.chat](./lib.chat/README.md) | Real-time chat / messaging on Socket.IO. |
| [lib.components](./lib.components/README.md) | Shared React component library / design system (vanilla-extract). |
| [lib.dev-tools](./lib.dev-tools/README.md) | Dev-only utilities — seeded-user login, Ethereal mail preview, env guards (tree-shaken in prod). |
| [lib.discovery](./lib.discovery/README.md) | Swipe-based pet-discovery — queue, swipes, sessions. |
| [lib.feature-flags](./lib.feature-flags/README.md) | Statsig hooks + typed gate constants for flags / A-B tests. |
| [lib.invitations](./lib.invitations/README.md) | Staff / volunteer invitation client — send, list, cancel, accept. |
| [lib.legal](./lib.legal/README.md) | Re-acceptance modal, cookie banner, consent service (TOS / privacy / cookies). |
| [lib.matching](./lib.matching/README.md) | Types-only package for pet-adopter matching shapes (zero runtime). |
| [lib.moderation](./lib.moderation/README.md) | Content moderation / user reporting client. |
| [lib.notifications](./lib.notifications/README.md) | Multi-channel notification client — email / push / in-app / SMS. |
| [lib.observability](./lib.observability/README.md) | Frontend observability — Sentry init, Web Vitals, analytics-consent gate. |
| [lib.permissions](./lib.permissions/README.md) | Frontend RBAC + field-level permission services. |
| [lib.pets](./lib.pets/README.md) | Pet data — search, favourites, rescue-side CRUD + media. |
| [lib.rescue](./lib.rescue/README.md) | Rescue-org client — profiles, listings, policies, search. |
| [lib.search](./lib.search/README.md) | Cross-domain search client — pets, messages, facets, suggestions. |
| [lib.support-tickets](./lib.support-tickets/README.md) | Support-ticket schemas, client, React Query hooks. |
| [lib.types](./lib.types/README.md) | Shared types, permission constants, default configs (zero-dep; backend + frontend safe). |
| [lib.utils](./lib.utils/README.md) | Shared utility functions / helpers. |
| [lib.validation](./lib.validation/README.md) | Canonical Zod schemas (User, Pet, Rescue, Application) — one source of truth. |

## Service-only shared packages

| Package | Purpose |
| --- | --- |
| [proto](./proto/README.md) | Protobuf schemas + generated TypeScript for gRPC and NATS contracts (hermetic codegen, committed output). |
| [events](./events/README.md) | NATS publish-after-commit, durable idempotent subscribers, the `DOMAIN_EVENTS` JetStream topology + DLQ, and GDPR saga helpers. |
| [authz](./authz/README.md) | Backend authorization — `hasPermission` / `requirePermission` / scope checks over the permission-string model. |
| [db](./db/README.md) | Postgres client + node-pg-migrate runner with PostGIS support. |
| [observability](./observability/README.md) | Backend observability bootstrap — OpenTelemetry (OTLP/HTTP), Sentry, Winston (+ optional Loki), shared Prometheus `/metrics` registry. |
| [storage](./storage/README.md) | File-storage abstraction (local FS + S3 providers) behind one `StorageProvider` contract. |
| `config-secrets` | Boot-time secret loader — reads Docker-mounted secrets or env vars. |
| `service-bootstrap` | Shared service boot — Fastify health server, gRPC bind / shutdown, adapters, principal extractor, `HandlerError`. |

## ESLint configs

| Package | Purpose |
| --- | --- |
| `eslint-config-base` | Base ESLint config for TypeScript packages. |
| `eslint-config-node` | ESLint config for Node.js backend services. |
| `eslint-config-react` | ESLint config for React apps. |
