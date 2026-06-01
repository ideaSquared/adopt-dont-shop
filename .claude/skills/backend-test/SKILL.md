---
name: backend-test
description: >
  Patterns for writing tests in service.backend. Apply when adding or modifying any
  service, controller, route, or middleware test. Covers Vitest setup, mock patterns,
  behaviour-focused assertions, and TDD.
---

# Backend Testing Patterns

The backend uses **Vitest** (not Jest) with the setup in
`service.backend/src/setup-tests.ts`. Tests favour behaviour over implementation.

## Test layout

```
service.backend/src/__tests__/
  services/<name>.service.test.ts        # Most logic lives here
  controllers/<name>.controller.test.ts  # Sparingly — HTTP shape only
  routes/<name>.routes.test.ts           # Integration via supertest
  middleware/<name>.test.ts              # For new middleware
  integration/                           # Cross-layer scenarios
  models/                                # Validation/hooks only — not CRUD
```

Run all backend tests:
```bash
cd service.backend && npm test
```

Run a single file (fast feedback loop):
```bash
cd service.backend && npm test -- src/__tests__/services/thing.service.test.ts
```

## TDD loop (per CLAUDE.md)

1. **Red** — write a failing test describing the desired behaviour
2. **Green** — minimum code to pass
3. **Refactor** — clean up with tests green

State the success criteria before you start:
> "Create returns the new Thing and writes one audit row with action=CREATE"

## What to test

**Test behaviour through public APIs only.** Internals must be invisible.

| Good | Bad |
|------|-----|
| "Suspending a user blocks future logins" | "calls userRepo.update with status=suspended" |
| "POST /things 201s and returns the new id" | "Controller calls ThingService.create" |
| "Rejecting an application emits a notification" | "spy was called with NotificationType.REJECTED" |

A test that breaks every time you refactor is testing implementation, not behaviour.

## Vitest imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

Use `vi.fn()`, `vi.mock()`, `vi.spyOn()`. **Never** `jest.*` — this project does not
use Jest.

## Mock setup pattern (services)

`setup-tests.ts` already mocks the logger, encryption keys, and JWT/CSRF secrets.
Mock anything external your service touches:

```typescript
import { vi } from 'vitest';

// External services — mock at the top of the file before importing the SUT.
vi.mock('../../services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue('email-id-1'),
    queueEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

// Socket emits — capture without a live IO server.
vi.mock('../../socket/socket-registry', () => ({
  emitToUser: vi.fn(),
  emitToRescue: vi.fn(),
}));

import { ThingService } from '../../services/thing.service';
import { NotificationService } from '../../services/notification.service';

describe('ThingService — Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a thing and notifies the owner', async () => {
    const thing = await ThingService.create({ name: 'Buddy' }, 'user-1');

    expect(thing.thingId).toBeDefined();
    expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
  });
});
```

## Database in tests

Tests run against a real in-memory SQLite (configured in `setup-tests.ts`), so model
behaviour is tested accurately. You don't mock Sequelize models — you let them write
to the in-memory DB and assert the resulting state.

If a test needs a clean DB, truncate inside `beforeEach`:

```typescript
beforeEach(async () => {
  await Thing.destroy({ where: {}, truncate: true });
});
```

Avoid `sequelize.sync({ force: true })` per-test — slow and unnecessary.

## Controller tests

Use `supertest` for route/controller integration. Spin up an Express app with just the
router under test rather than booting the whole `index.ts`:

```typescript
import express from 'express';
import request from 'supertest';
import thingRoutes from '../../routes/thing.routes';

const app = express();
app.use(express.json());
app.use('/api/v1/things', thingRoutes);

it('rejects unauthenticated requests', async () => {
  const res = await request(app).post('/api/v1/things').send({ name: 'X' });
  expect(res.status).toBe(401);
});
```

## Auditing assertions

Don't assert on `AuditLogService.log` call args by mocking it — that tests
implementation. Instead, query the `audit_logs` table after the operation:

```typescript
import { AuditLog } from '../../models/AuditLog';

it('records an audit row on create', async () => {
  await ThingService.create({ name: 'Buddy' }, 'user-1');

  const rows = await AuditLog.findAll({ where: { entity: 'Thing' } });
  expect(rows).toHaveLength(1);
  expect(rows[0].action).toBe('CREATE');
});
```

## Error path coverage

Each `throw` in a service is a branch. Cover it:

```typescript
it('throws NotFoundError when the thing is missing', async () => {
  await expect(ThingService.getById('missing-id')).rejects.toThrow('Thing not found');
});
```

Test the error TYPE, not the message string, when downstream code branches on it:

```typescript
import { NotFoundError } from '../../middleware/error-handler';

await expect(ThingService.getById('x')).rejects.toBeInstanceOf(NotFoundError);
```

## What to skip

- Don't snapshot test JSON responses — they break on every field add. Assert on specific fields.
- Don't test that the logger was called. Logger output is operational, not behaviour.
- Don't test Sequelize internals (e.g. `findByPk` was called). Test the OBSERVABLE result.

## Coverage

CLAUDE.md targets 100% coverage but ONLY of meaningful business behaviour. Don't
add tests to lift coverage on lines that don't matter. If a line can't be reached by
realistic input, the line is dead code — delete it instead.

## TypeScript rules (apply to tests too)

- No `any` — use `unknown` or `vi.MockedFunction<typeof fn>`
- No `as` assertions without a comment explaining why
- No `@ts-ignore`/`@ts-expect-error` — fix the type
- Tests are first-class TypeScript code

## Common mistakes

- `jest.fn()` instead of `vi.fn()` — wrong test framework
- Mocking `AuditLogService` to assert log calls — test the resulting audit row instead
- Snapshotting full responses — brittle, doesn't describe behaviour
- Testing private methods via casting — refactor so the behaviour is visible publicly
- `sequelize.sync({ force: true })` in every test — slow; truncate the tables you touch
- Asserting against the mocked logger — operational signal, not behaviour
- Skipping the `beforeEach(() => vi.clearAllMocks())` reset — call-count assertions
  leak across tests
