---
name: new-lib
description: >
  Create a new shared library package in the monorepo. Use when the user asks to create
  a new lib, add a shared library, or scaffold a new lib.* package.
disable-model-invocation: true
---

# Create a New Shared Library

Frontend-shared libraries live under `packages/lib.<name>` and are published as
`@adopt-dont-shop/lib.<name>`. The generator is argv-driven (not interactive).

## Current libraries

!`ls -d packages/lib.*/ 2>/dev/null | xargs -n1 basename | tr '\n' ' '`

## Step 1 — Run the generator

```bash
pnpm new-lib <library-name> [description] [--type=service|utility] [--with-api]
```

- `<library-name>` — without the `lib.` prefix (e.g. `payments` → `packages/lib.payments`). Required; running `pnpm new-lib` with no name prints usage and exits 1.
- `[description]` — optional quoted summary; defaults to a generic string.
- `--type=service` (default) — wraps API endpoints, emits `src/services/<name>-service.ts`. `--type=utility` — pure functions/components/hooks (`src/components`, `src/hooks`, `src/utils`).
- `--with-api` — adds `@adopt-dont-shop/lib.api` as a dependency and uses the `service-with-api` variant.

Examples:

```bash
pnpm new-lib chat "Real-time chat" --type=service
pnpm new-lib dev-tools "Development utilities" --type=utility
pnpm new-lib billing "Billing client" --type=service --with-api
```

## Step 2 — Verify the generated structure

A `service` lib generates `packages/lib.<name>/`:

```
packages/lib.<name>/
├── package.json          # @adopt-dont-shop/lib.<name>, "type": "module"
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc.json
├── Dockerfile
├── docker-compose.lib.yml
├── README.md             # scaffolded from the lib template — has TODOs to fill
└── src/
    ├── index.ts          # public exports
    ├── types/index.ts
    ├── services/<name>-service.ts
    ├── services/__tests__/<name>-service.test.ts
    └── test-utils/setup-tests.ts
```

Tests live in `src/services/__tests__/`, next to the code they cover. A
`utility` lib swaps `services/` and `types/` for `components/`, `hooks/`, and
`utils/` index files.

## Step 3 — Workspace registration (already covered)

The `packages/*` glob in `pnpm-workspace.yaml` already covers
`packages/lib.<name>` — the generator adds nothing, and there is **no** root
`package.json` `workspaces` key to edit. Do not add per-lib scripts or a
workspaces entry (the old generator did; it no longer applies).

## Step 4 — Add the dev alias (once, centrally)

For Vite to resolve the library's source in dev (no build step), add one entry
to `getLibraryAliases()` in the root `vite.shared.config.ts` — all three apps
read from that single map, so add it **once**, not per app:

```typescript
'@adopt-dont-shop/lib.<name>': resolve(appDir, '../../packages/lib.<name>/src'),
```

`check-workspace-consistency.mjs` fails on per-app aliases, so keep it central.

## Step 5 — Install and build

```bash
pnpm install          # unless you passed --skip-install
pnpm build:libs       # Turbo builds libs in dependency order
```

Rebuild the dev image after lockfile changes: `pnpm docker:dev:build`.

## Step 6 — Add the dependency to consumers

In each consuming app/lib `package.json`, using the `workspace:*` protocol:

```json
"dependencies": {
  "@adopt-dont-shop/lib.<name>": "workspace:*"
}
```

Import from the package root: `import { Foo } from '@adopt-dont-shop/lib.<name>'`.

## Step 7 — Write tests first (TDD)

Fill in `src/services/__tests__/<name>-service.test.ts` before implementing.
Tests verify behaviour through the public API only — no internals.

## Step 8 — Fill the README and check it

Replace the `TODO` blocks in the generated `README.md` (Purpose, Location,
Public API / exports, Environment variables, Testing notes). Enumerate every
runtime export; type-only exports are covered by `src/index.ts`. Then:

```bash
node scripts/check-readmes.mjs   # or: pnpm check:readmes
```

The scaffold ships every required heading, so this passes once the TODOs are
filled without drifting the section headings.

## TypeScript rules

- Strict mode is mandatory — never set `"strict": false`.
- No `any` — use `unknown`. Define a Zod schema first, then `z.infer` the type.
- Export only what consumers need.

## Common mistakes

- Adding a per-app vite alias instead of the single central one → consistency check fails.
- Re-adding a root `workspaces` array or per-lib scripts → not used by pnpm workspaces.
- Using `||` instead of `??` for empty-string config defaults.
- Leaving README TODOs unfilled → `check:readmes` / review friction.

Canonical doc: [`docs/libraries/README.md`](../../../docs/libraries/README.md) and [`docs/templates/README.lib.md`](../../../docs/templates/README.lib.md).
