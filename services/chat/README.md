# service.chat

Chat vertical — Phase 6 of the microservices migration.

Owns the `chat.*` schema (Chat, ChatParticipant, Message,
MessageReaction, MessageRead) and exposes `ChatService` over gRPC.

Classical (no event sourcing — chat messages are append-only by
nature but they're not a state machine). WS-heavy: the gateway
terminates Socket.IO and this service publishes
`chat.messageCreated` / `chat.messageRead` / `chat.reactionAdded`
on NATS for fan-out via the existing Phase 1.5 WS subscriber.

## What's shipped so far

**Phase 6.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `CHAT_PORT` (default
  5006), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.chat'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

**Phase 6.2** — `chat.*` schema + migrations:
- `001_create_chats.ts` — chats (+ assigned_to from monolith's
  migration 09 folded in; `chat_status` enum).
- `002_create_chat_participants.ts` — chat_participants with the
  `(chat_id, participant_id)` UNIQUE; `chat_participant_role` enum.
- `003_create_messages.ts` — messages with moderation columns
  (`is_flagged`, `flag_reason`, `flag_severity`, `moderation_status`,
  `flagged_at`), TSVECTOR `search_vector` + GIN index, the
  `(chat_id, created_at DESC)` paging idx, and JSONB `attachments`.
- `004_install_messages_search_vector_trigger.ts` — BEFORE
  INSERT/UPDATE trigger replacing the monolith's afterSync hook;
  DB owns the invariant.
- `005_create_message_reactions.ts` — message_reactions with
  `(message_id, user_id, emoji)` UNIQUE.
- `006_create_message_reads.ts` — message_reads with
  `(message_id, user_id)` UNIQUE.
- Run via `pnpm db:migrate` (uses `@adopt-dont-shop/db` —
  inherits all four CAD-lesson fixes).

## What's NOT here yet

- **Phase 6.3** — gRPC `ChatService`:
  - proto + grpc-js stubs in `@adopt-dont-shop/proto`
  - handler logic (send / list / mark-read / react)
  - gRPC server boot + adapter (same pattern as service.rescue)
- **Phase 6.4** — NATS publishers (`chat.messageCreated`,
  `chat.messageRead`, `chat.reactionAdded`). The gateway's existing
  Phase 1.5 WS subscriber fans these to connected Socket.IO clients.
  Moderation hook: `services/moderation` (Phase 8) consumes
  `chat.messageCreated` for content scanning.
- **Phase 6.5** — Gateway routes `/api/chat/*` here.
- **Phase 6.6** — Cutover: monolith's chat code becomes dead,
  removal bundled into Phase 11.

## Configuration

| Env var          | Default            | Required | Purpose                                                                  |
| ---------------- | ------------------ | -------- | ------------------------------------------------------------------------ |
| `CHAT_PORT`      | `5006`             |          | HTTP port for `/health/simple`.                                          |
| `CHAT_GRPC_PORT` | `6006`             |          | gRPC port `ChatService` will bind (Phase 6.3c).                          |
| `CHAT_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `CHAT_SCHEMA`    | `chat`             |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`   | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`       | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`       | `development`      |          | Surfaces in health + logs.                                               |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## Canonical reference (ADS-817)

### Responsibility

Owns application-scoped messaging between adopters and rescue staff: opening
chats, sending / reading messages, reactions, read receipts, and full-text
search. Real-time delivery is event-driven — the service publishes `chat.*`
events on NATS that the gateway's WebSocket subscriber fans out to connected
clients. Schema: `chat`.

### Schema (`chat`)

| Table | Purpose |
| --- | --- |
| `chats` | Chat rows, anchored to an application. |
| `chat_participants` | Two-party participants with read watermarks. |
| `messages` | Text messages (with a full-text search vector). |
| `message_reactions` | Emoji reactions per message. |
| `message_reads` | Read receipts (`message_id`, `user_id`, `read_at`). |

Migrations: `services/chat/src/migrations/001`–`006` (004 installs the
search-vector trigger).

### gRPC RPCs

`ChatService`. Most RPCs additionally require **participant membership** in the
chat; `super_admin` bypasses the membership check.

| RPC | Permission |
| --- | --- |
| `OpenChat` | `chat.create` |
| `SendMessage` | `chat.send` + participant |
| `ListMessages` | `chat.read` + participant |
| `ListChats` | `chat.read` |
| `MarkRead` | `chat.read` + participant |
| `React` | `chat.send` + participant |
| `SearchChats` | `chat.read` |
| `GetChatUnreadCount` | `chat.read` + participant |
| `DeleteMessage` | sender, or `chat.message.delete:any` |
| `GetChat` | `chat.read` + participant |
| `DeleteChat` | `chat.read` + participant |

### NATS subjects

**Emits** (publish-after-commit): `chat.created`, `chat.messageCreated`,
`chat.messageRead`, `chat.reactionAdded`, `chat.reactionRemoved`,
`chat.messageDeleted`, `chat.deleted`. Plus `gdpr.erasureCompleted` as a saga
participant.

**Consumes:** `gdpr.erasureRequested` (durable `gdpr-chat`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. No cross-service gRPC calls (reads participants from
its own schema).

### Testing strategy

Vitest. Pure handlers with pool + NATS injected — assert permission +
participant-membership gates, read-watermark / unread-count logic, sender-or-
admin delete authorization, and publish-after-commit ordering for every
`chat.*` event.
