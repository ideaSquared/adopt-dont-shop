# service.rescue

Rescue vertical — Phase 4 of the microservices migration.

Owns the `rescue.*` schema (Rescue, RescueSettings, StaffMember,
Invitation, FosterPlacement, ApplicationQuestion) and exposes
`RescueService` over gRPC.

Classical (no event sourcing — mostly CRUD with a few status
transitions). Subscribes to `auth.userCreated` to maintain
staff-member denormalisation (CAD-style cross-service maintained
read model).

## What's shipped so far

**Phase 4.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `RESCUE_PORT` (default
  5004), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.rescue'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

## What's NOT here yet

- **Phase 4.2** — `rescue.*` schema + migrations.
- **Phase 4.3** — gRPC `RescueService`:
  - proto + grpc-js stubs in `@adopt-dont-shop/proto`
  - handler logic (CRUD + verify / invite-staff transitions)
  - gRPC server boot + adapter (same pattern as service.pets)
- **Phase 4.4** — NATS publishers (`rescue.created`,
  `rescue.verified`, `rescue.staffInvited`, etc.) + subscriber for
  `auth.userCreated` to denormalise staff_member rows.
- **Phase 4.5** — Gateway routes `/api/rescue/*` here.
- **Phase 4.6** — Cutover: monolith's rescue code becomes dead,
  removal bundled into Phase 11.

## Configuration

| Env var            | Default            | Required | Purpose                                                                  |
| ------------------ | ------------------ | -------- | ------------------------------------------------------------------------ |
| `RESCUE_PORT`      | `5004`             |          | HTTP port for `/health/simple`.                                          |
| `RESCUE_GRPC_PORT` | `6004`             |          | gRPC port `RescueService` will bind (Phase 4.3c).                        |
| `RESCUE_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `RESCUE_SCHEMA`    | `rescue`           |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`     | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`         | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`         | `development`      |          | Surfaces in health + logs.                                               |

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
