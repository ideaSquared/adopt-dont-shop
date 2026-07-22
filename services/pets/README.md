# service.pets

## Purpose

Owns the pet listing catalogue: classical CRUD plus an event-sourced status
state machine (`available` → `pending` → `adopted`, plus
`foster` / `medical_hold` / `behavioral_hold` / `not_available` / `deceased`,
`deceased` terminal). Each status transition appends an audit row and publishes
`pets.statusChanged`. Serves privilege-aware reads (internal notes + off-market
statuses hidden from public readers), favourite/rating aggregates, and
per-rescue stats. Owns the `pets.*` schema. First service where event sourcing
pays off — status transitions have multi-consumer audit needs (matching,
notifications, moderation, applications).

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. No outbound cross-service
gRPC calls; it is a candidate source read over gRPC by **service.applications**
(`StartDraft`), **service.matching** (`Recommend` / `SearchPets`), and
**service.notifications** (`ListFavoriters`). Depends on the shared backend
packages `@adopt-dont-shop/{authz, config-secrets, db, events, lib.types,
observability, proto, service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:seed      # seed dev data
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `PetService`
(`packages/proto`), proxied by the gateway under `/api/v1/pets/*`. Permission
scope is the pet's `rescue_id`; admin / `super_admin` bypass the scope.

| RPC | Permission |
| --- | --- |
| `Create` | `pets.create` (scoped to target rescue) |
| `Get` / `List` | `pets.read` (public projection for non-privileged readers; staff pinned to own rescue) |
| `Update` / `UpdateStatus` | `pets.update` (scoped; `UpdateStatus` appends a status transition) |
| `Delete` | `pets.delete` (scoped; soft-delete) |
| `GetStats` | `pets.read` (self-scoped; `pets.read:any` overrides the rescue filter) |
| `ListFavoriters` | `pets.favoriters.list:any` (system-principal-only service-to-service read — ADS-922) |

Schema (`pets`): `breeds` (reference lookup), `pets` (main listing row, PostGIS
`location` + full-text `search_vector`), `pet_media`, `pet_status_transitions`
(append-only audit), `ratings`, `user_favorites`. Migrations:
`src/migrations/001`–`007`.

**NATS** — emits (publish-after-commit): `pets.created`, `pets.updated`,
`pets.statusChanged`, `pets.deleted`; participates in the
`gdpr.erasureCompleted` saga. Consumes `gdpr.erasureRequested` (durable
`gdpr-pets`; erases the user's favourites/ratings in a transaction).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `PETS_PORT`
(5003), `PETS_GRPC_PORT` (6003), `PETS_HOST`, `PETS_SCHEMA` (`pets`), and
`NATS_URL` have dev defaults, plus the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The status state machine is a pure, I/O-free legal-transition table
tested directly; handlers `(deps, principal, request) → response` are tested
with pool + NATS injected — assert each permission/validation path, the
public-vs-privileged read projection, the transition + audit-row append, keyset
pagination, and publish-after-commit ordering. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Pets was the Phase 3 extraction (CAD Phase 3 equivalent): boot skeleton (3.1),
the `pets.*` schema with PostGIS + full-text search (3.2), the proto stubs +
pure status-machine + handlers (3.3), and the downstream NATS flow — the
`pets.statusChanged` / `pets.deleted` subscribers in `services/notifications`
(3.4). Gateway routes (3.5) and the monolith cutover (3.6) followed.
