# service.notifications

The first stateful extraction of the Phase 1 migration. Owns
**`notifications.*`** (Notification, DeviceToken, UserNotificationPrefs,
EmailPreference, EmailQueue, EmailTemplate, ProcessedEvent), exposes a
gRPC API for create / list / dismiss, subscribes to NATS for cross-service
fan-out, and feeds the gateway's WebSocket spine so connected clients see
notifications live.

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
- `src/db/migrate.ts` runs them via `@adopt-dont-shop/db.runMigrations`.
- Run with `pnpm db:migrate`.

**Phase 1.3** — gRPC `NotificationService`:
- Proto + grpc-js stubs in `@adopt-dont-shop/proto` (Phase 1.3a, on main).
- `src/grpc/handlers.ts` — Create / List / Dismiss handlers gated by
  `@adopt-dont-shop/authz` and using
  `@adopt-dont-shop/events.withTransaction` for publish-after-commit
  on `notifications.created` / `notifications.dismissed`.
- `src/grpc/principal.ts` — extracts the `Principal` from gRPC metadata
  (`x-user-id`, `x-user-roles`, `x-user-permissions`, `x-rescue-id`).
- `src/grpc/enum-map.ts` — bidirectional maps between proto3 enums
  and the Postgres ENUM strings.
- `src/grpc/adapter.ts` — wraps each handler in the grpc-js
  `(call, callback)` signature, maps `HandlerError` codes to
  `grpc.status` constants, scrubs unknown errors to `INTERNAL`.
- `src/grpc/server.ts` — builds the grpc Server with the three
  handlers bound to `NotificationServiceService` and binds it on
  `NOTIFICATIONS_GRPC_PORT` (default 6001).
- `src/index.ts` connects pg + NATS, starts both Fastify and the
  gRPC server, and orchestrates graceful shutdown on SIGTERM/SIGINT.

## What's NOT here yet
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

| Env var                      | Default              | Required | Purpose                                                       |
| ---------------------------- | -------------------- | -------- | ------------------------------------------------------------- |
| `NOTIFICATIONS_PORT`         | `5001`               |          | HTTP port for `/health/simple`.                               |
| `NOTIFICATIONS_GRPC_PORT`    | `6001`               |          | gRPC port `NotificationService` binds.                        |
| `NOTIFICATIONS_HOST`         | `0.0.0.0`            |          | Bind interface (both HTTP + gRPC).                            |
| `NOTIFICATIONS_SCHEMA`       | `notifications`      |          | Postgres schema this service owns. Override for parallel test DBs. |
| `DATABASE_URL`               | —                    | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`                   | `nats://nats:4222`   |          | NATS bus URL.                                                 |
| `NODE_ENV`                   | `development`        |          | Surfaces in health + logs.                                    |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`: `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `SENTRY_DSN`, `LOG_LEVEL`, `LOKI_URL`. See
that package's README.

## Running

```bash
# Run migrations against DATABASE_URL (creates the `notifications` schema
# on first run, applies any pending migrations after)
pnpm db:migrate

# Dev — hot reload, OTel SDK loaded via --import
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## Canonical reference (ADS-817)

### Responsibility

Owns in-app, email, and push notifications: creating + listing + dismissing
notifications, per-user preferences (channels, DND, category toggles), email
queue + templates (Resend / console / Ethereal), push device tokens (FCM /
web-push), and digest scheduling. Subscribes to domain events from other
services to auto-fan notifications, and exposes `Broadcast` for admin cohort
announcements. Schema: `notifications`.

### Schema (`notifications`)

| Table | Purpose |
| --- | --- |
| `notifications` | In-app rows (status / channel / read tracking). |
| `device_tokens` | FCM / APNs / web-push tokens per user. |
| `user_notification_prefs` | Per-user channel + category preferences. |
| `email_queue` | Transactional email queue. |
| `email_templates` | Reusable email templates. |
| `email_preferences` | Per-user email opt-in / unsubscribe state. |
| `processed_events` | Event-dedup table for idempotent consumers. |

Migrations: `services/notifications/src/migrations/001`–`008`.

### gRPC RPCs

`NotificationService`. User-facing reads/writes are **self-scoped** (a `*:any`
permission unlocks acting on another user); admin surfaces require an explicit
permission. `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `Create` | `notifications.create` |
| `List` / `GetNotification` / `GetUnreadCount` | self-scoped |
| `Dismiss` / `MarkAllRead` / `DeleteNotification` | self-scoped |
| `GetNotificationPreferences` | self; `notification-prefs:read:any` for others |
| `UpdateNotificationPreferences` / `ResetNotificationPreferences` | self; `notification-prefs:update:any` for others |
| `CleanupExpiredNotifications` | `notifications.cleanup` |
| `SendEmail` | `notifications.email.send` (or service-to-service) |
| `GetEmailPreferences` | self; `email-prefs:read:any` for others |
| `UpdateEmailPreferences` | self; `email-prefs:update:any` for others |
| `ListEmailTemplates` / `GetEmailTemplate` / `PreviewEmailTemplate` | `notifications.email.templates.read` |
| `CreateEmailTemplate` | `notifications.email.templates.create` |
| `UpdateEmailTemplate` | `notifications.email.templates.update` |
| `DeleteEmailTemplate` | `notifications.email.templates.delete` |
| `RegisterDeviceToken` / `UnregisterDeviceToken` | self-scoped |
| `ListDeviceTokens` | self; `device-tokens:list:any` for others |
| `Broadcast` | `admin.notifications.broadcast` |

### NATS subjects

**Emits** (publish-after-commit): `notifications.created` (Create),
`notifications.dismissed` (Dismiss), `notifications.deleted` (Delete),
`notifications.allRead` (MarkAllRead), `notifications.prefsReset`
(ResetPreferences), `notifications.broadcastSent` (Broadcast). Plus
`gdpr.erasureCompleted` as a saga participant.

**Consumes:** `applications.{submitted,approved,rejected,adopted,
homeVisitScheduled,homeVisitCompleted}`, `auth.{roleAssigned,userLoggedIn,userInvited}`,
`chat.messageCreated`, `pets.{statusChanged,deleted}`,
`rescue.{verified,rejected,staffInvited,staffInvitationCancelled}`, and
`gdpr.erasureRequested` (durable `gdpr-notifications`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. Cross-service gRPC (all optional — feature no-ops if
the URL is unset): **service.auth** (`ListUserIdsByCohort` for `Broadcast`),
**service.pets** (`ListFavoriters` for `pets.statusChanged` fan-out),
**service.rescue** (`ListStaffMembers` / `Get` for rescue fan-out).

### Testing strategy

Vitest. Pure handlers + the email/push workers tested with pool, NATS, and stub
provider/clients injected — assert self-scope vs `*:any` permission gates,
idempotent dismiss / dedup via `processed_events`, the event→notification
translation for each consumed subject, and publish-after-commit ordering.
