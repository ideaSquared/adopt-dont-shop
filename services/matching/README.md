# service.matching

## Purpose

Matching vertical — Phase 9 of the microservices migration.

Stateless recommender (CAD `service.dispatch` shape) — given a user,
queries `service.pets` for candidates over gRPC, ranks by stored
preferences + match-profile, returns top-K. Owns the `matching.*`
schema (`SwipeSession`, `SwipeAction`, `AdopterMatchProfile`). Absorbs
the monolith's discovery + search + swipe modules.

## Location in the architecture

See [docs/infrastructure/MICROSERVICES-STANDARDS.md](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries model. Calls **service.pets**
(`PETS_GRPC_URL`) over gRPC to fetch candidate pets — see "Dependencies"
below. The gateway proxies `/api/matching/*` (and the legacy
`/api/discovery/*` / `/api/search/*`) to this service once Phase 9.5 lands.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
pnpm db:migrate   # run pending migrations (node-pg-migrate)
```

## What's shipped so far

**Phase 9.1** — boot skeleton: `/health/simple` on `MATCHING_PORT`
(default 5008), OpenTelemetry boot, env-validated config.

**Phase 9.2** — `matching.*` schema + migrations:
- `001_create_swipe_sessions.ts` — behavioural session log;
  `swipe_session_device_type` enum (desktop/mobile/tablet/unknown);
  JSONB `filters` for schema-less filter evolution; non-paranoid,
  no audit hooks.
- `002_create_swipe_actions.ts` — high-volume action log;
  `swipe_action_type` enum (like/pass/super_like/info);
  `session_id` FK intra-schema CASCADE; `pet_id` / `user_id` soft
  pointers; recommender hot-path idx `(user_id, action)`.
- Run via `pnpm db:migrate` (uses `@adopt-dont-shop/db`).

## What's NOT here yet

- **Phase 9.3** — gRPC `MatchingService` (recommend, record-swipe,
  discover, search). Reads pets via gRPC from `service.pets`.
- **Phase 9.4** — NATS publishers (`matching.swipeRecorded` etc.).
- **Phase 9.5** — Gateway routes `/api/matching/*` (and the
  legacy `/api/discovery/*`, `/api/search/*`).
- **Phase 9.6** — Cutover.

## Environment variables consumed

Full reference: [docs/env-reference.md](../../docs/env-reference.md). This
service's own vars:

| Env var              | Default            | Required | Purpose                         |
| -------------------- | ------------------ | -------- | ------------------------------- |
| `MATCHING_PORT`      | `5008`             |          | HTTP port for `/health/simple`. |
| `MATCHING_GRPC_PORT` | `6008`             |          | gRPC port (Phase 9.3c).         |
| `MATCHING_HOST`      | `0.0.0.0`          |          | Bind interface.                 |
| `MATCHING_SCHEMA`    | `matching`         |          | Postgres schema.                |
| `DATABASE_URL`       | —                  | ✅       | Postgres connection string.     |
| `NATS_URL`           | `nats://nats:4222` |          | NATS bus URL.                   |
| `NODE_ENV`           | `development`      |          | Surfaces in health + logs.      |

## REST / gRPC contract

HTTP surface: `/health/simple` on `MATCHING_PORT`. gRPC surface:
`MatchingService` — see the "gRPC RPCs" table under "Canonical reference"
below for the full RPC → permission map.

## Testing notes

Vitest. The scoring/ranking function is pure and tested directly against
fixture candidates; handlers are tested with pool + NATS (+ a stub pets
client) injected — see "Testing strategy" under "Canonical reference"
below for the full picture.

## Ownership

See [.github/CODEOWNERS](../../.github/CODEOWNERS) for the current owner
of `/services/`.

---

## Canonical reference (ADS-817)

### Responsibility

A stateless recommender powering swipe-based pet discovery. Records swipe
sessions + a behavioural swipe log, holds adopter match profiles, and returns
ranked candidates via a pure scoring function. Reads live pet candidates from
service.pets on demand (no denormalised projection). Schema: `matching`.

### Schema (`matching`)

| Table | Purpose |
| --- | --- |
| `swipe_sessions` | Browsing sessions with filter context + counters. |
| `swipe_actions` | Append-only behavioural log (swipe / like / pass / super-like). |
| `adopter_match_profiles` | Adopter preferences (types, sizes, energy, lifestyle, allergies). |

Migrations: `services/matching/src/migrations/001`–`004`.

### gRPC RPCs

`MatchingService`. Most actions require `pets.view` (discovery reads the pets
catalogue) plus session ownership where applicable; profile RPCs are self-
scoped. `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `StartSession` | `pets.view` |
| `EndSession` | `pets.view` + session owner |
| `RecordSwipe` | `pets.view` + session owner |
| `ListSwipeHistory` | `pets.view` |
| `Recommend` | `pets.view` (reads candidates via pets gRPC) |
| `SearchPets` | `pets.view` (reads candidates via pets gRPC) |
| `GetMatchProfile` | self-scoped (reads own profile) |
| `UpsertMatchProfile` | self-scoped (writes own profile) |
| `GetUserSwipeStats` | self-scoped; `matching.swipes.read:any` for other users |
| `GetSessionStats` | session owner |

### NATS subjects

**Emits** (publish-after-commit): `matching.sessionStarted`,
`matching.sessionEnded`, `matching.swipeRecorded`. Plus `gdpr.erasureCompleted`
as a saga participant.

**Consumes:** `gdpr.erasureRequested` (durable `gdpr-matching`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. Cross-service gRPC: calls **service.pets**
(`PETS_GRPC_URL`) in `Recommend` / `SearchPets` to fetch candidate pets.

### Testing strategy

Vitest. The scoring/ranking function is pure and tested directly against fixture
candidates; handlers are tested with pool + NATS (+ a stub pets client)
injected — assert permission / ownership gates, swipe-log append, profile
upsert, and publish-after-commit ordering.
