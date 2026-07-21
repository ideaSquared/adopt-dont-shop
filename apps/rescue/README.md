# @adopt-dont-shop/app.rescue

## Purpose

The rescue organization portal — where rescue staff manage their pet
listings, review and progress adoption applications, coordinate foster
placements, and chat with adopters.

## Location in the architecture

Full product spec: [docs/frontend/app-rescue-prd.md](../../docs/frontend/app-rescue-prd.md).
Shares the app-shell pattern (routing, state, styling) described in
[docs/frontend/technical-architecture.md](../../docs/frontend/technical-architecture.md)
with `app.admin` and `app.client`. Built on React 19 + TypeScript (strict),
Vite, and vanilla-extract styling (`*.css.ts`). Talks to the backend
exclusively through `service.gateway` (port 4000) — see the root
[README Access table](../../README.md#access) for local URLs.

From the repo root:

```bash
# Full stack (recommended) — rescue app is exposed at http://localhost:3002
pnpm docker:dev

# All React apps only (no backend, Docker, or DB)
pnpm dev:apps

# Just this app via Turbo
pnpm exec turbo dev --filter=@adopt-dont-shop/app.rescue
```

Or from this directory: `pnpm dev` — Vite serves on http://localhost:3000
(container internal port; Docker maps it to 3002 externally). The root
`docker-compose.yml` wires this app up automatically — no per-app commands
needed.

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc && vite build`
- `pnpm preview` — preview the production build
- `pnpm test` — Vitest (run mode)
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Vitest with coverage
- `pnpm lint` / `lint:fix` — ESLint
- `pnpm type-check` — TypeScript type check

## Public surface

Route tree lives under `src/pages/` (pet management, applications, foster,
chat, settings), with `src/contexts/` holding the Chat and Statsig providers.
See `src/App.tsx` for the router configuration.

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
