<!--
Template for apps/<name>/README.md (ADS-946).

Copy this file to apps/<name>/README.md and fill in every section — keep
the section order and headings so `pnpm check:readmes` can find them.
Delete this comment block once filled in.
-->

# @adopt-dont-shop/app.<name>

## Purpose

One paragraph: who uses this app and what it's for. E.g. "The public
adoption portal — where adopters browse pets, submit applications, and chat
with rescues."

## Location in the architecture

- Full product spec: link to the relevant `docs/frontend/app-*-prd.md`.
- How it talks to the backend: which gateway routes / apps it depends on,
  whether it goes through nginx or the Vite dev proxy locally.
- Link to [`docs/frontend/technical-architecture.md`](../../docs/frontend/technical-architecture.md)
  for the shared app-shell pattern (routing, state, styling) instead of
  repeating it here.

## Scripts

```bash
pnpm dev          # Vite dev server
pnpm build        # tsc && vite build
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

Note any scripts unique to this app beyond the standard set above.

## Public surface

Apps don't export a package API — list the routes / pages this app owns
instead (or link to a router config file) so a reader knows what's here
without cloning the routing tree by hand.

## Environment variables consumed

Table of the env vars this app's `import.meta.env` / `VITE_*` reads, with
defaults and whether they're required. Link to
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list
rather than duplicating vars shared across apps.

## Testing notes

Anything specific to this app's tests: MSW handlers used, fixtures,
known-flaky areas. Link to [`docs/frontend/testing.md`](../../docs/testing.md)
or the equivalent for anything not app-specific.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner
of `/apps/`.
