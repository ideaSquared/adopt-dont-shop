# @adopt-dont-shop/app.client

Public adoption portal for pet adopters.

See the full product spec: [docs/frontend/app-client-prd.md](../docs/frontend/app-client-prd.md).

## Quick Start

From the repo root:

```bash
# Full stack (recommended) — client is exposed at http://localhost:3000
npm run docker:dev

# All React apps only (no backend, Docker, or DB)
npm run dev:apps

# Just this app via Turbo
npx turbo dev --filter=@adopt-dont-shop/app.client
```

Or from this directory: `npm run dev` — Vite serves on http://localhost:3000.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build`
- `npm test` — Vitest (run mode)
- `npm run lint` / `lint:fix` — ESLint
- `npm run type-check` — TypeScript type check
