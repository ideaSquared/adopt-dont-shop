# Microservices extraction history

How each domain service was carved out of the original monolith, one section
per service. This is descriptive background for maintainers — the phase numbers
are historical and no longer track any live work. For the current contract of a
service (schema, RPCs, events) read that service's own `README.md`; for the
shared boundary model read
[`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../infrastructure/MICROSERVICES-STANDARDS.md).

Extractions landed roughly in this order:

| Phase | Service       |
| ----- | ------------- |
| 1     | notifications |
| 2     | auth          |
| 3     | pets          |
| 4     | rescue        |
| 5     | applications  |
| 6     | chat          |
| 8     | moderation    |
| 10    | audit         |

## notifications

Notifications was the Phase 1 extraction (the first stateful one): boot
skeleton (1.1), the `notifications.*` schema (1.2), the gRPC
`NotificationService` with the pure-handler-plus-thin-adapter pattern (1.3), the
NATS fan-out subscribers (1.4), the gateway WebSocket termination + Redis
pub/sub between replicas (1.5), and the monolith cutover (1.6).

## auth

Auth was the Phase 2 extraction, landed incrementally:

- **Phase 2.1** — boot skeleton: Fastify `/health/simple` on `AUTH_PORT`,
  OpenTelemetry via `@adopt-dont-shop/observability`, `config.ts` hard-requiring
  `DATABASE_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET`.
- **Phase 2.2** — `auth.*` schema + migrations (`001`–`007` ported the
  users/roles/permissions/tokens tables verbatim; intra-schema FKs preserved).
- **Phase 2.3a–c** — proto + grpc-js stubs, pure handlers for all RPCs
  (`(deps, principal, request) → response` with injected `passwordHasher` /
  `tokenIssuer`), then the gRPC server boot + adapter (`adapt` / `adaptUnauth`,
  bcrypt hasher, JWT issuer — access 15m / refresh 30d on separate secrets).
- **Phase 2.4** — downstream NATS flow: `services/notifications` subscribes to
  `auth.userLoggedIn` (ACCOUNT_SECURITY) and `auth.roleAssigned`
  (STAFF_ASSIGNMENT).
- **Phase 2.5** — the gateway authenticate middleware (lives in
  `services/gateway`): strips spoofable `x-user-*` headers and calls
  `ValidateToken`, re-stamping the validated principal.
- **Phase 2.6** — gateway `/api/auth/*` cutover to gRPC; the monolith's
  endpoints became dead code.

## pets

Pets was the Phase 3 extraction: boot skeleton (3.1), the `pets.*` schema with
PostGIS + full-text search (3.2), the proto stubs + pure status-machine +
handlers (3.3), and the downstream NATS flow — the `pets.statusChanged` /
`pets.deleted` subscribers in `services/notifications` (3.4). Gateway routes
(3.5) and the monolith cutover (3.6) followed.

## rescue

Rescue was the Phase 4 extraction: boot skeleton (4.1), the `rescue.*` schema
(4.2), the proto stubs + pure verification status-machine + handlers (4.3), and
the downstream NATS flow — the `rescue.verified` / `rescue.rejected` /
`rescue.staffInvited` subscribers in `services/notifications` (4.4). Gateway
routes (4.5) and the monolith cutover (4.6) followed.

## applications

Applications was the Phase 5 extraction (the deepest), landed incrementally: a
boot skeleton (5.1), the pure event-sourced domain — `apply`/`fold` reducer +
per-command invariant checks with the same function running at command time and
hydration time so replay equals live write (5.2) — then the proto stubs, gRPC
handlers wrapping the domain with DB writes + NATS publishes, and the gateway
routes (5.3+).

## chat

Chat was the Phase 6 extraction: boot skeleton (6.1), the `chat.*` schema with
its search-vector trigger (6.2), the gRPC `ChatService` (6.3), the `chat.*` NATS
publishers feeding the gateway's Phase 1.5 WS subscriber (6.4), gateway routes
(6.5), and the monolith cutover (6.6).

## moderation

Moderation was the Phase 8 extraction: boot skeleton (8.1), the `moderation.*`
schema with its status-propagation trigger (8.2), the gRPC `ModerationService`
(8.3), the `chat.messageCreated` / `pets.created` / `applications.submitted`
auto-scan subscribers (8.4), gateway routes (8.5), and the monolith cutover
(8.6).

## audit

Audit was the Phase 10 extraction — it replaced the monolith's audit-log service

- audit middleware. Landed as a boot skeleton (10.1), the `audit.*` schema with
  the immutability trigger (10.2), the read-only gRPC query service with keyset
  cursors (10.3), the `*.actionTaken` NATS subscribers across all services (10.4),
  the gateway routes (10.5), and the monolith cutover (10.6).
