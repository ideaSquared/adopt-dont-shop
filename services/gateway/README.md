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
