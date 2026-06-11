# @adopt-dont-shop/app.admin

Administration interface for platform management.

See the full product spec: [docs/frontend/app-admin-prd.md](../docs/frontend/app-admin-prd.md).

## Quick Start

From the repo root:

```bash
# Full stack (recommended) — admin is exposed at http://localhost:3001
npm run docker:dev

# All React apps only (no backend, Docker, or DB)
npm run dev:apps

# Just this app via Turbo
npx turbo dev --filter=@adopt-dont-shop/app.admin
```

Or from this directory: `npm run dev` — Vite serves on http://localhost:3000 (container internal port; Docker maps it to 3001 externally).

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build`
- `npm test` — Vitest (run mode)
- `npm run lint` / `lint:fix` — ESLint
- `npm run type-check` — TypeScript type check
