# service.notifications

## Purpose

Owns in-app, email, and push notifications: creating + listing + dismissing
notifications, per-user preferences (channels, DND, category toggles), the
email queue + templates (Resend / console / Ethereal), push device tokens (FCM
/ web-push), and digest scheduling. Subscribes to domain events from other
services to auto-fan notifications, and exposes `Broadcast` for admin cohort
announcements. Owns the `notifications.*` schema. The first stateful extraction
(Phase 1, CAD Phase 1 equivalent) — it brought the platform's WebSocket spine
online.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. Feeds the gateway's
WebSocket spine: it publishes `notifications.*` on NATS and the gateway fans
them to connected Socket.IO clients. Cross-service gRPC (all optional — the
feature no-ops if the URL is unset): **service.auth** (`ListUserIdsByCohort`
for `Broadcast`), **service.pets** (`ListFavoriters`), **service.rescue**
(`ListStaffMembers` / `Get`). Depends on the shared backend packages
`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:spam      # dev-only bulk seed
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `NotificationService`
(`packages/proto`), proxied by the gateway under `/api/v1/notifications/*`,
`/api/v1/devices/*`, and `/api/v1/email/templates/*`. User-facing reads/writes
are **self-scoped** (a `*:any` permission unlocks acting on another user);
admin surfaces require an explicit permission. `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `Create` | `notifications.create` |
| `List` / `GetNotification` / `GetUnreadCount` / `Dismiss` / `MarkAllRead` / `DeleteNotification` | self-scoped |
| `Get/Update/ResetNotificationPreferences` | self; `notification-prefs:*:any` for others |
| `CleanupExpiredNotifications` | `notifications.cleanup` |
| `SendEmail` | `notifications.email.send` (or service-to-service) |
| `Get/UpdateEmailPreferences` | self; `email-prefs:*:any` for others |
| `List/Get/PreviewEmailTemplate` | `notifications.email.templates.read` |
| `Create/Update/DeleteEmailTemplate` | `notifications.email.templates.{create,update,delete}` |
| `Register/UnregisterDeviceToken` / `ListDeviceTokens` | self-scoped (`device-tokens:list:any` for others) |
| `Broadcast` | `admin.notifications.broadcast` |

Schema (`notifications`): `notifications`, `device_tokens`,
`user_notification_prefs`, `email_queue`, `email_templates`,
`email_preferences`, `processed_events` (event-dedup for idempotent consumers).
Migrations: `src/migrations/001`–`008`.

**NATS** — emits (publish-after-commit): `notifications.created`,
`notifications.dismissed`, `notifications.deleted`, `notifications.allRead`,
`notifications.prefsReset`, `notifications.broadcastSent`; participates in the
`gdpr.erasureCompleted` saga. Consumes a broad set of `applications.*`,
`auth.*`, `chat.messageCreated`, `pets.*`, and `rescue.*` subjects to translate
into notifications, plus `gdpr.erasureRequested` (durable
`gdpr-notifications`).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `NOTIFICATIONS_PORT`
(5001), `NOTIFICATIONS_GRPC_PORT` (6001), `NOTIFICATIONS_HOST`,
`NOTIFICATIONS_SCHEMA` (`notifications`), and `NATS_URL` have dev defaults. The
email + push channels add `EMAIL_PROVIDER`, `EMAIL_CHANNEL_ENABLED`,
`EMAIL_WORKER_ENABLED`, `DEFAULT_FROM_EMAIL` / `DEFAULT_FROM_NAME` /
`DEFAULT_REPLY_TO_EMAIL`, and `FCM_PROJECT_ID` / `FCM_SERVICE_ACCOUNT_JSON`,
plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Pure handlers + the email/push workers tested with pool, NATS, and stub
provider/clients injected — assert self-scope vs `*:any` permission gates,
idempotent dismiss / dedup via `processed_events`, the event→notification
translation for each consumed subject, and publish-after-commit ordering. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Notifications was the Phase 1 extraction (the first stateful one): boot
skeleton (1.1), the `notifications.*` schema (1.2), the gRPC
`NotificationService` with the pure-handler-plus-thin-adapter pattern (1.3), the
NATS fan-out subscribers (1.4), the gateway WebSocket termination + Redis
pub/sub between replicas (1.5), and the monolith cutover (1.6).
