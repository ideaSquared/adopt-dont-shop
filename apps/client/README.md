# @adopt-dont-shop/app.client

Public adoption portal for pet adopters.

See the full product spec: [docs/frontend/app-client-prd.md](../../docs/frontend/app-client-prd.md).

## Quick Start

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
