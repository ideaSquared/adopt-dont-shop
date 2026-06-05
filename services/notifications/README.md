# service.notifications

The first stateful extraction of the Phase 1 migration. Owns
**`notifications.*`** (Notification, DeviceToken, UserNotificationPrefs,
EmailPreference, EmailQueue), exposes a gRPC API for create / list /
dismiss, subscribes to NATS for cross-service fan-out, and feeds the
gateway's WebSocket spine so connected clients see notifications live.

CAD Phase 1 equivalent — the same pattern that brought CAD's WebSocket
spine online, restated for adopt-dont-shop's domain.

## What's in this commit (Phase 1.1)

Just the boot skeleton:

- `src/index.ts` → starts a Fastify server on `NOTIFICATIONS_PORT`
  (default 5001), wires `/health/simple` so the existing Docker
  compose healthcheck pattern picks the service up unchanged.
- `src/instrumentation.ts` → boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.notifications'`.
  Loaded via `--import` in the dev / start scripts.
- `src/config.ts` → env validation, same shape as
  `services/gateway/src/config.ts`.
- `src/server.ts` → `createServer({ config, logger? })`, identical
  pattern to the gateway minus the proxy.

Nothing else. Schema, gRPC, NATS, gateway WS wiring all arrive in
subsequent commits.

## What's NOT here yet

- **`notifications.*` schema + migrations.** Phase 1.2 — uses
  `@adopt-dont-shop/db` for the runner + schema isolation.
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

| Env var               | Default       | Purpose                                |
| --------------------- | ------------- | -------------------------------------- |
| `NOTIFICATIONS_PORT`  | `5001`        | HTTP port for `/health/simple`.        |
| `NOTIFICATIONS_HOST`  | `0.0.0.0`     | Bind interface.                        |
| `NODE_ENV`            | `development` | Surfaces in health + logs.             |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`: `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `SENTRY_DSN`, `LOG_LEVEL`, `LOKI_URL`. See
that package's README.

Phase 1.2+ adds `DATABASE_URL`, `NATS_URL`, `GRPC_PORT`.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
npm run dev

# Production build
npm run build
npm run start
```
