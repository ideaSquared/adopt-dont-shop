# service.pets

Pets vertical — Phase 3 of the microservices migration.

Owns the `pets.*` schema (Pet, PetMedia, Breed, UserFavorite, Rating,
PetStatusTransition) and exposes `PetService` over gRPC.

CAD Phase 3 equivalent — first service in the migration where event
sourcing pays off. Pet status transitions
(`available → reserved → adopted → unavailable`, plus `deceased`,
`returned`) form a real state machine with multi-consumer audit needs
(matching, notifications, moderation, applications). Pure `apply`/`fold`
domain + publish-after-commit on `pets.statusChanged`.

## What's shipped so far

**Phase 3.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `PETS_PORT` (default
  5003), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.pets'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

## What's NOT here yet

- **Phase 3.2** — `pets.*` schema + migrations.
- **Phase 3.3** — gRPC `PetService`:
  - proto + grpc-js stubs in `@adopt-dont-shop/proto`
  - handler logic (event-sourced status machine + standard CRUD)
  - gRPC server boot + adapter (same pattern as service.auth)
- **Phase 3.4** — NATS publishers: `pets.created`,
  `pets.statusChanged`, `pets.deleted` etc. Downstream services
  (notifications, matching, moderation, applications) consume these.
- **Phase 3.5** — Gateway routes `/api/pets/*` here (the Phase 2.5
  authenticate middleware already handles auth gating).
- **Phase 3.6** — Cutover: monolith's pets code becomes dead, removal
  bundled into Phase 11.

## Configuration

| Env var          | Default            | Required | Purpose                                                                  |
| ---------------- | ------------------ | -------- | ------------------------------------------------------------------------ |
| `PETS_PORT`      | `5003`             |          | HTTP port for `/health/simple`.                                          |
| `PETS_GRPC_PORT` | `6003`             |          | gRPC port `PetService` will bind (Phase 3.3c).                           |
| `PETS_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `PETS_SCHEMA`    | `pets`             |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`   | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`       | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`       | `development`      |          | Surfaces in health + logs.                                               |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
npm run dev

# Production build
npm run build
npm run start
```
