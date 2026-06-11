# service.gateway

BFF / API gateway for the microservices migration.

## What this service is for

Phase 0f stands the gateway up as a **strangler-fig start**: a Fastify
pass-through proxy in front of the residual `service.backend`. Every
`/api/*` request goes through here and gets forwarded to the monolith
unchanged. Adding routes for extracted services (Phase 1+) is a
per-PR Fastify plugin registration — `first-registered-wins` semantics
mean a new service's prefix gets picked off before the catch-all
proxy sees it.

The end-state, once Phase 11 deletes the residual monolith:

```
  /api/auth/*         → service.auth         (Phase 2)
  /api/applications/* → service.applications (Phase 5)
  /api/chat/*         → service.chat         (Phase 6)
  /api/pets/*         → service.pets         (Phase 3)
  …
```

For now it's just:

```
  /api/*              → service.backend (residual)
  /health/simple      → owned by the gateway itself
```

## What's deliberately NOT here yet

- **WebSocket proxying.** Future `service.notifications` (Phase 1)
  owns the WS spine. Forwarding sockets through `@fastify/http-proxy`
  would couple the gateway to the monolith's socket lifecycle right
  when we want the opposite.
- **Auth gate (`ability.can(...)`).** Lands with `service.auth` in
  Phase 2 — uses `@adopt-dont-shop/authz` against the principal
  metadata the auth service supplies.
- **gRPC translation.** No service speaks gRPC yet; the gateway's
  REST → gRPC layer arrives when the first gRPC-speaking service
  ships.
- **Per-request access logs.** Disabled Fastify's built-in pino so it
  doesn't double-log on top of OpenTelemetry's HTTP auto-instrumentation.
  Per-route logging via `onResponse` hooks arrives with real routes.

## Configuration

| Env var                | Default                          | Purpose                                    |
| ---------------------- | -------------------------------- | ------------------------------------------ |
| `GATEWAY_PORT`         | `4000`                           | Port the gateway binds.                    |
| `GATEWAY_HOST`         | `0.0.0.0`                        | Bind interface.                            |
| `UPSTREAM_BACKEND_URL` | `http://service-backend:5000`    | URL of the residual monolith.              |
| `NODE_ENV`             | `development`                    | Surfaces in `/health/simple` + log lines.  |

Plus all the standard observability env vars consumed by
`@adopt-dont-shop/observability`: `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_SERVICE_NAME`, `SENTRY_DSN`, `LOG_LEVEL`, `LOKI_URL` — see
that package's README.

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

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
npm run dev

# Production build
npm run build
npm run start
```

## Routing model

`@fastify/http-proxy` mounts a catch-all under the `/api` prefix that
forwards to `UPSTREAM_BACKEND_URL`. The prefix is preserved on the way
through (`rewritePrefix: '/api'`) so the upstream sees the same path
the client sent.

When extracting a service, register its plugin BEFORE the catch-all in
`createServer` so Fastify resolves the more specific prefix first.
Concretely, in Phase 2 the order will be:

```ts
server.register(authRoutes, { prefix: '/api/auth' });   // new service
server.register(httpProxy, { prefix: '/api', upstream }); // residual
```

The auth plugin handles `/api/auth/*`; everything else falls through
to the monolith.

## What this brings to the table for Phase 1

- A stable place for `service.notifications` to terminate WebSockets
  (gateway holds the socket; NATS fans events to it from the service).
- A single edge for the future auth gate to live (gateway runs the
  `ability.can` check; downstream services re-check via gRPC metadata
  as defence-in-depth, matching the CAD pattern).
- A natural strangler-fig boundary — extracting any service is "add a
  route plugin to the gateway, delete the route from the monolith."
