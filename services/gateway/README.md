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
service-bootstrap, storage, lib.av-scan}` (`lib.av-scan`'s `scanBytes()` runs on
the uploads chokepoint) plus the generated clients for all ten services.

## Scripts

```bash
pnpm dev          # tsx watch — starts the REST/WS + gRPC-client edge
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-gateway`, published on `127.0.0.1:4000` — the only HTTP surface:

```bash
pnpm docker:dev:detach                      # start the whole stack
docker compose logs -f service-gateway      # follow just the edge
curl localhost:4000/health/simple           # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.gateway","environment":"development"}
```

Bare-metal (the edge alone). It owns no schema, so it needs no `DATABASE_URL`;
instead it needs the ten `*_GRPC_URL` targets and `REDIS_URL` for the shared
rate-limit store (falls back to in-memory with a `warn` if Redis is
unreachable):

```bash
NATS_URL=nats://localhost:4222 REDIS_URL=redis://localhost:6380 \
AUTH_GRPC_URL=localhost:6002 PETS_GRPC_URL=localhost:6003 …other *_GRPC_URL \
pnpm --filter @adopt-dont-shop/service.gateway dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

The gateway exposes a REST + WebSocket surface (not a gRPC server) plus health
and `/metrics`. Route groups under `/api/v1/*`: `auth` / `sessions` /
`field-permissions` / `users` / `privacy` → auth; `notifications` / `devices` /
`email` / `broadcast` → notifications; `pets` → pets; `rescue` / `rescues` /
`staff` / `foster` / `invitations` / `events` → rescue; `applications` /
`application-documents` / `profile` → applications; `chats` / `conversations` /
`messages` → chat; `moderation` / `admin/moderation` / `support` → moderation;
`matching` / `match` / `discovery` / `search` → matching; `audit` / `reports` →
audit; `cms` → cms. Gateway-folded (in-process): `legal`, `config`,
`analytics`, `dashboard`, `uploads`, `csrf-token`, and
`users/me/erasure-request`. There is **no** catch-all monolith proxy — unowned
`/api/*` paths return 404. The `/api/v1/*` prefix and the versioning policy are
documented in [`docs/api-versioning.md`](../../docs/api-versioning.md).

`/api/v1/test/*` is a test-only one-time-token peek seam (ADS-871) that is
**not registered** unless `E2E_TOKEN_PEEK=true`; `loadConfig()` throws at boot
if that is set under `NODE_ENV=production`. See
[`src/routes/test-token-peek.ts`](src/routes/test-token-peek.ts).

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
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
