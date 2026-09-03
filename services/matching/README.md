# service.matching

## Purpose

Owns swipe-based pet discovery and recommendation. A stateless recommender:
given a user, it queries `service.pets` for candidate pets over gRPC and ranks
them with a pure scoring function against the user's stored preferences and
match profile, returning the top-K. It records browsing sessions and an
append-only behavioural swipe log, and holds each adopter's match profile. Owns
the `matching.*` schema. Reads live pet candidates from `service.pets` on demand
rather than keeping a denormalised projection.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. Cross-service gRPC: calls
**service.pets** (`PETS_GRPC_URL`) in `Recommend` / `GetTopPicks` / `SearchPets`
to fetch candidate pets. The gateway proxies `/api/v1/matching/*`,
`/api/v1/match/*`, `/api/v1/discovery/*`, and `/api/v1/search/*` to this
service. Depends on the shared backend packages `@adopt-dont-shop/{authz,
config-secrets, db, events, lib.types, observability, proto,
service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-matching`, HTTP published on `127.0.0.1:5008`:

```bash
pnpm docker:dev:detach                       # start the whole stack
docker compose logs -f service-matching      # follow just this service
curl localhost:5008/health/simple            # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.matching","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`). It calls pets over gRPC for candidates, so point
`PETS_GRPC_URL` at a running pets service:

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 PETS_GRPC_URL=localhost:6003 \
pnpm --filter @adopt-dont-shop/service.matching dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `MatchingService`
(`packages/proto/proto/adopt_dont_shop/matching/v1/matching.proto`), proxied by
the gateway. Most actions require `pets.read` (discovery reads the pets
catalogue) plus session ownership where applicable; profile RPCs are self-scoped
on top of `pets.read`. `super_admin` bypasses.

| RPC                  | Permission                                              |
| -------------------- | ------------------------------------------------------- |
| `StartSession`       | `pets.read`                                             |
| `EndSession`         | `pets.read` + session owner                             |
| `RecordSwipe`        | `pets.read` + session owner                             |
| `ListSwipeHistory`   | `pets.read`                                             |
| `Recommend`          | `pets.read` (reads candidates via pets gRPC)            |
| `GetTopPicks`        | `pets.read` (reads candidates via pets gRPC)            |
| `SearchPets`         | `pets.read` (reads candidates via pets gRPC)            |
| `GetMatchProfile`    | `pets.read` + self-scoped (reads own profile)           |
| `UpsertMatchProfile` | `pets.read` + self-scoped (writes own profile)          |
| `GetUserSwipeStats`  | self-scoped; `matching.swipes.read:any` for other users |
| `GetSessionStats`    | session owner                                           |

Schema (`matching`):

| Table                    | Purpose                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `swipe_sessions`         | Browsing sessions with filter context + counters.                                                     |
| `swipe_actions`          | Append-only behavioural log (swipe / like / pass / super-like).                                       |
| `adopter_match_profiles` | Adopter preferences (types, sizes, energy, lifestyle, allergies).                                     |
| `event_outbox`           | Transactional publish-after-commit outbox — see [`packages/events`](../../packages/events/README.md). |

Migrations: `src/migrations/001`–`005`.

**NATS** — emits (publish-after-commit): `matching.sessionStarted`,
`matching.sessionEnded`, `matching.swipeRecorded`; participates in the
`gdpr.erasureCompleted` saga. Consumes `gdpr.erasureRequested` (durable
`gdpr-matching`).

## Environment variables consumed

Full reference: [`docs/env-reference.md`](../../docs/env-reference.md). This
service's own vars:

| Env var              | Default             | Required | Purpose                                                  |
| -------------------- | ------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`       | —                   | Yes      | Postgres connection string (boot fails fast without it). |
| `MATCHING_PORT`      | `5008`              |          | HTTP port for `/health/simple`.                          |
| `MATCHING_GRPC_PORT` | `6008`              |          | gRPC port.                                               |
| `MATCHING_HOST`      | `0.0.0.0`           |          | Bind interface.                                          |
| `MATCHING_SCHEMA`    | `matching`          |          | Postgres schema.                                         |
| `PETS_GRPC_URL`      | `service-pets:6003` |          | Candidate-pet source.                                    |
| `NATS_URL`           | `nats://nats:4222`  |          | NATS bus URL.                                            |

Plus the standard `@adopt-dont-shop/observability` vars.

## Testing notes

Vitest. The scoring/ranking function is pure and tested directly against fixture
candidates; handlers are tested with pool + NATS (+ a stub pets client)
injected — assert permission / ownership gates, swipe-log append, profile
upsert, and publish-after-commit ordering. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
