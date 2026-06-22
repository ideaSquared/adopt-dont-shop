---
name: backend-endpoint
description: >
  Add a new REST endpoint backed by a gRPC microservice. Use when the
  user asks to create a new API route, expose a domain action, or add
  CRUD endpoints. Walks through the proto contract, the gRPC handler,
  the gateway REST translation, validation, RBAC, and audit hookup.
disable-model-invocation: true
---

# Adding a Backend REST Endpoint

The backend is a Fastify gateway fronting a fleet of Node.js gRPC
microservices. Every public HTTP route lives in the gateway and
delegates to a gRPC method on a backing service. There is **no**
monolithic `service.backend` with Express controllers + Sequelize
models; if a doc / skill tells you to create files under
`src/controllers/` or `src/models/`, it describes the deleted
architecture — don't follow it.

| Layer | Responsibility | Lives in |
|-------|----------------|----------|
| Proto contract | Request / response types and the RPC signature | `packages/proto/proto/<domain>.v1.proto` |
| gRPC handler   | Business logic, DB writes, audit, transactions | `services/<name>/src/grpc/` |
| Gateway route  | REST → gRPC translation, auth/RBAC/rate limits | `services/gateway/src/routes/` |

Validation lives in `lib.validation` (Zod schemas) where the SPA and
the gateway share one source of truth.

## Step 1 — Define the proto contract

Add the request / response message + the RPC method to the owning
domain's proto.

```proto
// packages/proto/proto/things.v1.proto
service ThingsService {
  rpc CreateThing (CreateThingRequest) returns (CreateThingResponse);
  rpc GetThing (GetThingRequest) returns (GetThingResponse);
}

message CreateThingRequest {
  string name = 1;
  string description = 2;
}

message CreateThingResponse {
  Thing thing = 1;
}

message Thing {
  string thing_id = 1;
  string name = 2;
  string description = 3;
}
```

Regenerate the TypeScript clients:

```bash
pnpm exec turbo build --filter=@adopt-dont-shop/proto
```

The generated types appear under
`@adopt-dont-shop/proto`'s `<Domain>V1` namespace.

## Step 2 — Implement the gRPC handler

Handlers live next to their tests. Pattern:
`services/<name>/src/grpc/<feature>-handlers.ts` +
`<feature>-handlers.test.ts`. Read an existing handler in the same
service (e.g. `services/pets/src/grpc/favorite-handlers.ts`) for the
local conventions before writing yours.

```typescript
// services/things/src/grpc/thing-handlers.ts
import { randomUUID } from 'node:crypto';

import type { Principal } from '@adopt-dont-shop/authz';
import {
  type CreateThingRequest,
  type CreateThingResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

export async function createThing(
  deps: HandlerDeps,
  principal: Principal | null,
  req: CreateThingRequest,
): Promise<CreateThingResponse> {
  if (!principal?.userId) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  if (!req.name) {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }

  const thingId = randomUUID();
  await deps.pool.query(
    `INSERT INTO things.things (thing_id, name, description, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())`,
    [thingId, req.name, req.description ?? null, principal.userId],
  );

  // Audit (see the audit-logging skill for the full pattern).
  await deps.audit.log({
    actorUserId: principal.userId,
    action: 'CREATE',
    entity: 'Thing',
    entityId: thingId,
    details: { name: req.name },
  });

  return { thing: { thingId, name: req.name, description: req.description ?? '' } };
}
```

Key points:

- Use direct parameterised SQL via `deps.pool` (a `pg.Pool` from
  `@adopt-dont-shop/db`). There is no ORM.
- `HandlerError` carries the gRPC status code + a human message; the
  gateway translates these to HTTP status codes via
  `handleGrpcError`.
