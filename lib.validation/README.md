# @adopt-dont-shop/lib.validation

Canonical Zod schemas for the User, Pet, Rescue, and Application domains. One source of truth for entity-shaped data, used by:

- `service.backend` request validation (replaces ad-hoc express-validator chains)
- `service.backend` Sequelize `beforeValidate` cross-checks
- frontend forms (e.g. `lib.auth` login/register/profile)

The schema definitions deliberately track the column-level validators in `service.backend/src/models/*.ts` — drift between the two is what this library exists to eliminate.

> **Status**: schemas are live for the four domains above. The `ValidationService` class in this package is still a placeholder (`exampleMethod`, `healthCheck`) and isn't relied on by anything; treat the schema exports as the supported surface.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list. Highlights:

- **User schemas** — `UserStatusSchema`, `UserTypeSchema`, plus request shapes used by `lib.auth`.
- **Pet schemas** — `PetCreateRequestSchema`, `PetUpdateRequestSchema`, `PetStatusUpdateRequestSchema`, `PetSearchFiltersSchema`, `BulkPetOperationRequestSchema`, plus enums (`PetStatusSchema`, `PetTypeSchema`, `GenderSchema`, `SizeSchema`, `AgeGroupSchema`, `EnergyLevelSchema`, `VaccinationStatusSchema`, `SpayNeuterStatusSchema`, `GoodWithSchema`).
- **Rescue schemas** — request and search shapes for the rescue domain.
- **Application schemas** — adoption application request/update shapes.
- **`ValidationService`** — placeholder class with `exampleMethod(data, options)` and `healthCheck()`. Not currently consumed; safe to ignore.

Each schema also exports its inferred TypeScript type via `z.infer<>` (e.g. `PetCreateRequest`, `PetSearchFilters`).

## Quick start

```typescript
import { PetCreateRequestSchema } from '@adopt-dont-shop/lib.validation';

const parsed = PetCreateRequestSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ errors: parsed.error.flatten() });
}
// parsed.data is fully typed (PetCreateRequest)
```

## Scripts (from `lib.validation/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # jest
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
- Schema modules: [src/schemas/](./src/schemas/)
- Backend models the schemas track: [service.backend/src/models/](../service.backend/src/models/)
