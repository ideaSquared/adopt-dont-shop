# @adopt-dont-shop/app.client

## Purpose

The public adoption portal — where adopters browse pets, submit adoption
applications, and chat with rescues. The unauthenticated entry point to the
platform.

## Location in the architecture

Full product spec: [docs/frontend/app-client-prd.md](../../docs/frontend/app-client-prd.md).
Shares the app-shell pattern (routing, state, styling) described in
[docs/frontend/app-shell.md](../../docs/frontend/app-shell.md)
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

Plus `preview`, `test:watch`, `test:coverage`, `test:ui`, `format`,
`format:check`, and `clean` — see `package.json`.

## Public surface

Route tree lives in `src/App.tsx` (pet browse/detail, application flow,
favorites, account). Discovery and chat pages live under
`src/components/discovery/` and `src/components/chat/`.

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
| `VITE_ANON_SWIPE_LIMIT`   | no       | — (anonymous swipe cap)              |

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
