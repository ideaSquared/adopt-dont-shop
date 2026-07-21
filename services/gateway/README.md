# service.gateway

## Purpose

The single REST + WebSocket edge in front of the ten domain gRPC services.
Authenticates every request (validates `Authorization: Bearer` via
`service.auth.ValidateToken` and stamps server-derived `x-user-*` metadata,
stripping any spoofed inbound headers), fans REST routes out to the right
service over gRPC, terminates the Socket.IO connection and broadcasts NATS
events to clients, enforces global rate limiting, and wraps each downstream
client in a circuit breaker. A handful of small surfaces are served in-process
(legal markdown, `/config`, analytics, dashboard composition, uploads, GDPR
erasure kickoff). **Owns no Postgres schema.**

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. The gateway is a gRPC
**client** to all ten services (`auth`, `notifications`, `pets`, `rescue`,
`applications`, `chat`, `moderation`, `matching`, `audit`, `cms`), each
addressed at `service-<name>:<grpcPort>` via `*_GRPC_URL`. All clients wrap
calls in a shared resilience layer (`src/grpc-clients/resilience.ts`):
per-attempt retries (idempotent RPCs only — reads retried on `UNAVAILABLE` /
`DEADLINE_EXCEEDED` with exponential + jittered backoff; writes never) and a
per-service circuit breaker (closed → open → half-open), exported as
`grpc_circuit_state{service}`. Depends on the shared backend packages
`@adopt-dont-shop/{config-secrets, events, observability, proto,
service-bootstrap, storage}` plus the generated clients for all ten services.

## Scripts

```bash
pnpm dev          # tsx watch — starts the REST/WS + gRPC-client edge
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## REST / gRPC contract

The gateway exposes a REST + WebSocket surface (not a gRPC server) plus health
and `/metrics`. Route groups under `/api/v1/*`: `auth` / `sessions` /
`field-permissions` / `users` → auth; `notifications` / `devices` / `email` /
`broadcast` → notifications; `pets` → pets; `rescue` / `rescues` / `staff` /
`foster` / `invitations` → rescue; `applications` / `application-documents` →
applications; `chats` → chat; `moderation` / `admin/moderation` / `support` →
moderation; `matching` → matching; `audit` / `reports` → audit; `cms` → cms.
Gateway-folded (in-process): `legal`, `config`, `analytics`, `dashboard`,
`uploads`, and `users/me/erasure-request`. There is **no** catch-all monolith
proxy — unowned `/api/*` paths return 404.

**Socket.IO** terminates here; see [`src/ws/`](src/ws) for the handshake auth,
origin allowlist, per-user connection cap, and pre-auth handshake rate limit.

**NATS** — emits `gdpr.erasureRequested` (from `POST
/api/v1/users/me/erasure-request`). Consumes `notifications.created`,
`notifications.dismissed`, `chat.messageCreated`, `chat.messageRead`,
`chat.reactionAdded`, `chat.reactionRemoved` for WebSocket fan-out; ensures the
`DOMAIN_EVENTS` JetStream stream exists at boot.

**Metrics** (beyond the shared substrate): `gateway_rate_limit_hits_total{route}`
(429 counter), `grpc_circuit_state{service}` (breaker gauge), and
`gateway_ws_handshake_ratelimit_rejects_total`. These feed the alerts in
[`infra/prometheus/rules/gateway-resilience.yml`](../../infra/prometheus/rules/gateway-resilience.yml).

## Environment variables consumed

`GATEWAY_PORT` (4000) and `GATEWAY_HOST` bind the edge; the ten `*_GRPC_URL`
vars address the downstream services (defaults `service-<name>:600N`). Rate
limiting reads `REDIS_URL` / `REDIS_URL_FILE` (a shared store so per-replica
limits aren't multiplied; falls back to in-memory with a `warn` log if Redis is
unreachable), `GATEWAY_RATE_LIMIT_MAX` (100), and `GATEWAY_RATE_LIMIT_WINDOW`
(`1 minute`). Resilience tunables: `GRPC_RETRY_COUNT` (2),
`GRPC_CIRCUIT_FAILURES` (5), `GRPC_CIRCUIT_WINDOW_MS` (30000),
`GRPC_CIRCUIT_COOLDOWN_MS` (10000). Plus `CORS_ORIGIN`, the uploads/storage vars
(`AWS_*`, `CLOUDFRONT_DOMAIN`, `MAX_FILE_SIZE`), and the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Route handlers are tested against stubbed gRPC clients (the REST→gRPC
translation + response adaptation), the authenticate middleware against a stub
`ValidateToken`, the rate-limit + circuit-breaker behaviour directly, and the
WS subscribers against a fake NATS — asserting header-stripping, 401/404 paths,
and event→socket fan-out without a live transport. Also runs Pact
consumer/provider contract tests. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
