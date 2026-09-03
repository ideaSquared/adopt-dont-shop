# service.chat

## Purpose

Owns application-scoped messaging between adopters and rescue staff: opening
chats, sending / reading messages, reactions, read receipts, and full-text
search. Real-time delivery is event-driven — the service publishes `chat.*`
events on NATS that the gateway's WebSocket subscriber fans out to connected
clients. Owns the `chat.*` schema. Classical (no event sourcing — messages are
append-only by nature but not a state machine).

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. WS-heavy: the gateway
terminates Socket.IO and this service is the source of the `chat.*` fan-out
events. `services/moderation` consumes `chat.messageCreated` for content
scanning. `OpenChat` makes outbound gRPC calls to `service.applications`
(`getApplication`) and `service.rescue` (`listStaffMembers`) to resolve chat
participants; all other RPCs read participants from its own schema. Depends on
the shared backend packages `@adopt-dont-shop/{authz,
config-secrets, db, events, lib.types, observability, proto,
service-bootstrap}`. For how this service was carved out of the monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#chat).

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:seed      # seed dev data
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-chat`, HTTP published on `127.0.0.1:5006`:

```bash
pnpm docker:dev:detach                   # start the whole stack
docker compose logs -f service-chat      # follow just this service
curl localhost:5006/health/simple        # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.chat","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`). `OpenChat` calls applications + rescue over gRPC, so
point those at running services for that path:

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
APPLICATIONS_GRPC_URL=localhost:6005 RESCUE_GRPC_URL=localhost:6004 \
pnpm --filter @adopt-dont-shop/service.chat dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `ChatService`
(`packages/proto`), proxied by the gateway under `/api/v1/chats/*`. Most RPCs
additionally require **participant membership** in the chat; `super_admin`
bypasses the membership check.

| RPC                                                                           | Permission                           |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| `OpenChat`                                                                    | `chats.create`                       |
| `SendMessage` / `React`                                                       | `messages.create` + participant      |
| `ListMessages` / `MarkRead` / `GetChatUnreadCount` / `GetChat` / `DeleteChat` | `chats.read` + participant           |
| `ListChats` / `SearchChats`                                                   | `chats.read`                         |
| `DeleteMessage`                                                               | sender, or `chat.message.delete:any` |

Schema (`chat`): `chats` (anchored to an application), `chat_participants`
(with read watermarks), `messages` (with a full-text search vector),
`message_reactions`, `message_reads`, and `event_outbox` (the transactional
publish-after-commit outbox — see
[`packages/events`](../../packages/events/README.md)). Migrations:
`src/migrations/001`–`007` (004 installs the search-vector trigger so the DB
owns the invariant).

**NATS** — emits (publish-after-commit): `chat.created`, `chat.messageCreated`,
`chat.messageRead`, `chat.reactionAdded`, `chat.reactionRemoved`,
`chat.messageDeleted`, `chat.deleted`; participates in the
`gdpr.erasureCompleted` saga. Consumes `gdpr.erasureRequested` (durable
`gdpr-chat`).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `CHAT_PORT`
(5006), `CHAT_GRPC_PORT` (6006), `CHAT_HOST`, `CHAT_SCHEMA` (`chat`), and
`NATS_URL` have dev defaults, plus the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Pure handlers with pool + NATS injected — assert permission +
participant-membership gates, read-watermark / unread-count logic,
sender-or-admin delete authorization, and publish-after-commit ordering for
every `chat.*` event. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
