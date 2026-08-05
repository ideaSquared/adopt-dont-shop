# @adopt-dont-shop/{{APP_NAME}}

<!-- Scaffolded by `pnpm new-app`. Fill in each section — keep the headings so
`pnpm check:readmes` (docs/templates/README.app.md) stays green. -->

## Purpose

<!-- TODO: One paragraph — who uses this app and what it's for. -->

## Location in the architecture

<!-- TODO: Which gateway routes this app depends on, and how it reaches the
backend (nginx in prod, the Vite dev proxy locally). Link to
[`docs/frontend/technical-architecture.md`](../../docs/frontend/technical-architecture.md)
for the shared app-shell pattern instead of repeating it here. -->

## Scripts

```bash
pnpm dev          # Vite dev server
pnpm build        # tsc && vite build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public surface

<!-- TODO: Apps don't export a package API — list the routes / pages this app
owns (or link to its router config) so a reader knows what's here. -->

## Environment variables consumed

<!-- TODO: Table of the `VITE_*` vars this app reads, with defaults and whether
they're required. Link to [`docs/env-reference.md`](../../docs/env-reference.md)
for vars shared across apps rather than duplicating them. -->

## Testing notes

<!-- TODO: Anything specific to this app's tests — MSW handlers, fixtures,
known-flaky areas. -->

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/apps/`.
