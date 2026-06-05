# service.notifications

The first stateful extraction of the Phase 1 migration. Owns
**`notifications.*`** (Notification, DeviceToken, UserNotificationPrefs,
EmailPreference, EmailQueue), exposes a gRPC API for create / list /
dismiss, subscribes to NATS for cross-service fan-out, and feeds the
gateway's WebSocket spine so connected clients see notifications live.

CAD Phase 1 equivalent — the same pattern that brought CAD's WebSocket
spine online, restated for adopt-dont-shop's domain.

## What's shipped so far

**Phase 1.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `NOTIFICATIONS_PORT`
  (default 5001), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.notifications'`.
- `src/config.ts` env validation.
- `src/server.ts` `createServer({ config, logger? })`.

**Phase 1.2** — schema + migrations:
- `src/migrations/001_create_notifications.ts` ports the monolith's
  `notifications` table verbatim (same columns, same ENUM value
  lists, same indexes) into the `notifications` schema.
- `src/migrations/002_create_device_tokens.ts` mirrors `device_tokens`.
- `src/migrations/003_create_user_notification_prefs.ts` mirrors
  `user_notification_prefs`.
- `src/db/migrate.ts` runs them via `@adopt-dont-shop/db.runMigrations`
  (which wraps node-pg-migrate with the four CAD-lesson fixes:
  createSchema, ignorePattern, search_path, advisory-lock retry).
- Run with `npm run db:migrate`.

## What's NOT here yet

- **gRPC `NotificationService.{Create,List,Dismiss}`.** Phase 1.3 —
  adds the proto under `packages/proto/proto/notifications/v1/`,
  flips `outputServices=grpc-js` in `buf.gen.yaml`, brings
  `@grpc/grpc-js` as a runtime dep.
- **NATS subscriber for fan-out + publish-after-commit on create.**
  Phase 1.4 — uses `@adopt-dont-shop/events` helpers; consumes
  events from other services (pets, applications) and produces
  `notifications.created` for the gateway WS layer to broadcast.
- **Gateway WebSocket termination.** Phase 1.5 — gateway holds the
  Socket.IO connection, subscribes to NATS `notifications.*`, fans
  to the right user sockets via Redis pub/sub between gateway
  replicas (CAD pattern).
- **Cutover from monolith.** Phase 1.6 — gateway routes
  `/api/notifications/*` to this service; monolith's notification
  routes delete.

## Configuration

| Env var                | Default         | Required | Purpose                                                       |
| ---------------------- | --------------- | -------- | ------------------------------------------------------------- |
| `NOTIFICATIONS_PORT`   | `5001`          |          | HTTP port for `/health/simple`.                               |
| `NOTIFICATIONS_HOST`   | `0.0.0.0`       |          | Bind interface.                                               |
| `NOTIFICATIONS_SCHEMA` | `notifications` |          | Postgres schema this service owns. Override for parallel test DBs. |
| `DATABASE_URL`         | —               | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NODE_ENV`             | `development`   |          | Surfaces in health + logs.                                    |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`: `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `SENTRY_DSN`, `LOG_LEVEL`, `LOKI_URL`. See
that package's README.

Phase 1.3+ adds `NATS_URL`, `GRPC_PORT`.

## Running

```bash
# Run migrations against DATABASE_URL (creates the `notifications` schema
# on first run, applies any pending migrations after)
npm run db:migrate

# Dev — hot reload, OTel SDK loaded via --import
npm run dev

# Production build
npm run build
npm run start
```
