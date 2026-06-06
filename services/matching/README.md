# service.matching

Matching vertical — Phase 9 of the microservices migration.

Stateless recommender (CAD `service.dispatch` shape) — given a user,
queries `service.pets` for candidates over gRPC, ranks by stored
preferences + match-profile, returns top-K. Owns the `matching.*`
schema (`SwipeSession`, `SwipeAction`). Absorbs the monolith's
discovery + search + swipe modules.

## What's shipped so far

**Phase 9.1** — boot skeleton: `/health/simple` on `MATCHING_PORT`
(default 5008), OpenTelemetry boot, env-validated config.

## What's NOT here yet

- **Phase 9.2** — `matching.*` schema + migrations.
- **Phase 9.3** — gRPC `MatchingService` (recommend, record-swipe,
  discover, search). Reads pets via gRPC from `service.pets`.
- **Phase 9.4** — NATS publishers (`matching.swipeRecorded` etc.).
- **Phase 9.5** — Gateway routes `/api/matching/*` (and the
  legacy `/api/discovery/*`, `/api/search/*`).
- **Phase 9.6** — Cutover.

## Configuration

| Env var              | Default            | Required | Purpose                         |
| -------------------- | ------------------ | -------- | ------------------------------- |
| `MATCHING_PORT`      | `5008`             |          | HTTP port for `/health/simple`. |
| `MATCHING_GRPC_PORT` | `6008`             |          | gRPC port (Phase 9.3c).         |
| `MATCHING_HOST`      | `0.0.0.0`          |          | Bind interface.                 |
| `MATCHING_SCHEMA`    | `matching`         |          | Postgres schema.                |
| `DATABASE_URL`       | —                  | ✅       | Postgres connection string.     |
| `NATS_URL`           | `nats://nats:4222` |          | NATS bus URL.                   |
| `NODE_ENV`           | `development`      |          | Surfaces in health + logs.      |
