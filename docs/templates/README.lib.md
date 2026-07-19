<!--
Template for packages/lib.<name>/README.md (ADS-946).

Copy this file to packages/lib.<name>/README.md and fill in every section —
keep the section order and headings so `pnpm check:readmes` can find them.
Also usable (with light adaptation) for the service-only `packages/<shared>`
packages (`proto`, `events`, `authz`, `db`, `storage`, `observability`, …).
Delete this comment block once filled in.
-->

# @adopt-dont-shop/lib.<name>

## Purpose

One paragraph: what this library does and who consumes it (which apps or
services). If it's a service-only shared package rather than a `lib.*`,
say so explicitly — see the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Where this fits relative to the rest of the workspace — link to the
relevant section of [`docs/README.md`](../../docs/README.md#libraries)
rather than re-explaining the monorepo layout here.

## Scripts

```bash
pnpm dev          # build --watch (or vite build --watch for React libs)
pnpm build        # production build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in `src/index.ts` — link to it and summarise the
grouped public surface (types, hooks, services) rather than duplicating
every export's signature here.

## Environment variables consumed

Table of any env vars this library reads directly (most `lib.*` packages
take config via constructor args instead — say so if that's the case here).

## Testing notes

Anything specific to this library's tests: how it's mocked by consumers,
fixtures, known edge cases. Link to
[`docs/backend/testing.md`](../../docs/backend/testing.md) or the frontend
equivalent for anything not library-specific.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner
of `/packages/`.
