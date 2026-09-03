# API Endpoints Reference

Orientation for the gateway's REST surface. For the exhaustive, per-route contract
(request/response schemas, every path and status) the authoritative source is the OpenAPI
document, not this page.

## Where the full contract lives

The gateway generates its OpenAPI spec at runtime from each route's `schema` block
(`@fastify/swagger`, wired in `services/gateway/src/server.ts`).

- Human-browsable UI: `GET /docs`
- Machine-readable JSON: `GET /openapi.json`
- Checked-in snapshot: [`generated-openapi.json`](./generated-openapi.json) and
  [`generated-openapi.yaml`](./generated-openapi.yaml)

The live `/openapi.json` served by a running gateway is the source of truth. The two
`generated-openapi.*` files are a committed snapshot of it; regenerate them by capturing the
live spec from a running gateway, e.g. `curl -s http://localhost:4000/openapi.json > docs/backend/generated-openapi.json`.

## Base URLs

| Environment | Base URL                                                             |
| ----------- | -------------------------------------------------------------------- |
| Development | `http://localhost:4000` (the Fastify gateway; the only HTTP surface) |
| Staging     | `https://api-staging.adoptdontshop.com`                              |
| Production  | `https://api.adoptdontshop.com`                                      |

All routes are versioned under `/api/v1/`.

## Authentication

Browser apps authenticate with cookies, not a hand-managed bearer token. `apiService` in
`@adopt-dont-shop/lib.api` sends `credentials: 'include'` and attaches a CSRF token
automatically:

1. `POST /api/v1/auth/login` — establishes the session.
2. `GET /api/v1/csrf-token` — issues the double-submit `csrfToken` cookie (ADS-919).
3. State-changing requests (POST/PUT/PATCH/DELETE) must echo that value in the `x-csrf-token`
   header; the gateway rejects a mutating request that carries the cookie but not the header.
4. `GET /api/v1/auth/me` — current user profile. `POST /api/v1/auth/refresh-token` renews.

The OpenAPI document also declares a `bearerAuth` (JWT) scheme for non-browser integrators;
public routes (login, register, health) opt out with `security: []`.

## Pagination

List routes parse `page` and `limit` through a shared parser
(`services/gateway/src/middleware/pagination.ts`). Defaults are page 1, limit 20 (a route may
override). `limit` is hard-capped at `MAX_PAGE_LIMIT = 100`; a non-integer `page`/`limit` or a
`limit` above 100 returns HTTP 400 (no silent clamp). `sort`/`order` are per-route, not
universal.

## Errors

Every error response is `{ "error": string }`. The gateway maps the upstream gRPC status to an
HTTP status (`services/gateway/src/middleware/grpc-error.ts`). For 5xx and for
`PERMISSION_DENIED` / `FAILED_PRECONDITION` / `UNAUTHENTICATED`, the body carries a generic
message; other 4xx forward the upstream validation text.

| gRPC status                                    | HTTP |
| ---------------------------------------------- | ---- |
| OK                                             | 200  |
| INVALID_ARGUMENT                               | 400  |
| UNAUTHENTICATED                                | 401  |
| PERMISSION_DENIED                              | 403  |
| NOT_FOUND                                      | 404  |
| ALREADY_EXISTS / ABORTED / FAILED_PRECONDITION | 409  |
| RESOURCE_EXHAUSTED                             | 429  |
| INTERNAL                                       | 500  |
| UNIMPLEMENTED                                  | 501  |
| UNAVAILABLE                                    | 503  |
| DEADLINE_EXCEEDED                              | 504  |

## Rate limiting

One global per-IP limiter (`@fastify/rate-limit`, `global: true`), default 100 requests per
1 minute, tunable via `GATEWAY_RATE_LIMIT_MAX` / `GATEWAY_RATE_LIMIT_WINDOW`
(`services/gateway/src/config.ts`). It is Redis-backed when `REDIS_URL` is set (N-replica-safe),
in-memory otherwise. Some domains set stricter per-route caps — e.g. `CHAT_RATE_LIMITS` in
`routes/chat.ts` (open-chat 10/min, send-message 60/min, react 30/min) — and the auth surface
adds a per-email limiter (~5/min/email, login 5/5min) on top of the per-IP cap. There are no
`X-RateLimit-*` headers; an exceeded limit returns HTTP 429.

## WebSocket events

Socket.IO is mounted at `/socket.io`. The gateway fans NATS domain events out to connected
sockets (`services/gateway/src/ws/`). Server-emitted events:

| Event                    | Payload                                     |
| ------------------------ | ------------------------------------------- |
| `chat:message:created`   | `{ messageId, chatId, senderUserId, body }` |
| `chat:message:read`      | `{ chatId, userId, upToMessageId }`         |
| `chat:reaction:added`    | `{ messageId, chatId, userId, emoji }`      |
| `chat:reaction:removed`  | `{ messageId, chatId, userId, emoji }`      |
| `notification:created`   | `{ notificationId, type, channel }`         |
| `notification:dismissed` | `{ notificationId }`                        |

There is no server-side typing indicator.

## Health

`GET /health/simple` returns `{ status, service, environment }`. There is no `/health/ready`.
