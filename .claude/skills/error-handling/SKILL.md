---
name: error-handling
description: >
  How backend errors are raised and mapped to HTTP status. Apply when throwing from a
  gRPC handler, or when working on the gateway's gRPC→HTTP error middleware. Covers
  HandlerError, the HandlerErrorCode union, and the gRPC→HTTP status table.
---

# Backend Error Handling

There is no Express, no error-handler middleware class hierarchy, and no
`res.status()`. The backend is a Fastify gateway in front of ten gRPC services.
Errors flow:

```
gRPC handler  throws HandlerError('NOT_FOUND', …)
  → per-service adapter (packages/service-bootstrap/src/adapter.ts)
       maps HandlerErrorCode → grpc status via CODE_TO_GRPC, sends as a ServiceError
    → gateway route calls handleGrpcError(err, reply)
         (services/gateway/src/middleware/grpc-error.ts) maps grpc status → HTTP
```

Handlers throw a typed code; the transport does the rest. A handler never sets an
HTTP status and never touches a `reply`.

## HandlerError

`HandlerError` and its code union live in
[`packages/service-bootstrap/src/adapter.ts`](../../../packages/service-bootstrap/src/adapter.ts).
Import from the package, not a relative middleware path:

```ts
import { HandlerError } from '@adopt-dont-shop/service-bootstrap';

throw new HandlerError('NOT_FOUND', 'pet not found');
```

`HandlerErrorCode` is a closed union — these eight, nothing else:

| Code                  | gRPC status           | Gateway HTTP | Use for                                                                                          |
| --------------------- | --------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `INVALID_ARGUMENT`    | `INVALID_ARGUMENT`    | 400          | Malformed / failed input validation. Message forwarded to caller.                                |
| `UNAUTHENTICATED`     | `UNAUTHENTICATED`     | 401          | No / invalid principal. Message replaced with `unauthenticated`.                                 |
| `PERMISSION_DENIED`   | `PERMISSION_DENIED`   | 403          | Authenticated but not allowed. Message replaced with `forbidden`.                                |
| `NOT_FOUND`           | `NOT_FOUND`           | 404          | Missing, or hidden from this caller. Message forwarded.                                          |
| `ALREADY_EXISTS`      | `ALREADY_EXISTS`      | 409          | Duplicate / uniqueness conflict. Message forwarded.                                              |
| `FAILED_PRECONDITION` | `FAILED_PRECONDITION` | 409          | Valid request, wrong state (e.g. already approved). Message replaced with `precondition failed`. |
| `UNAVAILABLE`         | `UNAVAILABLE`         | 503          | Downstream dependency down.                                                                      |
| `INTERNAL`            | `INTERNAL`            | 500          | Bug / unexpected. Message replaced with `internal_error`.                                        |

The gateway forwards the upstream message verbatim only for `INVALID_ARGUMENT`,
`NOT_FOUND`, and `ALREADY_EXISTS` (caller-facing validation/business text). For
`PERMISSION_DENIED` / `FAILED_PRECONDITION` / `UNAUTHENTICATED` it sends a
generic string (the real message may leak internal identifiers), and for any 5xx
it sends a fixed `internal_error` / `service_unavailable` etc. — see
`GENERIC_4XX_MESSAGE` / `GENERIC_5XX_MESSAGE` in `grpc-error.ts`. So put
caller-safe detail only in the three forwarded codes.

The gateway table (`GRPC_TO_HTTP`) also maps codes the resilience layer raises
that handlers do not throw directly: `ABORTED` → 409 (concurrent-write
conflict), `RESOURCE_EXHAUSTED` → 429 (rate limit), `DEADLINE_EXCEEDED` → 504
(retry exhausted), `UNIMPLEMENTED` → 501.

## Pattern: throw from the handler

Guard clauses, one throw per failure. No try/catch for control flow.

```ts
export async function getContent(deps: HandlerDeps, principal: Principal, req: GetContentRequest) {
  if (!requirePermission(principal, CMS_CONTENT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CMS_CONTENT_READ}' required`);
  }
  const { rows } = await deps.pool.query<ContentRow>(
    `SELECT ... FROM cms.cms_content WHERE content_id = $1`,
    [req.contentId]
  );
  if (!rows[0]) throw new HandlerError('NOT_FOUND', 'content not found');
  return rowToProto(rows[0]);
}
```

See [`services/cms/src/grpc/handlers.ts`](../../../services/cms/src/grpc/handlers.ts)
for a full service's worth of examples.

Rules:

- `requirePermission` returns a boolean — the handler throws on `false`. Never
  re-decode the JWT; the gateway already stamped the `Principal`.
- Prefer `NOT_FOUND` over `PERMISSION_DENIED` when revealing existence would leak
  information (a resource the caller may not see should read as absent).
- Never `throw new Error(...)` — an untyped error is caught by the adapter and
  mapped to `INTERNAL` (500), losing the intended status.

## Tests

Assert on the code, through the public handler, not on the message string:

```ts
await expect(getContent(deps, principal, { contentId: 'missing' })).rejects.toMatchObject({
  code: 'NOT_FOUND',
});
```

At the gateway, assert the HTTP status the route returns for a stubbed client
error (the `backend-test` skill covers the stub-client pattern).

## Common mistakes

- Importing error classes from a `middleware/error-handler` path — that file does
  not exist. Use `HandlerError` from `@adopt-dont-shop/service-bootstrap`.
- Reaching for `BadRequestError` / `ForbiddenError` / `ConflictError` — those
  classes do not exist; they are `HandlerError('INVALID_ARGUMENT' | 'PERMISSION_DENIED' | 'ALREADY_EXISTS', …)`.
- Setting an HTTP status or writing a `reply` inside a handler — handlers return a
  response object or throw; the gateway owns HTTP.
- Putting sensitive detail in a `PERMISSION_DENIED` / 5xx message expecting the
  caller to see it — the gateway replaces those with generic text.
- Swallowing an error with `catch { /* ignore */ }` — re-throw, throw a typed
  `HandlerError`, or do real recovery.

Canonical doc: [`services/gateway/src/middleware/grpc-error.ts`](../../../services/gateway/src/middleware/grpc-error.ts).
