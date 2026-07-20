# service.gateway

The single REST + WebSocket edge in front of the ten domain gRPC services.

## Responsibility

Authenticates every request (validates `Authorization: Bearer` via
`service.auth.ValidateToken` and stamps server-derived `x-user-*` metadata,
stripping any spoofed inbound headers), fans REST routes out to the right
service over gRPC, terminates the Socket.IO connection and broadcasts NATS
events to clients, enforces global rate limiting, and wraps each downstream
client in a circuit breaker. A handful of small surfaces are served
in-process (legal markdown, `/config`, analytics, dashboard composition,
uploads, GDPR erasure kickoff). **No schema** — the gateway owns no Postgres
tables.

## Downstream gRPC clients

`auth`, `notifications`, `pets`, `rescue`, `applications`, `chat`,
`moderation`, `matching`, `audit`, `cms` — one client per service, addressed
at `service-<name>:<grpcPort>` (`*_GRPC_URL` env vars, see Configuration
below).

## Route groups (`/api/v1/*`)

`auth`, `sessions`, `field-permissions`, `users` → auth; `notifications`,
`devices`, `email`, `broadcast` → notifications; `pets` → pets; `rescue`,
`rescues` (public), `staff`/`foster`/`invitations` → rescue; `applications`,
`application-documents` → applications; `chats` → chat; `moderation`,
`admin/moderation`, `support` → moderation; `matching` → matching; `audit`,
`reports` → audit; `cms` → cms. Gateway-folded (in-process): `legal`,
`config`, `analytics`, `dashboard`, `uploads`, and
`users/me/erasure-request` (GDPR). **There is no catch-all monolith proxy**
— unowned `/api/*` paths return 404.

## gRPC RPCs

None — the gateway is a gRPC **client**, not a server. It exposes the
REST/WS surface above plus the health + `/metrics` endpoints.

## NATS subjects

**Emits:** `gdpr.erasureRequested` (from
`POST /api/v1/users/me/erasure-request`, kicking off the erasure saga).

**Consumes (for WebSocket fan-out):** `notifications.created`,
`notifications.dismissed`, `chat.messageCreated`, `chat.messageRead`,
`chat.reactionAdded`, `chat.reactionRemoved`. It also ensures the
`DOMAIN_EVENTS` JetStream stream exists at boot.

## Configuration

| Env var                       | Default                        | Purpose                                                                        |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `GATEWAY_PORT`                | `4000`                         | Port the gateway binds.                                                        |
| `GATEWAY_HOST`                | `0.0.0.0`                      | Bind interface.                                                                |
| `NODE_ENV`                    | `development`                  | Surfaces in `/health/simple` + log lines.                                      |
| `NOTIFICATIONS_GRPC_URL`      | `service-notifications:6001`   | Downstream gRPC address for `service.notifications`.                           |
| `AUTH_GRPC_URL`               | `service-auth:6002`            | Downstream gRPC address for `service.auth`.                                    |
| `PETS_GRPC_URL`               | `service-pets:6003`            | Downstream gRPC address for `service.pets`.                                    |
| `RESCUE_GRPC_URL`             | `service-rescue:6004`          | Downstream gRPC address for `service.rescue`.                                  |
| `APPLICATIONS_GRPC_URL`       | `service-applications:6005`    | Downstream gRPC address for `service.applications`.                            |
| `CHAT_GRPC_URL`               | `service-chat:6006`            | Downstream gRPC address for `service.chat`.                                    |
| `MODERATION_GRPC_URL`         | `service-moderation:6007`      | Downstream gRPC address for `service.moderation`.                              |
| `MATCHING_GRPC_URL`           | `service-matching:6008`        | Downstream gRPC address for `service.matching`.                                |
| `AUDIT_GRPC_URL`              | `service-audit:6009`           | Downstream gRPC address for `service.audit`.                                   |
| `CMS_GRPC_URL`                | `service-cms:6010`             | Downstream gRPC address for `service.cms`.                                     |

