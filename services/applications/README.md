# service.applications

Applications vertical — Phase 5 of the microservices migration.

**The deepest extraction — CAD Phase 2 equivalent.** Owns the
`applications.*` schema (Application, ApplicationDraft, ApplicationAnswer,
ApplicationTimelineEntry, HomeVisit, Reference) and exposes
`ApplicationService` over gRPC.

Event-sourced — the application state machine
(`draft → submitted → under_review → home_visit_scheduled →
home_visit_completed → approved | rejected | withdrawn → adopted`)
drives multiple downstream consumers (notifications, moderation,
audit), and "how did we get here?" is a real product question for
adopters and rescue staff. Pure `apply`/`fold` domain + Postgres event
store + publish-after-commit on `applications.*` events.

## What's shipped so far

**Phase 5.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `APPLICATIONS_PORT`
  (default 5005), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with
  `serviceName: 'service.applications'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

## What's NOT here yet

The CAD Phase 2 cadence — six PRs:
- **Phase 5.2** — pure event-sourced application domain
  (`apply`/`fold`, commands, invariants). I/O-free, fully unit-tested.
- **Phase 5.3** — `applications.*` schema + migrations, persisted gRPC
  service (Postgres event store + read model with optimistic
  concurrency on `(aggregate_id, version)`, NATS publish post-commit,
  gRPC handlers).
- **Phase 5.4** — `services/notifications` consumes `applications.*`
  events and fans to involved users (adopter + rescue staff).
- **Phase 5.5** — Gateway `/api/applications/*` REST routes proxying
  to applications gRPC.
- **Phase 5.6** — Cutover: monolith's applications code becomes dead,
  removal bundled into Phase 11.

## Configuration

| Env var                  | Default            | Required | Purpose                                                                  |
| ------------------------ | ------------------ | -------- | ------------------------------------------------------------------------ |
| `APPLICATIONS_PORT`      | `5005`             |          | HTTP port for `/health/simple`.                                          |
| `APPLICATIONS_GRPC_PORT` | `6005`             |          | gRPC port `ApplicationService` will bind (Phase 5.3c).                   |
| `APPLICATIONS_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `APPLICATIONS_SCHEMA`    | `applications`     |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`           | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`               | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`               | `development`      |          | Surfaces in health + logs.                                               |

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
