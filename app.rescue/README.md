# @adopt-dont-shop/app.rescue

Rescue organization portal for the Adopt Don't Shop platform.

See the full product spec: [docs/frontend/app-rescue-prd.md](../docs/frontend/app-rescue-prd.md).

## Stack

- React 18 + TypeScript (strict)
- Vite
- Vitest + React Testing Library
- ESLint + Prettier
- Docker (multi-stage build for dev and prod)

## Quick Start

From the repo root:

```bash
# Full stack (recommended) — rescue app is exposed at http://localhost:3002
npm run docker:dev

# All React apps only (no backend, Docker, or DB)
npm run dev:apps

# Just this app via Turbo
npx turbo dev --filter=@adopt-dont-shop/app.rescue
```

Or from this directory: `npm run dev` — Vite serves on http://localhost:3000 (container internal port; Docker maps it to 3002 externally).

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build`
- `npm run preview` — preview the production build
- `npm test` — Vitest (run mode)
- `npm run test:watch` — Vitest watch mode
- `npm run test:coverage` — Vitest with coverage
- `npm run lint` / `lint:fix` — ESLint
- `npm run type-check` — TypeScript type check

## Project Structure

```
src/
├── components/     Reusable UI components
├── pages/          Route-level components
├── hooks/          Custom React hooks
├── services/       API clients and external services
├── utils/          Utility helpers
├── types/          TypeScript type definitions
├── App.tsx         Main App component
├── main.tsx        Application entry point
└── index.css       Global styles
```

## Docker

The root `docker-compose.yml` wires this app up automatically — no per-app commands needed. The app container exposes port 3000 internally and is mapped to 3002 on the host.
