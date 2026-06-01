---
name: error-handling
description: >
  Backend error class hierarchy and how errors propagate through routes. Apply when
  throwing errors from services, writing controllers, or implementing middleware
  that needs to signal HTTP status codes.
---

# Backend Error Handling

The backend has a single error-handler middleware (`src/middleware/error-handler.ts`)
that translates thrown errors into HTTP responses. Services and controllers throw —
they never write status codes themselves.

## The error class hierarchy

```
Error
└── ApiError(statusCode, message)
    ├── BadRequestError       400
    ├── UnauthorizedError     401
    ├── ForbiddenError        403
    ├── NotFoundError         404
    ├── ConflictError         409
    └── UnprocessableError    422
```

All defined in `src/middleware/error-handler.ts`. Import from there:

```typescript
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnprocessableError,
} from '../middleware/error-handler';
```

## When to use each

| Class | Status | Meaning |
|-------|--------|---------|
| `BadRequestError` | 400 | Request is malformed in a way the client can fix (other than schema validation — Zod handles 422 for that) |
| `UnauthorizedError` | 401 | Caller is not authenticated. Usually emitted by auth middleware, rarely by services |
| `ForbiddenError` | 403 | Caller is authenticated but not allowed (RBAC denial, ownership mismatch) |
| `NotFoundError` | 404 | Resource doesn't exist or is hidden from this caller |
| `ConflictError` | 409 | Operation conflicts with current state (duplicate key, already-approved application) |
| `UnprocessableError` | 422 | Well-formed request, semantically invalid (failed business rule). Also the status the Zod validator emits for schema failures |

When in doubt: 404 for "missing", 403 for "forbidden", 409 for "already exists", 422
for "rule violated", 400 for "garbled input".

## Pattern: throw from the service

```typescript
import { NotFoundError, ConflictError } from '../middleware/error-handler';

export class PetService {
  static async getById(petId: string): Promise<Pet> {
    const pet = await Pet.findByPk(petId);
    if (!pet) {
      throw new NotFoundError('Pet not found');
    }
    return pet;
  }

  static async create(payload: CreatePetRequest): Promise<Pet> {
    const existing = await Pet.findOne({ where: { microchipId: payload.microchipId } });
    if (existing) {
      throw new ConflictError('A pet with this microchip is already registered');
    }
    return Pet.create(payload);
  }
}
```

## Pattern: no try/catch in controllers

Controllers are thin. Express forwards thrown errors to the error middleware
automatically (Express 5 catches async rejections; Express 4 needs `express-async-errors`
which is already wired here).

```typescript
// GOOD — let it propagate
static async getById(req: Request, res: Response) {
  const pet = await PetService.getById(req.params.petId);
  return res.status(200).json({ data: pet });
}

// BAD — translation belongs in middleware
static async getById(req: Request, res: Response) {
  try {
    const pet = await PetService.getById(req.params.petId);
    return res.status(200).json({ data: pet });
  } catch (err) {
    if (err.message === 'Pet not found') {
      return res.status(404).json({ error: err.message });   // ← duplicates middleware
    }
    return res.status(500).json({ error: 'Server error' });   // ← swallows the stack
  }
}
```

The only time a controller catches is to **enrich** before re-throwing:

```typescript
try {
  return await PetService.transfer(...);
} catch (err) {
  if (err instanceof ConflictError) {
    throw new ConflictError(`Transfer failed: ${err.message} (petId: ${petId})`);
  }
  throw err;
}
```

## Response shape the middleware emits

```json
{
  "status": "error",
  "message": "Pet not found",
  "code": 404
}
```

(`stack` is included when `NODE_ENV=development`.)

Frontend consumers should read `message` and `code`. The api-fetch skill describes
how `apiService` surfaces these.

## Sequelize errors

The error handler unwraps a few common Sequelize errors automatically:

- `UniqueConstraintError` → 409 with the field name
- `ValidationError` → 422 with the field details
- Other `BaseError` → 500 (treat as a bug)

This means services usually don't need to translate Sequelize errors — let them
propagate. Only catch when you want to swap the message for something user-friendly.

## Auth middleware errors

`authenticateToken` throws `UnauthorizedError`. `requirePermission`,
`requireRole`, `requirePermissionOrOwnership` respond with 403 directly (they don't
throw because they need to log the denial with request context first). Don't
re-implement that pattern — call the existing middleware.

## Logging vs throwing

Always do both for serious errors — log with context, then throw:

```typescript
import { logger } from '../utils/logger';

if (!staff || staff.rescueId !== pet.rescueId) {
  logger.warn('Unauthorized pet access attempt', {
    callerUserId,
    callerRescueId: staff?.rescueId,
    petRescueId: pet.rescueId,
  });
  throw new ForbiddenError('Access denied: pet belongs to another rescue');
}
```

For audit-worthy authorisation denials, also write an audit row — see the
`audit-logging` skill.

## Tests

Assert on the error TYPE (so call sites can branch reliably), not on the message
string (messages change with copy edits):

```typescript
import { NotFoundError } from '../../middleware/error-handler';

await expect(PetService.getById('missing'))
  .rejects.toBeInstanceOf(NotFoundError);
```

## Common mistakes

- `throw new Error('Not found')` — loses the 404, middleware returns 500
- `res.status(400).json(...)` inside a service — services have no `res`. Throw instead.
- `try/catch` in a controller that returns `{ error }` — duplicates the middleware
  and breaks the consistent response shape
- Throwing `BadRequestError` for schema validation failures — Zod's `validateBody`
  already emits 422. Use `BadRequestError` for semantic-but-not-schema problems
- Throwing `ForbiddenError` from a service when you meant `UnauthorizedError` —
  401 = "who are you?", 403 = "I know you, you can't do this"
- Swallowing errors with `catch { /* ignore */ }` — every catch should either
  re-throw, throw a new typed error, or do meaningful recovery
