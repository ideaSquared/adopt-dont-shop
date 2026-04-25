# @adopt-dont-shop/lib.validation

Validation library scaffold. The service is currently a placeholder with `exampleMethod` / `healthCheck` and no real validation logic — form-validation schemas live in the consuming apps today.

> **Status**: scaffolded. If you're looking for form validation, use Zod schemas inside each app or `@adopt-dont-shop/lib.support-tickets/schemas` as a reference pattern. This library will fill in once it has concrete responsibilities.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.validation": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`ValidationService`** — class with placeholder `exampleMethod(data, options)` and `healthCheck()`.
- **Types** — `ValidationServiceConfig`, `ValidationServiceOptions`, plus response types (`BaseResponse`, `ErrorResponse`, `PaginatedResponse`) re-exported from `./types`.

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

- Central docs: [docs/libraries/validation.md](../docs/libraries/validation.md)
- Source of truth for exports: [src/index.ts](./src/index.ts)
