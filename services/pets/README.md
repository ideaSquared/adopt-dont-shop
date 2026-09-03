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
observability, proto, service-bootstrap}`. For how this service was carved out
of the monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#pets).

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

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-pets`, HTTP published on `127.0.0.1:5003`:

```bash
pnpm docker:dev:detach                   # start the whole stack
docker compose logs -f service-pets      # follow just this service
curl localhost:5003/health/simple        # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.pets","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`):

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
pnpm --filter @adopt-dont-shop/service.pets dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `PetService`
(`packages/proto`), proxied by the gateway under `/api/v1/pets/*`. Permission
scope is the pet's `rescue_id`; admin / `super_admin` bypass the scope.

| RPC                                                                                | Permission                                                                                                              |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Create`                                                                           | `pets.create` (scoped to target rescue)                                                                                 |
| `Get` / `List` / `ListBreeds` / `GetSimilarPets` / `GetSearchSuggestions`          | `pets.read` (public projection for anonymous/non-privileged readers; staff pinned to own rescue unless `pets.read:any`) |
| `GetPetFacets`                                                                     | `pets.read` (staff pinned to own rescue unless `pets.read:any`)                                                         |
| `Update` / `UpdateStatus`                                                          | `pets.update` (scoped; `UpdateStatus` appends a status transition)                                                      |
| `Delete`                                                                           | `pets.delete` (scoped; soft-delete)                                                                                     |
| `GetStats` / `GetAdoptionTrend` / `GetAdoptionsByType` / `GetTopBreedsByAdoptions` | `pets.read` (self-scoped; `pets.read:any` overrides the rescue filter)                                                  |
| `GetTopRescuesByAdoptions`                                                         | `pets.read:any` (cross-rescue leaderboard)                                                                              |
| `AddFavorite` / `RemoveFavorite` / `GetFavoriteStatus` / `ListUserFavorites`       | authenticated (self-scoped to the caller's own favourites)                                                              |
| `ListFavoriters`                                                                   | `pets.favoriters.list:any` (system-principal-only service-to-service read — ADS-922)                                    |

Schema (`pets`): `breeds` (reference lookup), `pets` (main listing row, PostGIS
`location` + full-text `search_vector`), `pet_media`, `pet_status_transitions`
(append-only audit), `ratings`, `user_favorites`, and `event_outbox` (the
transactional publish-after-commit outbox — see
[`packages/events`](../../packages/events/README.md)). Migrations:
`src/migrations/001`–`010`.

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
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
