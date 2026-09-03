# @adopt-dont-shop/app.admin

## Purpose

Administration interface for platform management — rescue verification,
user/role management, content moderation, and platform-wide reporting.

## Location in the architecture

Full product spec: [docs/frontend/app-admin-prd.md](../../docs/frontend/app-admin-prd.md).
Shares the app-shell pattern (routing, state, styling) described in
[docs/frontend/app-shell.md](../../docs/frontend/app-shell.md)
with `app.client` and `app.rescue`. Talks to the backend exclusively through
`service.gateway` (port 4000) — see the root
[README Access table](../../README.md#access) for local URLs.

From the repo root:

```bash
# Full stack (recommended) — admin is exposed at http://localhost:3001
pnpm docker:dev

# All React apps only (no backend, Docker, or DB)
pnpm dev:apps

# Just this app via Turbo
pnpm exec turbo dev --filter=@adopt-dont-shop/app.admin
```

Or from this directory: `pnpm dev` — Vite serves on http://localhost:3000 (container internal port; Docker maps it to 3001 externally).

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc && vite build`
- `pnpm test` — Vitest (run mode)
- `pnpm lint` / `lint:fix` — ESLint
- `pnpm type-check` — TypeScript type check

Plus `preview`, `test:watch`, `test:coverage`, `test:ui`, `format`,
`format:check`, and `clean` — see `package.json`.

## Public surface

Route tree lives in `src/App.tsx`; page components are flat files under
`src/pages/` (Users, Rescues, Pets, Applications, Moderation, Support,
Messages, Inbox, Analytics, Reports, Configuration, FieldPermissions,
ContentManagement, PrivacyTools, Audit, SecurityCenter, AccountSettings).

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
are co-located next to source (`Component.tsx` + `Component.test.tsx`). The
admin `renderWithProviders` helper accepts an `initialRoute` option. See
[docs/frontend/testing.md](../../docs/frontend/testing.md) for the shared
render helpers, MSW handlers, and coverage floors.

## Ownership

See [.github/CODEOWNERS](../../.github/CODEOWNERS) for the current owner
of `/apps/`.
