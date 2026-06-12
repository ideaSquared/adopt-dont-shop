---
name: backend-endpoint
description: >
  Add a new REST endpoint to service.backend. Use when the user asks to create a new
  API route, expose a controller action, or add CRUD endpoints. Walks through routes,
  controllers, services, validation, RBAC, and audit hookup.
disable-model-invocation: true
---

# Adding a Backend REST Endpoint

The backend follows a strict layering: **Route → Controller → Service → Model**. Each
layer has one job. Skipping or merging layers fights the codebase.

| Layer | Responsibility | Lives in |
|-------|---------------|----------|
| Route | Wire middleware (auth, RBAC, validation, audit), forward to controller | `src/routes/` |
| Controller | Parse req, call service, return response. **No business logic.** | `src/controllers/` |
| Service | Business rules, DB writes, audit, transactions | `src/services/` |
| Model | Sequelize schema, associations, hooks | `src/models/` |

## Step 1 — Define the request/response schema (Zod first)

Schemas live in `lib.validation` so frontends and backend share one source of truth.

```typescript
// lib.validation/src/<feature>.ts
import { z } from 'zod';

export const CreateThingRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export type CreateThingRequest = z.infer<typeof CreateThingRequestSchema>;
```

Re-export from `lib.validation/src/index.ts`. Rebuild lib.validation
(`cd lib.validation && pnpm build`) so service.backend resolves the new export.

## Step 2 — Add validation in the controller

Use `validateBody` / `validateParams` / `validateQuery` from `middleware/zod-validate`,
**not** express-validator. (Existing routes still use express-validator; new code
should prefer Zod.)

```typescript
// src/controllers/thing.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateThingRequestSchema } from '@adopt-dont-shop/lib.validation';
import { validateBody, validateParams } from '../middleware/zod-validate';
import { BaseController } from './base.controller';
import { ThingService } from '../services/thing.service';
import { AuthenticatedRequest } from '../types';

const ThingIdParamSchema = z.object({
  thingId: z.string().uuid('Valid thing ID is required'),
});

export class ThingController extends BaseController {
  static validateCreate = [validateBody(CreateThingRequestSchema)];
  static validateById = [validateParams(ThingIdParamSchema)];

  static async create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const thing = await ThingService.create(req.body, userId);
    return res.status(201).json({ data: thing });
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    const thing = await ThingService.getById(req.params.thingId);
    return res.status(200).json({ data: thing });
  }
}
```

**Controllers must not contain business rules.** They only:
- Pull values off the request (already validated)
- Call a service method
- Choose the success status code
- Return `{ data: ... }` (or `{ data, pagination }` for lists)

Errors propagate to the error-handler middleware automatically — never write
`try/catch` in a controller just to translate to HTTP. See the `error-handling` skill.

## Step 3 — Implement the service

```typescript
// src/services/thing.service.ts
import sequelize from '../sequelize';
import Thing from '../models/Thing';
import { NotFoundError } from '../middleware/error-handler';
import { AuditLogService } from './auditLog.service';
import { CreateThingRequest } from '@adopt-dont-shop/lib.validation';

export class ThingService {
  static async create(payload: CreateThingRequest, actorUserId: string): Promise<Thing> {
    return sequelize.transaction(async t => {
      const thing = await Thing.create({ ...payload, createdBy: actorUserId }, { transaction: t });

      // Audit inside the transaction — commits atomically with the write.
      await AuditLogService.log({
        userId: actorUserId,
        action: 'CREATE',
        entity: 'Thing',
        entityId: thing.thingId,
        details: { name: thing.name },
        transaction: t,
      });

      return thing;
    });
  }

  static async getById(thingId: string): Promise<Thing> {
    const thing = await Thing.findByPk(thingId);
    if (!thing) {
      throw new NotFoundError('Thing not found');
    }
    return thing;
  }
}
```

See the `audit-logging` skill for when to use `AuditLogService.log()` inside a
transaction vs the route-level `auditRoute()` middleware. Don't combine both.

## Step 4 — Wire the route

```typescript
// src/routes/thing.routes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { fieldMask, fieldWriteGuard } from '../middleware/field-permissions';
import { ThingController } from '../controllers/thing.controller';
import { PERMISSIONS } from '../types';

const router = express.Router();

router.use(authenticateToken);

router.post('/',
  requirePermission(PERMISSIONS.THING_CREATE),
  ...ThingController.validateCreate,
  // fieldWriteGuard('things', { audit: true }),    // only if 'things' is a field-permissioned resource
  ThingController.create
);

router.get('/:thingId',
  requirePermission(PERMISSIONS.THING_READ),
  ...ThingController.validateById,
  // fieldMask('things', { audit: true, resourceIdParam: 'thingId' }),
  ThingController.getById
);

export default router;
```

**Middleware order matters** — see the `field-permissions` skill:

```
authenticateToken → requirePermission → validate* → fieldMask/fieldWriteGuard → controller
```

## Step 5 — Mount the router

In `src/index.ts` (or wherever routes are mounted):

```typescript
import thingRoutes from './routes/thing.routes';
app.use('/api/v1/things', thingRoutes);
```

## Step 6 — Write tests (TDD)

Tests come BEFORE implementation per CLAUDE.md. See the `backend-test` skill for the
mock setup and behaviour-focused patterns.

- Service tests: `src/__tests__/services/thing.service.test.ts`
- Controller tests: `src/__tests__/controllers/thing.controller.test.ts` (sparingly —
  most logic should be covered at the service layer)
- Route tests: `src/__tests__/routes/thing.routes.test.ts` (integration-style with
  supertest)

## Step 7 — Field permissions (if applicable)

If the resource is one of `users`, `rescues`, `pets`, `applications` — or you're adding
a new one — read the `field-permissions` skill. You must:

1. Add field defaults in `lib.types/src/config/field-permission-defaults.ts` (all 4 roles)
2. Apply `fieldMask()` to GET routes and `fieldWriteGuard()` to write routes
3. Add sensitive fields to `SENSITIVE_FIELD_DENYLIST`

## Step 8 — Swagger / OpenAPI

Existing routes document each endpoint with JSDoc `@swagger` blocks above the route
handler. Match that pattern so the generated docs stay complete. See
`application.routes.ts` for a comprehensive example.

## Conventions checklist

- [ ] Schema-first: Zod schema in `lib.validation`, type derived via `z.infer`
- [ ] Validation in the controller via `validateBody/Params/Query` (Zod) for new code
- [ ] Controller has no `try/catch`, no business logic — just request/response shape
- [ ] Service holds all business rules, runs DB writes in a transaction when multiple
      tables change
- [ ] Audit hookup: inside the transaction (`AuditLogService.log({ transaction: t })`)
      OR via `auditRoute()` middleware — never both
- [ ] RBAC via `requirePermission` / `requireRole` / `requirePermissionOrOwnership`
- [ ] Field permissions on routes for users/rescues/pets/applications
- [ ] Response shape: `{ data: ... }` on success, errors handled by error middleware
- [ ] Swagger JSDoc on each route
- [ ] Tests first, behaviour-focused

## Common mistakes

- Putting business logic in the controller (validation, DB queries, audit calls)
- `try/catch` in the controller that swallows the error or returns a custom shape —
  let it bubble to the error handler
- Skipping `requirePermission` because "auth is enough" — auth is identity, RBAC is
  what they can do
- Forgetting `await` on `AuditLogService.log()` inside a transaction — the audit row
  won't be in the tx
- Mixing express-validator and Zod on the same route (pick one — prefer Zod for new code)
- Forgetting to re-export the new Zod schema from `lib.validation/src/index.ts` and
  rebuild the lib
