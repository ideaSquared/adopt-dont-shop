# @adopt-dont-shop/lib.{{LIB_NAME}}

{{LIB_DESCRIPTION}}

<!-- Scaffolded by `pnpm new-lib`. Fill in each section — keep the headings so
`pnpm check:readmes` (docs/templates/README.lib.md) stays green. -->

## Purpose

<!-- TODO: One paragraph — what this library does and who consumes it (which
apps or services). If it's a service-only shared package rather than a `lib.*`,
say so — see the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go). -->

## Location in the architecture

<!-- TODO: Where this fits relative to the rest of the workspace — link to the
relevant section of [`docs/README.md`](../../docs/README.md#libraries) rather
than re-explaining the monorepo layout here. -->

## Scripts

```bash
pnpm dev          # build --watch (or vite build --watch for React libs)
pnpm build        # production build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in `src/index.ts`. Consumers add the dependency and
import from the package root:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.{{LIB_NAME}}": "workspace:*"
  }
}
```

```typescript
import { {{SERVICE_NAME}}, {{LIB_NAME}}Service } from '@adopt-dont-shop/lib.{{LIB_NAME}}';
```

<!-- TODO: Summarise the grouped public surface (types, hooks, services) rather
than duplicating every export's signature here.

Convention: type-only exports (`*Schema` / `*Props` / `*Config` and other
`z.infer` types) are not enumerated — `src/index.ts` is authoritative for them.
Runtime values (services, singletons, hooks, components, constants) must all be
listed. -->


## Environment variables consumed

<!-- TODO: Table of any env vars this library reads directly. Most `lib.*`
packages take config via constructor args instead — say so if that's the case
here. -->

## Testing notes

<!-- TODO: Anything specific to this library's tests — how it's mocked by
consumers, fixtures, known edge cases. -->

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