- Transactions: pull a client from the pool, `BEGIN` / `COMMIT` /
  `ROLLBACK` explicitly. Read an existing multi-write handler
  (e.g. service-rescue's invitation handlers) for the local pattern.
- Permission checks beyond authentication go in the handler — the
  authz package's `Principal` carries the resolved roles.

Register the new handler in the service's gRPC server wiring
(`services/<name>/src/grpc/server.ts`).

## Step 3 — Add the gateway REST route

Routes live in `services/gateway/src/routes/<domain>.ts`. The gateway
is Fastify; routes register on an `app: FastifyInstance` passed into
the plugin function.

```typescript
// services/gateway/src/routes/things.ts
import type { FastifyInstance } from 'fastify';

import {
  type CreateThingRequest as GrpcCreateThingRequest,
} from '@adopt-dont-shop/proto';

import type { ThingsClient } from '../grpc-clients/things-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type ThingsRoutesOptions = {
  client: ThingsClient;
};

export function registerThingsRoutes(
  app: FastifyInstance,
  opts: ThingsRoutesOptions,
): void {
  const { client } = opts;

  app.post<{ Body: { name: string; description?: string } }>(
    '/api/v1/things',
    {
      schema: {
        tags: ['things'],
        summary: 'Create a thing',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
          },
        },
      },
    },
    async (req, reply) => {
      const grpcReq: GrpcCreateThingRequest = {
        name: req.body.name,
        description: req.body.description ?? '',
      };
      try {
        const res = await client.createThing(grpcReq, buildMetadata(req));
        return reply.code(201).send({ success: true, data: res.thing });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    },
  );
}
```

Wire the plugin in `services/gateway/src/server.ts` (look for the
existing per-domain `register…Routes(app, …)` calls).

`buildMetadata(req)` forwards the request id, the verified principal
token, and the per-request locale onto the gRPC call. `handleGrpcError`
translates `HandlerError` status codes into HTTP responses
(`UNAUTHENTICATED` → 401, `PERMISSION_DENIED` → 403,
`INVALID_ARGUMENT` → 400, `NOT_FOUND` → 404, etc.).

For shared request validation across the SPA + gateway, define a Zod
schema in `lib.validation/src/schemas/<feature>.ts` and reuse it on
both ends. The gateway can call the Zod schema with `safeParse` before
forwarding to gRPC.

## Step 4 — Auth + RBAC + rate limits

The gateway exposes hooks for these:

- **Authentication**: requests carrying a valid JWT get a populated
  principal automatically (see `services/gateway/src/middleware/authenticate.ts`).
  Routes that don't need auth set `config: { public: true }` or live
  under the public route prefix.
- **Permission gates**: use the `requirePermission(...)` hook from
  `@adopt-dont-shop/authz` (read an existing route — admin routes are
  the canonical example).
- **Rate limits**: a global plugin caps every route; override
  per-route via `config: { rateLimit: { max, timeWindow } }`. The
  `email-rate-limiter.ts` route shows the pattern.

## Step 5 — Audit

See the `audit-logging` skill for the full pattern. Quick rules:

- Audit inside the gRPC handler when the action runs in a single
  transaction with the DB write.
- Audit at the gateway via the `auditRoute(...)` hook for read-only
  / no-transaction CRUD routes that have nothing meaningful to do
  inside a transaction.
- **Never** combine both — it produces duplicate audit rows and
  breaks transactional atomicity.

## Step 6 — Write tests (TDD)

Tests are colocated, no `__tests__/` directory. See the `backend-test`
skill for the Vitest + behaviour-driven patterns.

- gRPC handler tests:
  `services/<name>/src/grpc/<feature>-handlers.test.ts` — stub the
  pool with a mock `query`, assert the SQL + the response.
- Gateway route tests:
  `services/gateway/src/routes/<domain>.test.ts` — inject the route
  into a Fastify instance, stub the gRPC client, exercise the HTTP
  surface with `app.inject({ method, url, payload })`.

## Step 7 — Field permissions (if applicable)

If the resource is one of `users`, `rescues`, `pets`, `applications` —
or you're adding a new one — read the `field-permissions` skill. You
must register field defaults and apply the field-mask / field-write
hooks on the gateway route.

## Step 8 — Document the route shape

Fastify generates the OpenAPI surface from the `schema:` block on
each route — make sure `tags`, `summary`, and the body / params /
querystring schemas reflect the real shape so the generated
`generated-openapi.json` stays accurate.

## Conventions checklist

- [ ] Proto contract added + clients regenerated
- [ ] gRPC handler in `services/<name>/src/grpc/` with a colocated
      `*.test.ts`
- [ ] Gateway route in `services/gateway/src/routes/<domain>.ts`,
      registered in `server.ts`
- [ ] Authentication / permission hook applied where appropriate
- [ ] Audit hookup: inside the handler (transactional writes) OR via
      `auditRoute()` on the gateway — never both
- [ ] Field permissions wired if the resource is field-permissioned
- [ ] Fastify `schema:` block populated for OpenAPI generation
- [ ] Tests first, behaviour-focused

## Common mistakes

- Reaching for Express controllers / Sequelize models — neither exists
  in the current architecture. Read an existing handler + route
  before writing yours.
- Skipping `handleGrpcError` and writing custom catch blocks per route
  — the helper centralises the gRPC-status → HTTP-status mapping.
- Mixing audit-in-handler and audit-on-route — pick one per action.
- Forgetting to register the new route plugin in `server.ts` — the
  route never mounts and the SPA gets 404.
- Using `app.get`/`app.post` without the type param (`<{ Body … }>`)
  and then `as`-casting `req.body` — annotate the generic instead.
- Direct DB access from the gateway — the gateway owns no tables.
  Always go through a gRPC call.
