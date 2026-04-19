---
name: new-lib
description: >
  Create a new shared library package in the monorepo. Use when the user asks to create
  a new lib, add a shared library, or scaffold a new lib.* package.
disable-model-invocation: true
---

# Create a New Shared Library

## Current libraries
!`ls -d lib.*/ 2>/dev/null | tr '\n' ' '`

## Step 1 — Run the generator

```bash
npm run new-lib
```

The script is interactive. It will prompt for:
- **Library name** — enter without the `lib.` prefix (e.g. `payments` → creates `lib.payments`)
- **Library type** — `utility` (pure functions, no HTTP) or `service` (wraps API endpoints)
- **Include lib.api integration?** — yes if the lib will call backend endpoints

Follow the prompts. The script generates the full package structure.

## Step 2 — Verify the generated structure

The script creates `lib.<name>/` containing:

```
lib.<name>/
├── package.json          # @adopt-dont-shop/lib.<name>
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
└── src/
    ├── index.ts          # Public exports
    ├── types/
    │   └── index.ts
    └── services/
        └── <name>-service.ts
```

Check the generated `package.json`:
- Name must be `@adopt-dont-shop/lib.<name>`
- Must have `"type": "module"`
- `main` points to `dist/index.js`, `types` to `dist/index.d.ts`

## Step 3 — Add the library to the root workspace

Open the root `package.json` and verify the new package appears in `workspaces`. The script
should add it automatically, but confirm:

```json
"workspaces": [
  "lib.<name>",
  ...
]
```

If missing, add it manually.

## Step 4 — Add vite.config.ts alias in consuming apps (dev only)

For each app that will use the new lib during development, add a source alias to its
`vite.config.ts` so Vite resolves the library source directly (no build step needed in dev):

```typescript
// In the libraryAliases object inside vite.config.ts
'@adopt-dont-shop/lib.<name>': resolve(__dirname, '../lib.<name>/src'),
```

This is already the pattern used by all existing libs. Do not skip this step — without it,
the app will require a full lib build before changes appear in the dev server.

## Step 5 — Install and build

```bash
# From the monorepo root
npm install
npm run build:libs
```

`build:libs` uses Turbo and builds all libraries in dependency order. Run this before
starting any app that depends on the new lib.

## Step 6 — Add the dependency to consuming packages

In the app's or other lib's `package.json`:

```json
"dependencies": {
  "@adopt-dont-shop/lib.<name>": "*"
}
```

Always use `"*"` as the version — npm workspaces resolves it to the local package.

## Step 7 — Write tests first (TDD)

Create `src/<name>-service.test.ts` before implementing anything. Tests live alongside
their implementation file — not in a separate `__tests__/` directory for libs.

Tests verify behaviour through public API only. No testing internals.

## TypeScript rules

- Strict mode is mandatory — do not add `"strict": false` to tsconfig
- No `any` types — use `unknown` if the type is genuinely unknown
- Define schemas with Zod first, then derive types: `type Foo = z.infer<typeof FooSchema>`
- Export only what consumers need — keep internals private

## Common mistakes

- Forgetting to add the vite alias → stale lib in dev server
- Using `||` instead of `??` for empty string defaults (empty string is valid config)
- Not running `npm install` after adding the workspace → unresolved module errors
- Writing tests that check implementation details rather than behaviour