Plus all the standard observability env vars consumed by
`@adopt-dont-shop/observability`: `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `SENTRY_DSN`, `LOG_LEVEL`, `LOKI_URL` — see that
package's README.

### gRPC resilience tunables

All gateway gRPC clients wrap calls in a shared resilience layer
(`src/grpc-clients/resilience.ts`) that provides per-attempt retries
and per-service circuit breakers.

| Env var                    | Default    | Purpose                                                                                              |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `GRPC_RETRY_COUNT`         | `2`        | Maximum number of retries per call (idempotent RPCs only). Total attempts = 1 + GRPC_RETRY_COUNT.   |
| `GRPC_CIRCUIT_FAILURES`    | `5`        | Number of failures within the window before the circuit opens.                                       |
| `GRPC_CIRCUIT_WINDOW_MS`   | `30000`    | Sliding window (ms) over which failures are counted.                                                 |
| `GRPC_CIRCUIT_COOLDOWN_MS` | `10000`    | How long (ms) the circuit stays open before entering half-open and allowing one probe through.       |

**Retry behaviour:**

- Only *idempotent* RPCs are retried (reads: `Get*`, `List*`, `ValidateToken`, `GetMe`, `Search*`,
  stats endpoints, etc.). Writes (`Login`, `Create*`, `Update*`, `Delete*`, state-transition RPCs)
  are **never** retried.
- Retryable gRPC status codes: `UNAVAILABLE` (14) and `DEADLINE_EXCEEDED` (4).
- Each retry receives a fresh deadline (no cumulative deadline from the first attempt).
- Backoff: exponential with full jitter, base 50 ms, capped at 1 s.

**Circuit breaker:**

- One breaker per downstream service (auth, pets, applications, chat, cms, matching, moderation,
  notifications, rescue, audit).
- States: **closed** (normal) → **open** (fast-fail, rejects immediately with `UNAVAILABLE`) →
  **half-open** (one probe attempt after cooldown) → **closed** on probe success, back to **open**
  on probe failure.
- While open, calls are rejected with a gRPC `UNAVAILABLE` error; the existing `GRPC_TO_HTTP`
  mapping converts this to HTTP 503.

**Prometheus metric:**

`grpc_circuit_state{service}` — Gauge exported on `/metrics`.
Values: `0` = closed, `1` = half-open, `2` = open.

## Rate limiting (ADS-805)

Rate limiting is applied at the gateway edge for every route using `@fastify/rate-limit`.

### Redis dependency

A shared Redis store is used so per-replica limits are not multiplied by the number of running instances (5 req/min does not become 5×N with N replicas). The gateway connects to Redis on boot using the `REDIS_URL` / `REDIS_URL_FILE` env var.

| Env var                    | Default      | Purpose                                                              |
| -------------------------- | ------------ | -------------------------------------------------------------------- |
| `REDIS_URL`                | _(unset)_    | Redis connection string for the shared rate-limit store.             |
| `REDIS_URL_FILE`           | _(unset)_    | Path to a Docker-secret file containing the Redis URL (alternative). |
| `GATEWAY_RATE_LIMIT_MAX`   | `100`        | Global max requests per IP per window.                               |
| `GATEWAY_RATE_LIMIT_WINDOW`| `1 minute`   | Time window for the global limit (any `@lukeed/ms` format).          |

Per-route overrides (e.g. `max: 10` on `POST /api/v1/auth/login`) are declared in the route file via `config.rateLimit` and take precedence over the global cap while inheriting the same Redis store.

### Degraded mode (Redis unreachable)

If Redis is unreachable at boot time or fails at runtime, the gateway falls back to an in-memory store automatically (via `skipOnError: true` on the plugin). A `warn`-level log line is emitted so monitoring can detect the degraded state:

```
rate-limit Redis unreachable at boot — using in-memory store
rate-limit Redis error — falling back to in-memory store
```

In degraded mode the limit reverts to per-replica behaviour. The gateway never crashes or fails requests because Redis is unavailable.

### Prometheus metric

`gateway_rate_limit_hits_total{route}` — Counter exported on `/metrics`, incremented on every 429 response. The `route` label is the Fastify route template (e.g. `/api/v1/auth/login`).

## Metrics (beyond the shared substrate)

- `gateway_rate_limit_hits_total{route}` — counter, incremented on every 429
  (`src/server.ts`).
- `grpc_circuit_state{service}` — gauge, `0`=closed / `1`=half-open / `2`=open,
  one per downstream service (`src/grpc-clients/resilience.ts`).

Both feed the alerts in
[`infra/prometheus/rules/gateway-resilience.yml`](../../infra/prometheus/rules/gateway-resilience.yml).

## Dependencies

`@adopt-dont-shop/{config-secrets, events, observability, proto,
service-bootstrap, storage}` plus the generated clients for all ten services.
No own database.

## Testing strategy

Vitest. Route handlers are tested against stubbed gRPC clients (the REST→gRPC
translation + response adaptation), the authenticate middleware against a
stub `ValidateToken`, the rate-limit + circuit-breaker behaviour directly,
and the WS subscribers against a fake NATS — asserting header-stripping,
401/404 paths, and event→socket fan-out without a live transport.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
pnpm dev

# Production build
pnpm build
pnpm start
```
