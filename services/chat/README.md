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
scanning. No outbound cross-service gRPC calls (it reads participants from its
own schema). Depends on the shared backend packages `@adopt-dont-shop/{authz,
config-secrets, db, events, lib.types, observability, proto,
service-bootstrap}`.

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

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `ChatService`
(`packages/proto`), proxied by the gateway under `/api/v1/chats/*`. Most RPCs
additionally require **participant membership** in the chat; `super_admin`
bypasses the membership check.

| RPC | Permission |
| --- | --- |
| `OpenChat` | `chat.create` |
| `SendMessage` / `React` | `chat.send` + participant |
| `ListMessages` / `MarkRead` / `GetChatUnreadCount` / `GetChat` / `DeleteChat` | `chat.read` + participant |
| `ListChats` / `SearchChats` | `chat.read` |
| `DeleteMessage` | sender, or `chat.message.delete:any` |

Schema (`chat`): `chats` (anchored to an application), `chat_participants`
(with read watermarks), `messages` (with a full-text search vector),
`message_reactions`, `message_reads`. Migrations: `src/migrations/001`–`006`
(004 installs the search-vector trigger, replacing the monolith's afterSync
hook so the DB owns the invariant).

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
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Chat was the Phase 6 extraction: boot skeleton (6.1), the `chat.*` schema with
its search-vector trigger (6.2), the gRPC `ChatService` (6.3), the `chat.*` NATS
publishers feeding the gateway's Phase 1.5 WS subscriber (6.4), gateway routes
(6.5), and the monolith cutover (6.6, bundled into Phase 11).
