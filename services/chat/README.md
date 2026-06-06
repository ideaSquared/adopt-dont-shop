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
- Run via `npm run db:migrate` (uses `@adopt-dont-shop/db` —
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
npm run dev

# Production build
npm run build
npm run start
```
