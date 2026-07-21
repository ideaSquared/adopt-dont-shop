# @adopt-dont-shop/app.client

## Purpose

The public adoption portal — where adopters browse pets, submit adoption
applications, and chat with rescues. The unauthenticated entry point to the
platform.

## Location in the architecture

Full product spec: [docs/frontend/app-client-prd.md](../../docs/frontend/app-client-prd.md).
Shares the app-shell pattern (routing, state, styling) described in
[docs/frontend/technical-architecture.md](../../docs/frontend/technical-architecture.md)
with `app.admin` and `app.rescue`. Talks to the backend exclusively through
`service.gateway` (port 4000) — see the root
[README Access table](../../README.md#access) for local URLs.

From the repo root:

```bash
# Full stack (recommended) — client is exposed at http://localhost:3000
pnpm docker:dev

# All React apps only (no backend, Docker, or DB)
pnpm dev:apps

# Just this app via Turbo
pnpm exec turbo dev --filter=@adopt-dont-shop/app.client
```

Or from this directory: `pnpm dev` — Vite serves on http://localhost:3000.

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc && vite build`
- `pnpm test` — Vitest (run mode)
- `pnpm lint` / `lint:fix` — ESLint
- `pnpm type-check` — TypeScript type check

## Public surface

Route tree lives under `src/pages/` (pet browse/detail, application flow,
chat, account). See `src/App.tsx` for the router configuration.

## Environment variables consumed

Shares the common frontend vars (`VITE_API_BASE_URL`, `VITE_WS_BASE_URL`)
documented in [docs/env-reference.md](../../docs/env-reference.md) — this
app defines no vars of its own beyond those.

## Testing notes

Vitest + React Testing Library, jsdom environment (repo-wide convention —
see [CONTRIBUTING.md](../../CONTRIBUTING.md#test-dom-environment)). Tests
are co-located next to source (`Component.tsx` + `Component.test.tsx`).

## Ownership

See [.github/CODEOWNERS](../../.github/CODEOWNERS) for the current owner
of `/apps/`.
