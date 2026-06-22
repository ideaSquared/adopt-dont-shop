---
name: backend-test
description: >
  Patterns for writing tests in the backend services (services/gateway
  and services/<name>). Apply when adding or modifying any gRPC handler
  test, gateway route test, or pure unit test. Covers Vitest setup,
  mock patterns, behaviour-focused assertions, and TDD.
---

# Backend Testing Patterns

Every backend service in `services/*` uses **Vitest** (not Jest) with
the config in `services/<name>/vitest.config.ts`. Tests favour
behaviour over implementation.

## Test layout

Tests are **colocated** with the source file they cover — no
`__tests__/` directory and no per-layer split. The vitest config
picks up `**/*.test.ts` automatically.

```
services/gateway/src/
  routes/things.ts
  routes/things.test.ts          # Fastify route → mocked gRPC client

services/things/src/grpc/
  thing-handlers.ts
  thing-handlers.test.ts         # gRPC handler → stubbed pool/audit
  adapter.ts
  adapter.test.ts                # pure mapping helpers
```

Run all tests for a service:

```bash
pnpm exec turbo test --filter=@adopt-dont-shop/service.things
```

Run a single file (fast feedback loop):

```bash
cd services/things && pnpm test handlers
# Vitest takes a substring filter, no need to spell the full path.
```

## TDD loop (per CLAUDE.md)

1. **Red** — write a failing test describing the desired behaviour
2. **Green** — minimum code to pass
3. **Refactor** — clean up with tests green

State the success criteria before you start:
> "createThing returns the new thing id and writes one audit row with action=CREATE"

## What to test

**Test behaviour through public APIs only.** Internals must be
invisible.

| Good | Bad |
|------|-----|
| "Suspending a user blocks future logins" | "calls userRepo.update with status=suspended" |
| "POST /things 201s and returns the new id" | "Controller calls ThingService.create" |
| "Rejecting an application emits a notification" | "spy was called with NotificationType.REJECTED" |

A test that breaks every time you refactor is testing implementation,
not behaviour.

## Vitest imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

Use `vi.fn()`, `vi.mock()`, `vi.spyOn()`. **Never** `jest.*` — this
project does not use Jest.

## gRPC handler test pattern

Stub the pool, principal, and any cross-service clients in `deps`.
Assert on the SQL the handler ran and the response shape it produced.

```typescript
import { describe, it, expect, vi } from 'vitest';

import { createThing } from './thing-handlers.js';
import type { HandlerDeps } from './handlers.js';

const makeDeps = (overrides: Partial<HandlerDeps> = {}): HandlerDeps => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) } as never,
  audit: { log: vi.fn().mockResolvedValue(undefined) } as never,
  ...overrides,
});

describe('createThing', () => {
  it('inserts the row + writes an audit log', async () => {
    const deps = makeDeps();
    const res = await createThing(
      deps,
      { userId: 'u-1', roles: [] },
      { name: 'Buddy', description: '' },
    );

    expect(res.thing.name).toBe('Buddy');
    expect(deps.pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO things.things'),
      expect.any(Array),
    );
    expect(deps.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'Thing' }),
    );
  });

  it('rejects unauthenticated callers', async () => {
    await expect(
      createThing(makeDeps(), null, { name: 'X', description: '' }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
```

## Gateway route test pattern

Use Fastify's `app.inject({ ... })` against a stubbed gRPC client —
no live HTTP server, no supertest. Read an existing
`services/gateway/src/routes/*.test.ts` for the canonical setup
(building a `FastifyInstance`, registering the route, stubbing the
client, calling `inject`).

```typescript
import Fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';

import { registerThingsRoutes } from './things.js';

const makeApp = (clientOverrides: Partial<ThingsClient> = {}) => {
  const app = Fastify({ logger: false });
  const client = {
    createThing: vi.fn().mockResolvedValue({
      thing: { thingId: 't-1', name: 'Buddy', description: '' },
    }),
    ...clientOverrides,
  } as never;
  registerThingsRoutes(app, { client });
  return { app, client };
};

it('POST /api/v1/things returns 201 + the created thing', async () => {
  const { app } = makeApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/things',
    payload: { name: 'Buddy' },
  });
  expect(res.statusCode).toBe(201);
  expect(res.json()).toMatchObject({ success: true, data: { name: 'Buddy' } });
});
```

## Database in tests

There is no in-memory test database. The pattern is to stub the
`pool.query` call with `vi.fn()` and assert on the SQL string + the
returned shape. If you need true round-trip behaviour, set up a
disposable Postgres in the test (`pg-mem` is sometimes appropriate
for migration tests) — but most handler tests don't need it.

## Auditing assertions

Don't assert on the contents of audit calls by mocking
`AuditLogService.log` in production code paths and snapshotting the
args — that tests implementation. Instead, assert the action +
entity + entityId fields you actually care about:

```typescript
expect(deps.audit.log).toHaveBeenCalledWith(
  expect.objectContaining({ action: 'CREATE', entity: 'Thing', entityId: 't-1' }),
);
```

## Error path coverage

Each `throw HandlerError(...)` in a handler is a branch. Cover it:

```typescript
it('rejects unknown pets', async () => {
  const deps = makeDeps({
    pool: { query: vi.fn().mockRejectedValue({ code: '23503' }) } as never,
  });
  await expect(
    addFavorite(deps, { userId: 'u-1' } as never, { petId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
```

## What to skip

- Don't snapshot test JSON responses — they break on every field add.
  Assert on specific fields.
- Don't test that the logger was called. Logger output is
  operational, not behaviour.
- Don't test the internals of `@adopt-dont-shop/db` or proto-generated
  types. They're external dependencies for the purposes of your test.

## TypeScript rules (apply to tests too)

- No `any` — use `unknown` or `vi.MockedFunction<typeof fn>`. The
  `as never` casts in the patterns above are deliberate ergonomics
  for fully-typed third-party shapes; prefer `Partial<…>` overrides
  when you can.
- No `as` assertions without a comment explaining why
- No `@ts-ignore`/`@ts-expect-error` — fix the type
- Tests are first-class TypeScript code

## Common mistakes

- `jest.fn()` instead of `vi.fn()` — wrong test framework
- Reaching for `supertest` or `express` — the gateway is Fastify;
  `app.inject(...)` is the equivalent in this codebase
- Reaching for Sequelize models / `sequelize.sync({ force: true })` —
  no ORM. Stub `pool.query` instead
- Asserting on internal call counts of helpers (`buildMetadata`,
  `handleGrpcError`) — they're implementation details
- Skipping `beforeEach(() => vi.clearAllMocks())` when sharing mocks
  across tests — call-count assertions leak between cases
