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
proto, service-bootstrap}`. For how this service was carved out of the
monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#notifications).

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

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-notifications`, HTTP published on `127.0.0.1:5001`:

```bash
pnpm docker:dev:detach                            # start the whole stack
docker compose logs -f service-notifications      # follow just this service
curl localhost:5001/health/simple                 # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.notifications","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`). Its cross-service gRPC calls (auth / pets / rescue) no-op
when their `*_GRPC_URL` is unset:

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
pnpm --filter @adopt-dont-shop/service.notifications dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `NotificationService`
(`packages/proto`), proxied by the gateway under `/api/v1/notifications/*`,
`/api/v1/devices/*`, and `/api/v1/email/templates/*`. User-facing reads/writes
are **self-scoped** (a `*:any` permission unlocks acting on another user);
admin surfaces require an explicit permission. `super_admin` bypasses.

| RPC                                                                                              | Permission                                         |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `Create`                                                                                         | `notifications.create`                             |
| `List` / `GetNotification` / `GetUnreadCount` / `Dismiss` / `MarkAllRead` / `DeleteNotification` | self-scoped                                        |
| `Get/Update/ResetNotificationPreferences`                                                        | self; `notification-prefs:*:any` for others        |
| `CleanupExpiredNotifications`                                                                    | `notifications.cleanup`                            |
| `SendEmail`                                                                                      | `notifications.email.send` (or service-to-service) |
| `Get/UpdateEmailPreferences`                                                                     | self; `email-prefs:*:any` for others               |
| `List/Get/PreviewEmailTemplate`                                                                  | `email.templates.read`                             |
| `Create/Update/DeleteEmailTemplate`                                                              | `email.templates.{create,update,delete}`           |
| `Register/UnregisterDeviceToken` / `ListDeviceTokens`                                            | self-scoped (`device-tokens:list:any` for others)  |
| `Broadcast`                                                                                      | `admin.notifications.broadcast`                    |

Schema (`notifications`): `notifications`, `device_tokens`,
`user_notification_prefs`, `email_queue`, `email_templates`,
`email_template_versions`, `email_preferences`, `scheduled_job_runs`,
`processed_events` (event-dedup for idempotent consumers), and `event_outbox`
(the transactional publish-after-commit outbox — see
[`packages/events`](../../packages/events/README.md)).
Migrations: `src/migrations/001`–`011`.

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
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
