# @adopt-dont-shop/app.rescue

## Purpose

The rescue organization portal — where rescue staff manage their pet
listings, review and progress adoption applications, coordinate foster
placements, and chat with adopters.

## Location in the architecture

Full product spec: [docs/frontend/app-rescue-prd.md](../../docs/frontend/app-rescue-prd.md).
Shares the app-shell pattern (routing, state, styling) described in
[docs/frontend/app-shell.md](../../docs/frontend/app-shell.md)
with `app.admin` and `app.client`; the rescue app's own contexts and routes are
in [docs/frontend/rescue-architecture.md](../../docs/frontend/rescue-architecture.md).
Built on React 19 + TypeScript (strict),
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

Plus `test:ui`, `format`, `format:check`, and `clean` — see `package.json`.

## Public surface

Route tree lives in `src/App.tsx`; page components are flat files under
`src/pages/` (Dashboard, PetManagement, Applications, StaffManagement,
RescueSettings, Communication, Events, FosterCoordination, Analytics, Reports,
ReportBuilderPage, ReportViewPage). `src/contexts/` holds the Chat and Statsig
providers. See [rescue-architecture.md](../../docs/frontend/rescue-architecture.md)
for the full route list.

## Environment variables consumed

All `VITE_*`, read via `import.meta.env`. See
[docs/env-reference.md](../../docs/env-reference.md) for descriptions.

| Variable                  | Required | Default                              |
| ------------------------- | -------- | ------------------------------------ |
| `VITE_API_BASE_URL`       | yes      | `''` in Docker (uses the Vite proxy) |
| `VITE_WS_BASE_URL`        | yes      | —                                    |
| `VITE_STATSIG_CLIENT_KEY` | no       | unset → flags default off            |
| `VITE_SENTRY_DSN`         | no       | unset → Sentry no-ops                |
| `VITE_APP_RELEASE`        | no       | set by CI                            |
| `VITE_ROUTER_BASENAME`    | no       | `/`                                  |

## Testing notes

Vitest + React Testing Library, jsdom environment (repo-wide convention —
see [CONTRIBUTING.md](../../CONTRIBUTING.md#test-dom-environment)). Tests
are co-located next to source (`Component.tsx` + `Component.test.tsx`). MSW
handlers live at `src/test-utils/msw-handlers.ts`. See
[docs/frontend/testing.md](../../docs/frontend/testing.md) for the shared
render helpers, MSW wiring, and coverage floors.

## Ownership

See [.github/CODEOWNERS](../../.github/CODEOWNERS) for the current owner
of `/apps/`.
